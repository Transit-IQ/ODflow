"""
GTFS Loader — builds an in-memory index of the Israel MOT GTFS data.

Files expected in ../data/gtfs/:
  agency.txt      — transit operators
  routes.txt      — route definitions
  trips.txt       — trip → shape_id mapping
  shapes.txt      — GPS traces for each shape (211 MB)
  stops.txt       — stop locations
  stop_times.txt  — stop sequences per trip (458 MB)

The index is built once at server startup in a background thread.
All API lookups read from RAM — no per-request file I/O.
NOTE: geopandas is NOT used due to pyproj/Python 3.14 incompatibility.
      Spatial queries use plain pandas arithmetic instead.
"""

import threading
from typing import Optional

import pandas as pd

from paths import GTFS_DIR

REQUIRED_FILES = ["agency.txt", "routes.txt", "trips.txt", "shapes.txt", "stops.txt"]
OPTIONAL_FILES = ["stop_times.txt"]

# ── Shared state ──────────────────────────────────────────────────────────────
_index: Optional[dict] = None
_index_error: Optional[str] = None
_index_lock = threading.Lock()


def get_index_status() -> dict:
    return {
        "ready": _index is not None,
        "error": _index_error,
        "routes": len(_index["routes"]) if _index else 0,
        "shapes": len(_index["shapes"]) if _index else 0,
        "stops": len(_index["stops"]) if _index else 0,
    }


def get_index() -> Optional[dict]:
    return _index


def _check_files() -> list[str]:
    return [f for f in REQUIRED_FILES if not (GTFS_DIR / f).exists()]


def _build_index():
    global _index, _index_error
    try:
        missing = _check_files()
        if missing:
            _index_error = f"Missing GTFS files in data/gtfs/: {', '.join(missing)}"
            return

        print("[GTFS] Loading agency.txt...")
        agencies = pd.read_csv(GTFS_DIR / "agency.txt", dtype=str).fillna("")

        print("[GTFS] Loading routes.txt...")
        routes = pd.read_csv(GTFS_DIR / "routes.txt", dtype=str).fillna("")

        print("[GTFS] Loading trips.txt...")
        trips = pd.read_csv(
            GTFS_DIR / "trips.txt",
            usecols=["route_id", "trip_id", "shape_id"],
            dtype=str,
        ).fillna("")

        print("[GTFS] Loading stops.txt...")
        stops_df = pd.read_csv(GTFS_DIR / "stops.txt", dtype=str).fillna("")
        # Use pandas — no geopandas (pyproj incompatible with Python 3.14)
        stops_df = stops_df.copy()
        stops_df.loc[:, "stop_lat"] = pd.to_numeric(stops_df["stop_lat"], errors="coerce")
        stops_df.loc[:, "stop_lon"] = pd.to_numeric(stops_df["stop_lon"], errors="coerce")
        stops_df = stops_df.dropna(subset=["stop_lat", "stop_lon"])
        stops_df = stops_df.set_index("stop_id")

        print("[GTFS] Loading shapes.txt (211 MB)...")
        shapes_df = pd.read_csv(
            GTFS_DIR / "shapes.txt",
            usecols=["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
            dtype={"shape_id": str, "shape_pt_sequence": int},
        )
        shapes_df = shapes_df.copy()
        shapes_df.loc[:, "shape_pt_lat"] = pd.to_numeric(shapes_df["shape_pt_lat"], errors="coerce")
        shapes_df.loc[:, "shape_pt_lon"] = pd.to_numeric(shapes_df["shape_pt_lon"], errors="coerce")
        shapes_df = shapes_df.dropna()
        shapes_df = shapes_df.sort_values(["shape_id", "shape_pt_sequence"])

        shapes: dict[str, list] = {}
        for shape_id, grp in shapes_df.groupby("shape_id"):
            shapes[shape_id] = grp[["shape_pt_lat", "shape_pt_lon"]].values.tolist()

        # ── Optional: stop_times ──────────────────────────────────────────────
        trip_stops: dict[str, list] = {}
        stop_routes: dict[str, frozenset] = {}   # built inside if stop_times exists
        route_hourly: dict[str, list] = {}
        network_hourly: list = [0] * 24

        stop_times_path = GTFS_DIR / "stop_times.txt"
        if stop_times_path.exists():
            print("[GTFS] Loading stop_times.txt (458 MB)...")
            st = pd.read_csv(
                stop_times_path,
                usecols=["trip_id", "stop_id", "stop_sequence", "departure_time"],
                dtype={"trip_id": str, "stop_id": str, "stop_sequence": int,
                       "departure_time": str},
            )
            st = st.copy()
            st.loc[:, "departure_time"] = st["departure_time"].fillna("00:00:00")
            st = st.sort_values(["trip_id", "stop_sequence"])

            # Build trip_stops
            for trip_id, grp in st.groupby("trip_id"):
                trip_stops[trip_id] = grp["stop_id"].tolist()

            print("[GTFS] Computing frequency/hourly distribution...")
            first_dep = st.drop_duplicates(subset="trip_id", keep="first")[["trip_id", "departure_time"]].copy()
            first_dep["hour"] = (
                first_dep["departure_time"].str.split(":").str[0]
                .apply(lambda h: int(h) % 24 if str(h).isdigit() else 0)
            )
            trip_route = trips[["trip_id", "route_id"]].drop_duplicates()
            dep_with_route = first_dep.merge(trip_route, on="trip_id", how="left")
            dep_with_route = dep_with_route.dropna(subset=["route_id"])

            net_counts = dep_with_route.groupby("hour").size()
            for h, cnt in net_counts.items():
                if 0 <= int(h) < 24:
                    network_hourly[int(h)] = int(cnt)

            route_hour_counts = (
                dep_with_route.groupby(["route_id", "hour"]).size().reset_index(name="cnt")
            )
            for rid, grp in route_hour_counts.groupby("route_id"):
                arr = [0] * 24
                for _, row in grp.iterrows():
                    arr[int(row["hour"])] = int(row["cnt"])
                route_hourly[rid] = arr

            print(f"[GTFS] Frequency computed for {len(route_hourly)} routes")

            # ── stop_routes: stop_id → frozenset(route_id) ───────────────────
            print("[GTFS] Building stop→routes index...")
            trip_route_map = trips[["trip_id", "route_id"]].drop_duplicates()
            stop_trip_pairs = st[["stop_id", "trip_id"]].drop_duplicates()
            stop_route_df = stop_trip_pairs.merge(trip_route_map, on="trip_id", how="left")
            stop_route_df = stop_route_df.dropna(subset=["route_id"])
            # group: stop_id → frozenset of route_ids
            stop_routes_series = stop_route_df.groupby("stop_id")["route_id"].apply(frozenset)
            stop_routes: dict[str, frozenset] = stop_routes_series.to_dict()
            print(f"[GTFS] stop_routes: {len(stop_routes)} stops indexed")

        # ── Route trip counts ─────────────────────────────────────────────────
        route_trip_counts: dict[str, int] = trips.groupby("route_id").size().to_dict()

        # ── Route → best shape (most points) ──────────────────────────────────
        shape_len = {sid: len(pts) for sid, pts in shapes.items()}
        route_shape: dict[str, str] = {}
        for _, row in trips.iterrows():
            rid, sid = row["route_id"], row["shape_id"]
            if not sid:
                continue
            if rid not in route_shape or shape_len.get(sid, 0) > shape_len.get(route_shape[rid], 0):
                route_shape[rid] = sid

        # ── (route_short_name, agency_id) → [route_id, ...] ──────────────────
        route_lookup: dict[tuple, list] = {}
        for _, r in routes.iterrows():
            key = (r["route_short_name"], r.get("agency_id", ""))
            route_lookup.setdefault(key, []).append(r["route_id"])

        with _index_lock:
            _index = {
                "agencies":          agencies,
                "routes":            routes,
                "trips":             trips,
                "stops":             stops_df,          # plain DataFrame indexed by stop_id
                "shapes":            shapes,
                "route_shape":       route_shape,
                "route_lookup":      route_lookup,
                "trip_stops":        trip_stops,
                "stop_routes":       stop_routes,        # dict stop_id → frozenset(route_id)
                "route_trip_counts": route_trip_counts,
                "route_hourly":      route_hourly,
                "network_hourly":    network_hourly,
            }

        counts = f"{len(routes)} routes, {len(shapes)} shapes, {len(stops_df)} stops"
        print(f"[GTFS] Index ready: {counts}")

    except Exception as e:
        import traceback
        _index_error = str(e)
        print(f"[GTFS] Index build failed: {e}")
        traceback.print_exc()


def start_index_build():
    """Call once at server startup — builds index in a background thread."""
    t = threading.Thread(target=_build_index, daemon=True)
    t.start()
