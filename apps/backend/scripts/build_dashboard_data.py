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


# ── The shared time axis ─────────────────────────────────────────────────────
# Only one of the two time-series sources publishes hour bounds.
#
# The תלת״ן survey writes its band into the column name — ``ON0406`` is boardings
# between 04:00 and 06:00 — so taltan_loader parses the bounds straight out of the
# data and never has them typed in. BUS_SPEED publishes none: its 35 columns are
# ``d_<day>_h_<window>`` and neither the .dbf field list nor the .lyr aliases say
# what hours a window covers.
#
# So the survey's bands ARE the axis, and the speed windows are laid onto them.
# Six of the seven windows land on a band exactly; the remaining two both fall
# inside the first band, which is why 04-06 averages a pair and every other band
# reads a single window. Nothing is apportioned: a band's boardings are the
# survey's own column, and a band's speed is the mean of the windows inside it.
#
# The layout is asserted here and re-checked against the data on every run by
# _validate_alignment — the pipeline refuses to emit an axis it cannot justify.
WINDOWS_PER_BAND = {0: 2}   # band index -> speed windows inside it; 1 unless listed


def _band_bounds(label: str) -> tuple[int, int]:
    """``'06-09'`` -> ``(6, 9)``; ``'00-04'`` -> ``(24, 28)``, the band past midnight."""
    a, b = (int(x) for x in label.split("-"))
    return (a, b + 24 if b <= a else b)


def _speed_coverage(speeds: list, n_windows: int) -> list[float]:
    """Share of city segment-days carrying a reading, per speed window."""
    have = [0] * n_windows
    total = [0] * n_windows
    for seg in speeds:
        vals = seg["speeds"]
        for d in range(len(vals) // n_windows):
            for h in range(n_windows):
                total[h] += 1
                v = vals[d * n_windows + h]
                if v and v > 0:
                    have[h] += 1
    return [100 * have[h] / total[h] if total[h] else 0.0 for h in range(n_windows)]


def _validate_alignment(periods: list[dict], coverage: list[float], bands, band_departures) -> None:
    """
    Re-derive the speed↔band alignment from the data and fail loudly if it moved.

    Two independent checks, both against figures the sources publish themselves:

    ``the night band``
        The band running past midnight must be the emptiest the survey reports.
        That is why no speed window is mapped to it: it carries ~1.7% of the city's
        departures, and no speed window is that sparse — every one of the seven is
        read on 70%+ of city segments, five of them on 95%+.

    ``the 06:00 boundary``
        Bus service steps up harder at 06:00 than anywhere else in the day (the
        city goes from ~16k departures in the 05:00 hour to ~46k in the 06:00
        hour), so segment coverage must step up hardest at whichever window
        boundary is 06:00. That single fact is what pins the two sparse windows
        inside the 04-06 band rather than anywhere else on the clock. If the jump
        stops landing there, the columns have been re-cut and every period figure
        downstream would be mislabelled.
    """
    night = [i for i, b in enumerate(bands) if _band_bounds(b)[0] >= 24]
    if len(night) != 1:
        raise SystemExit(
            f"[periods] expected exactly one past-midnight band, got {[bands[i] for i in night]}"
        )
    if periods[night[0]]["speed_indices"]:
        raise SystemExit(f"[periods] a speed window was mapped onto the night band {bands[night[0]]!r}")
    if band_departures:
        emptiest = min(range(len(bands)), key=lambda i: band_departures[i])
        if emptiest != night[0]:
            raise SystemExit(
                f"[periods] the past-midnight band {bands[night[0]]!r} is no longer the survey's "
                f"emptiest ({bands[emptiest]!r} is) — departures {band_departures}. "
                f"The speed windows may now cover the night."
            )

    steps = [coverage[i + 1] - coverage[i] for i in range(len(coverage) - 1)]
    jump = max(range(len(steps)), key=lambda i: steps[i])
    # The window that starts right after the biggest coverage jump, and the clock
    # hour the axis says it starts at.
    flat = [(p, w) for p in periods for w in p["speed_indices"]]
    flat.sort(key=lambda pw: pw[1])
    after = flat[jump + 1]
    boundary = after[0]["from"] if after[1] == after[0]["speed_indices"][0] else None
    if boundary != 6:
        raise SystemExit(
            f"[periods] the largest speed-coverage jump ({steps[jump]:+.1f} pts, between windows "
            f"{jump} and {jump + 1}) does not fall at the 06:00 band boundary, where bus service "
            f"actually steps up. Coverage per window: {[round(c, 1) for c in coverage]}. "
            f"The speed columns no longer line up with the survey bands — re-derive the mapping "
            f"before trusting any per-period figure."
        )


def build_periods(stops_data: dict, speeds: list, n_windows: int = 7) -> list[dict]:
    """
    The one time axis the whole dashboard reports on: the survey's bands, verbatim.

    Each period carries the speed windows that fall inside it — two for the first
    band, one for each other daytime band, none for the night. An empty
    ``speed_indices`` means the dashboard must report "no speed data" for that
    period rather than a zero.
    """
    bands = stops_data["bands"]
    band_departures = stops_data["totals"].get("departures_by_band")

    periods = []
    window = 0
    for i, band in enumerate(bands):
        lo, hi = _band_bounds(band)
        n = 0 if lo >= 24 else WINDOWS_PER_BAND.get(i, 1)
        periods.append({
            "label": band,
            "from": lo,
            "to": hi,
            "band_index": i,
            "speed_indices": list(range(window, window + n)),
        })
        window += n

    if window != n_windows:
        raise SystemExit(
            f"[periods] mapped {window} speed windows but BUS_SPEED publishes {n_windows}. "
            f"Bands: {bands}"
        )

    coverage = _speed_coverage(speeds, n_windows)
    _validate_alignment(periods, coverage, bands, band_departures)

    print(f"  time axis: {len(periods)} survey bands carrying {window} speed windows")
    for p in periods:
        w = p["speed_indices"]
        cov = (", ".join(f"h{i + 1} {coverage[i]:.1f}% covered" for i in w)) if w else "no speed window"
        print(f"    {p['label']}  ({p['to'] - p['from']}h)  {cov}")
    return periods


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
        # Average speed per speed window, across all days/segments. Indexed by a
        # period's `speed_index`, NOT by its position on the axis — the night band
        # is a period with no speed window, so the two lists differ in length.
        "speed_profile": speed_profile,
    }

    # The shared time axis. Published here rather than written into the frontend,
    # so the hour bounds the dashboard shows are the survey's own and can never
    # drift from the bands the boardings are reported in.
    if stops_data:
        kpis["periods"] = build_periods(stops_data, speeds)

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


def build_stops(idx: dict, city_polygon, boundaries: dict, analysis_boundaries: dict) -> dict:
    """
    Survey stations inside the city, each joined to the bus lines that actually call
    there and to the neighbourhood it stands in.

    The survey publishes how many routes serve a station (``ROUTES``) but not *which*,
    so the line numbers come from GTFS, matched on the public stop code the two
    sources share. Both figures are kept: a disagreement between "the survey counted
    3" and "GTFS lists 2 today" is real information about how current each source is,
    and silently dropping one would hide it.

    Two different neighbourhood links come out of this, because a station has two
    different relationships to a neighbourhood:

    ``neighbourhood``
        the one whose official polygon the station physically stands in, or None.
        Exactly one by construction, since the municipal polygons don't overlap.
    ``neighbourhoods``
        every neighbourhood the station *serves* — within the
        ``ANALYSIS_BUFFER_M`` catchment. Several, near a border, and that is the
        point: one station can be the useful station for both sides of a street.
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
    prepared_catchment = {nid: prep(shape(geom)) for nid, geom in analysis_boundaries.items()}

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
        station["neighbourhoods"] = [
            nid for nid, poly in prepared_catchment.items() if poly.contains(point)
        ]

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


def build_neighbourhoods(idx: dict, trips_by_route: dict, neighbourhoods_config: list, boundaries: dict, analysis_boundaries: dict, statistical_areas: list | None = None, stops_data: dict | None = None) -> dict:
    """
    For every neighbourhood, find routes with a stop inside its catchment and attach
    each route's best shape + stop list. Routes are deduplicated into a shared
    `routes` dict since many lines cross multiple neighbourhoods.

    Every entry comes from an official municipal polygon in
    data/municipal/neighbourhoods/, so stop matching is always a real
    point-in-polygon test (the bbox is only a pre-filter for candidate stops),
    and the bbox/centre reported to the frontend are measured off that polygon.

    Two polygons per neighbourhood go out to the frontend, and which one a figure
    is computed from is a deliberate choice in each case:

    ``boundary``/``bbox``
        the official municipal polygon. Drawn on the map, used as the zoom
        target, and the denominator for **population** — residents belong to the
        neighbourhood they live in, and apportioning from a buffered polygon
        would credit each neighbourhood with its neighbours' people.
    ``analysis_boundary``/``analysis_bbox``
        that polygon grown by ``ANALYSIS_BUFFER_M``. Everything about *service*
        is measured against it — which stops, which routes, which stations'
        ridership — and the frontend filters its layers by it, so the map shows
        the same catchment the numbers were computed from.
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

        catchment_geom_json = analysis_boundaries.get(n["id"])
        if not catchment_geom_json:
            raise RuntimeError(f"no analysis catchment for neighbourhood {n['id']}")

        # bbox and centre are measured off the official polygon (the frontend's
        # zoom target and label anchor); the catchment's own bounds are what
        # pre-filters candidate stops, since a stop just outside the official
        # bbox still has to be reachable by the point-in-polygon test below.
        poly_geom = shape(boundary_geom)
        min_lon, min_lat, max_lon, max_lat = poly_geom.bounds
        b = {"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon}
        centroid = poly_geom.representative_point()
        center = [centroid.y, centroid.x]

        catchment_geom = shape(catchment_geom_json)
        c_min_lon, c_min_lat, c_max_lon, c_max_lat = catchment_geom.bounds
        catchment_bbox = {
            "min_lat": c_min_lat, "max_lat": c_max_lat,
            "min_lon": c_min_lon, "max_lon": c_max_lon,
        }
        candidate_stops = stops_df[
            (stops_df["stop_lat"] >= c_min_lat) & (stops_df["stop_lat"] <= c_max_lat) &
            (stops_df["stop_lon"] >= c_min_lon) & (stops_df["stop_lon"] <= c_max_lon)
        ]
        polygon = prep(catchment_geom)
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
                                # The public stop code, which is the key the תלת״ן
                                # survey is joined on (see build_stops). Without it
                                # the frontend can only match a route's stop to a
                                # survey station by position, and the opposite
                                # direction's stop across the street is ~29 m away —
                                # close enough to be picked up, so a line clicked at
                                # one kerb would light up both directions.
                                "code": str(srow.get("stop_code", "")).strip(),
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

        # Ridership for the stations serving this neighbourhood — the catchment, not
        # the official polygon, so it matches the routes listed above and the dots the
        # map draws under the same filter. Summed from the same station records the
        # map draws, so there's no second, separately-derived figure to disagree with
        # the stop layer. A station in two catchments counts towards both: these are
        # per-neighbourhood service figures, not a partition of the city's boardings,
        # and summing several neighbourhoods' `transit` blocks will over-count the
        # shared border stations (the frontend sums the stations, not the blocks).
        transit = None
        if stops_data:
            mine = [s for s in stops_data["stations"] if n["id"] in s.get("neighbourhoods", ())]
            if mine:
                transit = taltan_loader.summarise(
                    mine, len(stops_data["bands"]), len(stops_data["rider_types"])
                )

        neighbourhoods_result.append({
            **n, "bbox": b, "center": center, "boundary": boundary_geom,
            "analysis_bbox": catchment_bbox, "analysis_boundary": catchment_geom_json,
            "analysis_buffer_m": municipal_loader.ANALYSIS_BUFFER_M,
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
    # Service catchments: the same polygons grown outwards, so a stop just across
    # the border still counts for the neighbourhood it plainly serves.
    analysis_boundaries = municipal_loader.build_analysis_boundaries(boundaries)
    print(
        f"=== Loaded {len(neighbourhoods_config)} official municipal neighbourhoods "
        f"from {municipal_loader.NEIGHBOURHOODS_KML.relative_to(ROOT)} "
        f"(analysis catchment: border + {municipal_loader.ANALYSIS_BUFFER_M} m) ==="
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
    stops_data = build_stops(idx, shape(gis["border"]["geometry"]), boundaries, analysis_boundaries)

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
    neighbourhoods_data = build_neighbourhoods(idx, trips_by_route, neighbourhoods_config, boundaries, analysis_boundaries, statistical_areas, stops_data)
    # Split into a small index (fetched eagerly for the dropdown) and a larger
    # shared routes lookup (fetched once, lazily, the first time a
    # neighbourhood is actually selected) — avoids loading several MB of
    # route shapes up front for users who never open the picker.
    write_json("neighbourhoods.json", neighbourhoods_data["neighbourhoods"])
    write_json("neighbourhood_routes.json", neighbourhoods_data["routes"])

    print("Done.")


if __name__ == "__main__":
    main()
