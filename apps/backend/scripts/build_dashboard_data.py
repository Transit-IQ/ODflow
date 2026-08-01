#!/usr/bin/env python3
"""
One-time data-processing pipeline for the ODFlow static dashboard.

Reads raw GTFS + GIS files from data/ and writes pre-computed JSON into
apps/frontend/public/data/, which the frontend fetches directly at runtime.
GitHub Pages only serves static files, so all analysis has to happen here,
once, locally — re-run this script whenever the raw data in data/ changes.

Usage:
    cd apps/backend && venv/bin/python scripts/build_dashboard_data.py
"""

import json
import re
import sys
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.prepared import prep

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from services import gtfs_loader, gis_loader, municipal_loader, taltan_loader  # noqa: E402
from paths import FRONTEND_PUBLIC_DATA_DIR as OUT_DIR, REPO_ROOT as ROOT  # noqa: E402

# The Israeli MOT GTFS publishes a new route_id per timetable revision, so
# the "same" real-world line shows up as many route_long_name values that
# only differ by a trailing schedule/variant suffix, e.g.:
#   "...-תל אביב יפו-10" / "...-תל אביב יפו-20" / "...-2#"
# Stripping that suffix before deduplicating collapses those into one entry
# without merging genuinely different directions/branches (those differ
# earlier in the string, in the origin<->destination text itself).
_VARIANT_SUFFIX_RE = re.compile(r"-\d+#?$")


def _dedup_key(name: str) -> str:
    return _VARIANT_SUFFIX_RE.sub("", name or "")


def build_gtfs_index() -> dict:
    print("=== Building GTFS index from data/gtfs/ ===")
    gtfs_loader._build_index()
    idx = gtfs_loader.get_index()
    if idx is None:
        raise RuntimeError(f"GTFS index build failed: {gtfs_loader._index_error}")
    return idx


def build_gis_index() -> dict:
    print("=== Building GIS index (city border + bus speeds) ===")
    gis_loader._build_gis_index()
    data = gis_loader.get_gis_data()
    if data is None:
        raise RuntimeError(f"GIS build failed: {gis_loader._gis_error}")
    return data


def write_json(name: str, obj) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1024:.1f} KB)")


def build_speed_kpis(speeds: list, stops_data: dict | None = None) -> dict:
    """
    Derive dashboard KPIs directly from the clipped speed segments and the station
    survey — nothing here is a hardcoded/mocked number.
    """
    profile_sum = [0.0] * 7
    profile_n = [0] * 7
    for seg in speeds:
        vals = seg["speeds"]
        for d in range(5):
            for h in range(7):
                v = vals[d * 7 + h]
                if v and v > 0:
                    profile_sum[h] += v
                    profile_n[h] += 1

    speed_profile = [
        round(profile_sum[h] / profile_n[h], 1) if profile_n[h] else None
        for h in range(7)
    ]

    kpis = {
        "segment_count": len(speeds),
        # Average speed per time-of-day period (P1..P7), across all days/segments.
        "speed_profile": speed_profile,
    }

    # City-wide ridership headline. Shipped in kpis.json (fetched on page load) rather
    # than only in stops.json (fetched lazily on first toggle) so the tile has a real
    # number before anyone opens the stop layer.
    if stops_data:
        kpis["stops"] = {
            **stops_data["totals"],
            "bands": stops_data["bands"],
            "rider_types": stops_data["rider_types"],
            "source": stops_data["source"],
        }

    return kpis


def _route_sort_key(name: str):
    """Line 5 before line 289 before line 'א' — numeric where the name is numeric."""
    name = (name or "").strip()
    return (0, int(name), "") if name.isdigit() else (1, 0, name)


def build_stops(idx: dict, city_polygon, boundaries: dict) -> dict:
    """
    Survey stations inside the city, each joined to the bus lines that actually call
    there and to the neighbourhood it stands in.

    The survey publishes how many routes serve a station (``ROUTES``) but not *which*,
    so the line numbers come from GTFS, matched on the public stop code the two
    sources share. Both figures are kept: a disagreement between "the survey counted
    3" and "GTFS lists 2 today" is real information about how current each source is,
    and silently dropping one would hide it.
    """
    data = taltan_loader.load_stations(city_polygon)
    stops_df = idx["stops"]
    routes_df = idx["routes"]
    stop_routes = idx["stop_routes"]

    short_by_route = dict(zip(routes_df["route_id"], routes_df.get("route_short_name", "")))
    routes_by_code: dict[str, set] = {}
    for stop_id, code in stops_df["stop_code"].items():
        code = str(code).strip()
        if not code:
            continue
        for rid in stop_routes.get(stop_id, frozenset()):
            short = (short_by_route.get(rid) or "").strip()
            if short:
                routes_by_code.setdefault(code, set()).add(short)

    prepared = {nid: prep(shape(geom)) for nid, geom in boundaries.items()}

    matched = 0
    for station in data["stations"]:
        lines = sorted(routes_by_code.get(station["code"], ()), key=_route_sort_key)
        station["routes"] = lines
        if lines:
            matched += 1
        point = Point(station["lon"], station["lat"])
        station["neighbourhood"] = next(
            (nid for nid, poly in prepared.items() if poly.contains(point)), None
        )

    data["totals"] = taltan_loader.summarise(
        data["stations"], len(data["bands"]), len(data["rider_types"])
    )
    print(
        f"  {data['totals']['count']} stations in the city, "
        f"{data['totals']['surveyed']} with survey data, "
        f"{matched} matched to GTFS lines, "
        f"{data['totals']['boardings_day']:,.0f} boardings/day"
    )
    return data


def build_neighbourhoods(idx: dict, trips_by_route: dict, neighbourhoods_config: list, boundaries: dict, statistical_areas: list | None = None, stops_data: dict | None = None) -> dict:
    """
    For every neighbourhood, find routes with a stop inside its area and attach
    each route's best shape + stop list. Routes are deduplicated into a shared
    `routes` dict since many lines cross multiple neighbourhoods.

    Every entry comes from an official municipal polygon in
    data/municipal/neighbourhoods/, so stop matching is always a real
    point-in-polygon test (the bbox is only a pre-filter for candidate stops),
    and the bbox/centre reported to the frontend are measured off that polygon.
    """
    stops_df = idx["stops"]
    routes_df = idx["routes"]
    stop_routes = idx["stop_routes"]
    route_shape = idx["route_shape"]
    shapes = idx["shapes"]
    trip_stops = idx["trip_stops"]

    routes_out = {}
    neighbourhoods_result = []

    for n in neighbourhoods_config:
        boundary_geom = boundaries.get(n["id"])
        if not boundary_geom:
            # Can only happen if the layer changed under us between the config
            # being derived and the boundaries being built.
            raise RuntimeError(f"no official boundary for neighbourhood {n['id']}")

        # bbox and centre are measured off the official polygon: the bbox is the
        # polygon's own bounds (used as the cheap candidate-stop pre-filter, and
        # as the frontend's zoom target), the centre a guaranteed-interior point.
        poly_geom = shape(boundary_geom)
        min_lon, min_lat, max_lon, max_lat = poly_geom.bounds
        b = {"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon}
        centroid = poly_geom.representative_point()
        center = [centroid.y, centroid.x]
        candidate_stops = stops_df[
            (stops_df["stop_lat"] >= min_lat) & (stops_df["stop_lat"] <= max_lat) &
            (stops_df["stop_lon"] >= min_lon) & (stops_df["stop_lon"] <= max_lon)
        ]
        polygon = prep(poly_geom)
        inside_stop_ids = {
            sid for sid, row in candidate_stops.iterrows()
            if polygon.contains(Point(row["stop_lon"], row["stop_lat"]))
        }

        route_ids = set()
        for sid in inside_stop_ids:
            route_ids.update(stop_routes.get(sid, frozenset()))

        keep_cols = [c for c in ["route_id", "route_short_name", "agency_id", "route_long_name"] if c in routes_df.columns]
        df = routes_df[routes_df["route_id"].isin(route_ids)][keep_cols].copy()
        df["_dedup_name"] = df["route_long_name"].map(_dedup_key) if "route_long_name" in df.columns else ""
        dedup_cols = [c for c in ["route_short_name", "agency_id", "_dedup_name"] if c in df.columns]
        df = df.drop_duplicates(subset=dedup_cols).drop(columns=["_dedup_name"])
        df = df[df["route_id"].isin(route_shape)]

        n_route_ids = []
        for _, row in df.iterrows():
            rid = row["route_id"]
            if rid not in routes_out:
                shape_id = route_shape[rid]
                coords = shapes.get(shape_id, [])
                if not coords:
                    continue

                stops = []
                route_trips = trips_by_route.get(rid)
                if route_trips is not None:
                    shape_trips = route_trips[route_trips["shape_id"] == shape_id]
                    trip_id = shape_trips.iloc[0]["trip_id"] if not shape_trips.empty else None
                    for sid in trip_stops.get(trip_id, []):
                        if sid in stops_df.index:
                            srow = stops_df.loc[sid]
                            stops.append({
                                "id": sid, "name": srow.get("stop_name", ""),
                                "lat": float(srow["stop_lat"]), "lon": float(srow["stop_lon"]),
                            })

                routes_out[rid] = {
                    "route_id": rid,
                    "route_short_name": row.get("route_short_name", ""),
                    "agency_id": row.get("agency_id", ""),
                    "route_long_name": row.get("route_long_name", ""),
                    "coordinates": coords,
                    "stops": stops,
                }
            n_route_ids.append(rid)

        # Real resident counts, apportioned from the CBS statistical areas that
        # overlap this neighbourhood's polygon. Stays None where the area carries
        # no residents at all (a port, an interchange, an industrial zone), so the
        # frontend can tell "no data" from "nobody lives here".
        population = None
        if statistical_areas:
            population = municipal_loader.population_for(poly_geom, statistical_areas)

        # Ridership for the stations standing in this neighbourhood, summed from the
        # same station records the map draws — no second, separately-derived figure
        # that could disagree with the stop layer.
        transit = None
        if stops_data:
            mine = [s for s in stops_data["stations"] if s.get("neighbourhood") == n["id"]]
            if mine:
                transit = taltan_loader.summarise(
                    mine, len(stops_data["bands"]), len(stops_data["rider_types"])
                )

        neighbourhoods_result.append({
            **n, "bbox": b, "center": center, "boundary": boundary_geom,
            "population": population, "route_ids": n_route_ids, "transit": transit,
        })
        pop = f", {population['total']:,} residents" if population else ""
        ride = f", {transit['boardings_day']:,.0f} boardings/day" if transit else ""
        print(f"  {n['name']}: {len(n_route_ids)} routes{pop}{ride}")

    return {"neighbourhoods": neighbourhoods_result, "routes": routes_out}


def main():
    idx = build_gtfs_index()
    gis = build_gis_index()

    # The neighbourhood list itself is read out of the municipal layer in
    # data/municipal/neighbourhoods/ — which neighbourhoods exist, their names,
    # their codes and their boundaries all come from that one export. There is no
    # curated data/neighbourhoods.json config any more, and nothing about a
    # neighbourhood is written down in this repo by hand.
    neighbourhoods_config = municipal_loader.load_neighbourhood_config()
    if not neighbourhoods_config:
        raise SystemExit(
            "No neighbourhoods found — expected an official polygon layer at "
            f"{municipal_loader.NEIGHBOURHOODS_KML or 'data/municipal/neighbourhoods/export.kml'}"
        )
    boundaries = municipal_loader.build_boundaries(neighbourhoods_config)
    print(
        f"=== Loaded {len(neighbourhoods_config)} official municipal neighbourhoods "
        f"from {municipal_loader.NEIGHBOURHOODS_KML.relative_to(ROOT)} ==="
    )

    destinations = municipal_loader.load_destinations()
    if destinations["categories"]:
        print(
            f"=== Loaded {len(destinations['points'])} civic/service destinations "
            f"across {len(destinations['categories'])} categories ==="
        )
    else:
        print("=== No data/municipal/destinations/ — destinations layer will be empty ===")

    statistical_areas = municipal_loader.load_statistical_areas()
    if statistical_areas:
        print(f"=== Loaded {len(statistical_areas)} populated CBS statistical areas ===")
    else:
        print("=== No data/municipal/אזורים סטטיסטים/export.kml — population will be omitted ===")

    print("=== Building stop layer from the תלת״ן station survey ===")
    stops_data = build_stops(idx, shape(gis["border"]["geometry"]), boundaries)

    print("=== Indexing trips by route (for shape/stop lookups) ===")
    trips_by_route = {rid: grp for rid, grp in idx["trips"].groupby("route_id")}

    print("=== Writing static JSON for frontend ===")
    write_json("border.json", gis["border"])
    write_json("speeds.json", gis["speeds"])
    write_json("kpis.json", build_speed_kpis(gis["speeds"], stops_data))
    # Fetched lazily by the frontend the first time the destinations layer is toggled
    # on, same pattern as neighbourhood_routes.json — keeps initial page load small.
    write_json("destinations.json", destinations)
    write_json("stops.json", stops_data)
    neighbourhoods_data = build_neighbourhoods(idx, trips_by_route, neighbourhoods_config, boundaries, statistical_areas, stops_data)
    # Split into a small index (fetched eagerly for the dropdown) and a larger
    # shared routes lookup (fetched once, lazily, the first time a
    # neighbourhood is actually selected) — avoids loading several MB of
    # route shapes up front for users who never open the picker.
    write_json("neighbourhoods.json", neighbourhoods_data["neighbourhoods"])
    write_json("neighbourhood_routes.json", neighbourhoods_data["routes"])

    print("Done.")


if __name__ == "__main__":
    main()
