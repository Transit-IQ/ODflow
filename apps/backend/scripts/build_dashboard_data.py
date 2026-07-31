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

from services import gtfs_loader, gis_loader  # noqa: E402
from paths import DATA_DIR, FRONTEND_PUBLIC_DATA_DIR as OUT_DIR, REPO_ROOT as ROOT  # noqa: E402

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


def build_speed_kpis(speeds: list) -> dict:
    """
    Derive dashboard KPIs directly from the clipped speed segments —
    nothing here is a hardcoded/mocked number.
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

    return {
        "segment_count": len(speeds),
        # Average speed per time-of-day period (P1..P7), across all days/segments.
        "speed_profile": speed_profile,
    }


def build_neighbourhoods(idx: dict, trips_by_route: dict, neighbourhoods_config: list, boundaries: dict) -> dict:
    """
    For every configured neighbourhood, find routes with a stop inside its
    area and attach each route's best shape + stop list. Routes are
    deduplicated into a shared `routes` dict since many lines cross multiple
    neighbourhoods.

    Where a real boundary polygon exists (see data/neighbourhood_boundaries.json
    — fetched once from OpenStreetMap, not present for every entry), stops are
    matched with an actual point-in-polygon test instead of the coarse bbox,
    which is both a tighter/more accurate stop-matching rule and gives the
    frontend a real shape to draw instead of a rectangle.
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

        if boundary_geom:
            # The hand-entered config bbox turned out to be unreliable for a
            # couple of these (one didn't even overlap the real neighbourhood
            # at all) — once a real boundary is known, use ITS bounds for the
            # candidate-stop pre-filter, and correct the reported bbox to
            # match, rather than trusting the stale config value.
            poly_geom = shape(boundary_geom)
            min_lon, min_lat, max_lon, max_lat = poly_geom.bounds
            b = {"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon}
            candidate_stops = stops_df[
                (stops_df["stop_lat"] >= min_lat) & (stops_df["stop_lat"] <= max_lat) &
                (stops_df["stop_lon"] >= min_lon) & (stops_df["stop_lon"] <= max_lon)
            ]
            polygon = prep(poly_geom)
            bbox_stop_ids = {
                sid for sid, row in candidate_stops.iterrows()
                if polygon.contains(Point(row["stop_lon"], row["stop_lat"]))
            }
        else:
            b = n["bbox"]
            candidate_stops = stops_df[
                (stops_df["stop_lat"] >= b["min_lat"]) & (stops_df["stop_lat"] <= b["max_lat"]) &
                (stops_df["stop_lon"] >= b["min_lon"]) & (stops_df["stop_lon"] <= b["max_lon"])
            ]
            bbox_stop_ids = set(candidate_stops.index.astype(str))

        route_ids = set()
        for sid in bbox_stop_ids:
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

        neighbourhoods_result.append({**n, "bbox": b, "boundary": boundary_geom, "route_ids": n_route_ids})
        src = "real boundary" if boundary_geom else "bbox rectangle only"
        print(f"  {n['name']}: {len(n_route_ids)} routes ({src})")

    return {"neighbourhoods": neighbourhoods_result, "routes": routes_out}


def main():
    idx = build_gtfs_index()
    gis = build_gis_index()

    with open(DATA_DIR / "neighbourhoods.json", encoding="utf-8") as f:
        neighbourhoods_config = json.load(f)

    boundaries_path = DATA_DIR / "neighbourhood_boundaries.json"
    boundaries = {}
    if boundaries_path.exists():
        with open(boundaries_path, encoding="utf-8") as f:
            boundaries = json.load(f)
        print(f"=== Loaded {len(boundaries)} real neighbourhood boundaries (of {len(neighbourhoods_config)} configured) ===")
    else:
        print("=== No data/neighbourhood_boundaries.json — all neighbourhoods will fall back to their bbox rectangle ===")

    print("=== Indexing trips by route (for shape/stop lookups) ===")
    trips_by_route = {rid: grp for rid, grp in idx["trips"].groupby("route_id")}

    print("=== Writing static JSON for frontend ===")
    write_json("border.json", gis["border"])
    write_json("speeds.json", gis["speeds"])
    write_json("kpis.json", build_speed_kpis(gis["speeds"]))
    neighbourhoods_data = build_neighbourhoods(idx, trips_by_route, neighbourhoods_config, boundaries)
    # Split into a small index (fetched eagerly for the dropdown) and a larger
    # shared routes lookup (fetched once, lazily, the first time a
    # neighbourhood is actually selected) — avoids loading several MB of
    # route shapes up front for users who never open the picker.
    write_json("neighbourhoods.json", neighbourhoods_data["neighbourhoods"])
    write_json("neighbourhood_routes.json", neighbourhoods_data["routes"])

    print("Done.")


if __name__ == "__main__":
    main()
