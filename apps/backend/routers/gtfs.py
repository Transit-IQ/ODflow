"""
GTFS API router

Endpoints:
  GET /gtfs/status                         — index build status
  GET /gtfs/agencies                       — all agencies
  GET /gtfs/routes?short_name=4&agency=5   — search routes
  GET /gtfs/route/{route_id}/shape         — shape coords for a route
  GET /gtfs/route/{route_id}/stops         — ordered stops for a route
  GET /gtfs/stops?bbox=min_lon,min_lat,max_lon,max_lat  — stops in bbox
  GET /gtfs/stops/near?lat=&lon=&radius_m= — stops within radius
  GET /gtfs/shape/{shape_id}               — raw shape coords
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.gtfs_loader import get_index, get_index_status

router = APIRouter()


def _require_index():
    idx = get_index()
    if idx is None:
        status = get_index_status()
        if status["error"]:
            raise HTTPException(status_code=503, detail=f"GTFS index error: {status['error']}")
        raise HTTPException(status_code=503, detail="GTFS index is still loading — retry in a moment")
    return idx


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
def status():
    """Index build status and record counts."""
    return get_index_status()


# ── Agencies ──────────────────────────────────────────────────────────────────

@router.get("/agencies")
def agencies():
    """List all transit agencies."""
    idx = _require_index()
    return idx["agencies"].to_dict(orient="records")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/routes/all")
def routes_all():
    """
    Return every unique bus route deduplicated by (short_name, agency_id, long_name),
    sorted numerically by short name. Used for the sidebar line list.
    """
    idx = _require_index()
    df = idx["routes"].copy()

    # Keep only useful columns
    keep = [c for c in ["route_id", "route_short_name", "agency_id", "route_long_name", "route_type"] if c in df.columns]
    df = df[keep]

    # Deduplicate
    dedup = [c for c in ["route_short_name", "agency_id", "route_long_name"] if c in df.columns]
    df = df.drop_duplicates(subset=dedup)

    # Sort numerically where possible
    def sort_key(name):
        try:
            return (0, int(name))
        except (ValueError, TypeError):
            return (1, str(name))

    df = df.iloc[df["route_short_name"].map(sort_key).argsort()]

    return df.to_dict(orient="records")


@router.get("/routes")
def routes(
    short_name: Optional[str] = Query(None, description="Route short name, e.g. '4'"),
    agency_id: Optional[str] = Query(None, description="Agency ID, e.g. '5' for Dan"),
    long_name: Optional[str] = Query(None, description="Partial match on long name"),
):
    """Search routes by short name, agency, or long name."""
    idx = _require_index()
    df = idx["routes"]

    if short_name:
        df = df[df["route_short_name"] == short_name]
    if agency_id:
        df = df[df["agency_id"] == str(agency_id)]
    if long_name:
        df = df[df["route_long_name"].str.contains(long_name, na=False)]

    # Deduplicate by (short_name, agency_id, long_name) — same route, different dates
    dedup_cols = ["route_short_name", "agency_id", "route_long_name"]
    dedup_cols = [c for c in dedup_cols if c in df.columns]
    df = df.drop_duplicates(subset=dedup_cols)

    return df.head(100).to_dict(orient="records")


# ── Shape for a route ─────────────────────────────────────────────────────────

@router.get("/route/{route_id}/shape")
def route_shape(route_id: str):
    """
    Return the best GTFS shape for a route as a list of [lat, lon] pairs.
    'Best' = shape with the most points (highest detail).
    """
    idx = _require_index()
    shape_id = idx["route_shape"].get(route_id)
    if not shape_id:
        raise HTTPException(status_code=404, detail=f"No shape found for route {route_id}")

    coords = idx["shapes"].get(shape_id, [])
    if not coords:
        raise HTTPException(status_code=404, detail=f"Shape {shape_id} has no coordinates")

    return {
        "route_id": route_id,
        "shape_id": shape_id,
        "point_count": len(coords),
        "coordinates": coords,   # [[lat, lon], ...]
    }


# ── Stops for a route ─────────────────────────────────────────────────────────

@router.get("/route/{route_id}/stops")
def route_stops(route_id: str):
    """
    Return the ordered stop sequence for a representative trip of this route.
    """
    idx = _require_index()

    # Find a trip for this route
    trips = idx["trips"]
    route_trips = trips[trips["route_id"] == route_id]
    if route_trips.empty:
        raise HTTPException(status_code=404, detail=f"No trips for route {route_id}")

    # Pick the trip whose shape has the most points (most representative)
    shape_id = idx["route_shape"].get(route_id)
    if shape_id:
        shape_trip = route_trips[route_trips["shape_id"] == shape_id]
        trip_id = shape_trip.iloc[0]["trip_id"] if not shape_trip.empty else route_trips.iloc[0]["trip_id"]
    else:
        trip_id = route_trips.iloc[0]["trip_id"]

    stop_ids = idx["trip_stops"].get(trip_id, [])
    if not stop_ids:
        raise HTTPException(status_code=404, detail="No stop sequence loaded for this trip")

    stops_gdf = idx["stops"]
    result = []
    for sid in stop_ids:
        if sid in stops_gdf.index:
            row = stops_gdf.loc[sid]
            result.append({
                "stop_id": sid,
                "stop_name": row.get("stop_name", ""),
                "lat": float(row["stop_lat"]),
                "lon": float(row["stop_lon"]),
            })

    return {"route_id": route_id, "trip_id": trip_id, "stops": result}


# ── Raw shape ─────────────────────────────────────────────────────────────────

@router.get("/shape/{shape_id}")
def shape(shape_id: str):
    """Return raw shape coordinates for a given shape_id."""
    idx = _require_index()
    coords = idx["shapes"].get(shape_id)
    if coords is None:
        raise HTTPException(status_code=404, detail=f"Shape {shape_id} not found")
    return {"shape_id": shape_id, "point_count": len(coords), "coordinates": coords}


# ── Routes in bounding box ────────────────────────────────────────────────────

@router.get("/routes/in-bbox")
def routes_in_bbox(
    min_lat: float = Query(..., description="South bound"),
    max_lat: float = Query(..., description="North bound"),
    min_lon: float = Query(..., description="West bound"),
    max_lon: float = Query(..., description="East bound"),
):
    """
    Return all unique routes that have at least one stop inside the given bounding box.
    Uses the stop_routes index (built from stop_times) for O(1) per-stop lookup.
    Falls back to shape-based search if stop_routes index is not available.
    Results are sorted numerically by route_short_name.
    """
    idx = _require_index()
    stops_df    = idx["stops"]
    routes_df   = idx["routes"]
    stop_routes = idx.get("stop_routes", {})
    route_shape = idx["route_shape"]
    shapes      = idx["shapes"]

    # 1. Find stops in bbox
    mask = (
        (stops_df["stop_lat"] >= min_lat) & (stops_df["stop_lat"] <= max_lat) &
        (stops_df["stop_lon"] >= min_lon) & (stops_df["stop_lon"] <= max_lon)
    )
    bbox_stop_ids: set[str] = set(stops_df[mask].index.astype(str))

    # 2. Collect route_ids from stop_routes index
    route_ids: set[str] = set()
    if stop_routes and bbox_stop_ids:
        for sid in bbox_stop_ids:
            route_ids.update(stop_routes.get(sid, frozenset()))
    elif bbox_stop_ids:
        # Fallback: shape-coord based bbox search (no stop_times loaded)
        print("[GTFS] routes/in-bbox: fallback to shape-scan (stop_routes empty)")
        for rid, sid in route_shape.items():
            coords = shapes.get(sid, [])
            for lat, lon in coords:
                if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
                    route_ids.add(rid)
                    break

    if not route_ids:
        return []

    # 3. Look up route metadata and deduplicate by (short_name, agency_id, long_name)
    keep_cols = [c for c in ["route_id", "route_short_name", "agency_id", "route_long_name"] if c in routes_df.columns]
    df = routes_df[routes_df["route_id"].isin(route_ids)][keep_cols].copy()

    dedup = [c for c in ["route_short_name", "agency_id", "route_long_name"] if c in df.columns]
    df = df.drop_duplicates(subset=dedup)

    # Keep only the route_id that has a shape (prefer ones with shapes)
    has_shape = {rid for rid in df["route_id"] if rid in route_shape}
    if has_shape:
        df = df[df["route_id"].isin(has_shape)]

    # Sort numerically by route_short_name
    def sort_key(name):
        try:
            return (0, int(str(name)))
        except (ValueError, TypeError):
            return (1, str(name))

    df = df.iloc[df["route_short_name"].map(sort_key).argsort()]
    return df.to_dict(orient="records")


# ── Stops in bounding box ─────────────────────────────────────────────────────

@router.get("/stops")
def stops_in_bbox(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lon: float = Query(...),
    max_lon: float = Query(...),
):
    """Return all stops within the given bounding box."""
    idx = _require_index()
    df = idx["stops"]
    mask = (
        (df["stop_lat"] >= min_lat) & (df["stop_lat"] <= max_lat) &
        (df["stop_lon"] >= min_lon) & (df["stop_lon"] <= max_lon)
    )
    keep = [c for c in ["stop_name", "stop_lat", "stop_lon"] if c in df.columns]
    subset = df[mask][keep].reset_index()
    return subset.to_dict(orient="records")


# ── Stops near a point ────────────────────────────────────────────────────────

@router.get("/stops/near")
def stops_near(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_m: float = Query(500, description="Search radius in metres"),
):
    """
    Return all stops within radius_m metres of (lat, lon).
    Uses a fast approximation: 1 deg lat ≈ 111,000 m; 1 deg lon ≈ 87,000 m in Israel.
    """
    idx = _require_index()
    df = idx["stops"]

    # Pre-filter by bounding box (fast)
    lat_margin = radius_m / 111_000
    lon_margin = radius_m / 87_000
    mask = (
        (df["stop_lat"] >= lat - lat_margin) & (df["stop_lat"] <= lat + lat_margin) &
        (df["stop_lon"] >= lon - lon_margin) & (df["stop_lon"] <= lon + lon_margin)
    )
    candidate = df[mask].copy()

    # Accurate Euclidean distance in metres
    dlat = (candidate["stop_lat"] - lat) * 111_000
    dlon = (candidate["stop_lon"] - lon) * 87_000
    candidate["distance_m"] = (dlat**2 + dlon**2) ** 0.5
    nearby = candidate[candidate["distance_m"] <= radius_m]
    keep = [c for c in ["stop_name", "stop_lat", "stop_lon", "distance_m"] if c in nearby.columns]
    nearby = nearby[keep].reset_index().sort_values("distance_m")
    nearby["distance_m"] = nearby["distance_m"].round(1)

    return nearby.to_dict(orient="records")


# ── Frequency / heatmap ───────────────────────────────────────────────────────

@router.get("/frequency")
def frequency(
    top_n: int = Query(200, description="Return top N routes by trip count"),
):
    """
    Return trip frequency data for the frequency heatmap.
    Each record contains the route's total trip count, its shape coordinates,
    and a 24-element hourly distribution array.
    Sorted descending by trip_count so busiest routes are drawn on top.
    """
    idx = _require_index()
    routes_df   = idx["routes"]
    route_shape = idx["route_shape"]
    shapes      = idx["shapes"]
    trip_counts = idx.get("route_trip_counts", {})
    route_hourly = idx.get("route_hourly", {})
    network_hourly = idx.get("network_hourly", [0] * 24)

    # Build result — one record per unique route
    keep_cols = [c for c in ["route_id", "route_short_name", "agency_id", "route_long_name"] if c in routes_df.columns]
    df = routes_df[keep_cols].drop_duplicates(subset="route_id")

    records = []
    for _, row in df.iterrows():
        rid  = row["route_id"]
        sid  = route_shape.get(rid)
        if not sid:
            continue
        coords = shapes.get(sid, [])
        if not coords:
            continue
        trip_count = trip_counts.get(rid, 0)
        hourly     = route_hourly.get(rid, [0] * 24)
        records.append({
            "route_id":         rid,
            "route_short_name": row.get("route_short_name", ""),
            "agency_id":        row.get("agency_id", ""),
            "route_long_name":  row.get("route_long_name", ""),
            "shape_id":         sid,
            "trip_count":       trip_count,
            "hourly":           hourly,
            "coordinates":      coords,  # [[lat,lon],...]
        })

    # Sort by trip_count desc, take top_n
    records.sort(key=lambda r: r["trip_count"], reverse=True)
    records = records[:top_n]
    max_trips = records[0]["trip_count"] if records else 1

    return {
        "routes":          records,
        "network_hourly":  network_hourly,
        "max_trip_count":  max_trips,
        "peak_hour":       int(network_hourly.index(max(network_hourly))) if network_hourly else 8,
        "total_routes":    len(records),
    }


@router.get("/frequency/network")
def frequency_network():
    """Return only the network-wide hourly trip counts (lightweight endpoint for spark chart)."""
    idx = _require_index()
    hourly = idx.get("network_hourly", [0] * 24)
    return {
        "hourly":     hourly,
        "peak_hour":  int(hourly.index(max(hourly))) if hourly else 8,
        "total_trips": sum(hourly),
    }
