import threading
import shapefile
import pyproj
from typing import Optional
from shapely.geometry import Polygon, LineString

# NOTE: this module used to import GTFS_DIR aliased as DATA_DIR, so "DATA_DIR" here
# meant data/gtfs/, not data/. The shapefile lookup below searches the whole data/
# tree, so it no longer matters where under data/ a layer is filed.
from paths import DATA_DIR

# Shared state
_gis_data: Optional[dict] = None
_gis_error: Optional[str] = None
_gis_lock = threading.Lock()

def get_gis_status() -> dict:
    return {
        "ready": _gis_data is not None,
        "error": _gis_error,
        "segments": len(_gis_data["speeds"]) if _gis_data else 0,
    }

def get_gis_data() -> Optional[dict]:
    return _gis_data

# Real ITM (EPSG:2039) -> WGS84 (EPSG:4326) transformer. An earlier version
# of this hand-rolled its own Transverse Mercator math to work around pyproj
# being broken on Python 3.14 — that math got the projection right but
# silently omitted the Israel-datum -> WGS84 correction, leaving every point
# shifted by a consistent ~78m. pyproj 3.7+ fixed the Python 3.14 issue, so
# this now just uses PROJ's own (correct, maintained) transformation.
_itm_transformer = pyproj.Transformer.from_crs("EPSG:2039", "EPSG:4326", always_xy=True)


def itm_to_wgs84(e, n):
    """Convert a single ITM point to (lat, lon) in WGS84."""
    lon, lat = _itm_transformer.transform(e, n)
    return lat, lon


def itm_points_to_wgs84(points):
    """Batch-convert a list of (e, n) ITM points to a list of (lat, lon) pairs."""
    es = [p[0] for p in points]
    ns = [p[1] for p in points]
    lons, lats = _itm_transformer.transform(es, ns)
    return list(zip(lats, lons))

def _find_shapefile(stem: str) -> str:
    """
    Locate ``<stem>.shp`` anywhere under data/, by searching rather than by hardcoding
    a path.

    The municipal layers live in Hebrew-named folders (``גבול העיר``), and a hardcoded
    Hebrew literal is fragile: macOS may store the name in a different Unicode
    normalisation (NFD) than the one written in this file (NFC), in which case an exact
    string comparison misses a directory that is plainly there in `ls`. Matching on the
    ASCII shapefile stem sidesteps that entirely, and also survives the folder being
    renamed or re-nested.

    Raises with a directory listing attached, so a miss is diagnosable instead of just
    "could not be opened".
    """
    matches = sorted(DATA_DIR.glob(f"**/{stem}.shp"))
    # Require the sibling files pyshp actually needs, so a stray/partial copy doesn't win.
    complete = [m for m in matches if m.with_suffix(".dbf").exists() and m.with_suffix(".shx").exists()]
    if complete:
        return str(complete[0])

    found = "\n".join(f"    {p.relative_to(DATA_DIR)}" for p in sorted(DATA_DIR.glob("**/*.shp"))) or "    (none)"
    raise FileNotFoundError(
        f"Could not find a complete '{stem}' shapefile (.shp + .shx + .dbf) under {DATA_DIR}.\n"
        f"  Shapefiles that ARE present:\n{found}\n"
        f"  Incomplete matches for this stem: {[str(m.relative_to(DATA_DIR)) for m in matches] or 'none'}"
    )


def _build_gis_index():
    global _gis_data, _gis_error
    try:
        print("[GIS] Loading City Limits...")
        city_path = _find_shapefile("City Limits")
        print(f"[GIS]   -> {city_path}")
        with shapefile.Reader(city_path) as city_sf:
            city_shape = city_sf.shape(0)
            
            # Extract boundary as WGS84 GeoJSON
            city_wgs84 = [[lon, lat] for lat, lon in itm_points_to_wgs84(city_shape.points)]  # GeoJSON uses [lon, lat]

            city_geojson = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [city_wgs84]
                },
                "properties": {"name": "Tel Aviv City Limits"}
            }
            
            # Create a Shapely polygon in ITM for fast spatial intersection
            city_poly = Polygon(city_shape.points)
            city_bbox = city_shape.bbox

        print("[GIS] Loading BUS_SPEED (this will take a minute)...")
        speed_path = _find_shapefile("BUS_SPEED")
        print(f"[GIS]   -> {speed_path}")
        with shapefile.Reader(speed_path) as speed_sf:
            
            # Find indices of speed fields d_1_h_1 through d_5_h_7
            # Fields in pyshp include DeletionFlag at index 0.
            fields = [f[0] for f in speed_sf.fields[1:]]
            speed_indices = []
            for d in range(1, 6):
                for h in range(1, 8):
                    fname = f"d_{d}_h_{h}"
                    if fname in fields:
                        speed_indices.append(fields.index(fname))

            processed_segments = []
            
            print("[GIS] Intersecting segments with City Limits...")
            # We iterate through all shapes and records
            # Using iterShapeRecords is best
            count_in_bbox = 0
            for sr in speed_sf.iterShapeRecords():
                shape = sr.shape
                # 1. Fast bounding box check
                s_minx, s_miny, s_maxx, s_maxy = shape.bbox
                c_minx, c_miny, c_maxx, c_maxy = city_bbox
                if s_maxx < c_minx or s_minx > c_maxx or s_maxy < c_miny or s_miny > c_maxy:
                    continue
                
                count_in_bbox += 1
                
                # 2. Precise polygon intersection
                line = LineString(shape.points)
                if city_poly.intersects(line):
                    # Convert to WGS84 — [lat, lon] pairs, Leaflet polyline format
                    coords_wgs84 = [[lat, lon] for lat, lon in itm_points_to_wgs84(shape.points)]

                    # Extract speeds
                    speeds = [sr.record[idx] for idx in speed_indices]
                    
                    processed_segments.append({
                        "coordinates": coords_wgs84,
                        "speeds": speeds
                    })

        with _gis_lock:
            _gis_data = {
                "border": city_geojson,
                "speeds": processed_segments
            }
            
        print(f"[GIS] Index ready: {len(processed_segments)} speed segments inside Tel Aviv")

    except Exception as e:
        import traceback
        _gis_error = str(e)
        print(f"[GIS] Build failed: {e}")
        traceback.print_exc()

def start_gis_build():
    t = threading.Thread(target=_build_gis_index, daemon=True)
    t.start()
