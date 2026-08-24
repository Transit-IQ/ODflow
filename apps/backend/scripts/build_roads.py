#!/usr/bin/env python3
"""
Build roads.geojson — OSM road network clipped to Tel Aviv.

Pure-Python (stdlib only): reads the Geofabrik SHP/DBF files directly with
struct, clips to the city polygon already built in border.json, and writes
a GeoJSON FeatureCollection the frontend fetches lazily.

Usage (from repo root):
    python3 apps/backend/scripts/build_roads.py
"""

import json
import struct
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR   = REPO_ROOT / "data"
OUT_DIR    = REPO_ROOT / "apps" / "frontend" / "public" / "data"
BORDER_JSON = OUT_DIR / "border.json"
ROADS_SHP   = DATA_DIR / "openStreetMap" / "israel-and-palestine-260802-free.shp" / "gis_osm_roads_free_1.shp"

KEEP_FCLASS = {
    "motorway", "motorway_link",
    "trunk", "trunk_link",
    "primary", "primary_link",
    "secondary", "secondary_link",
    "tertiary", "tertiary_link",
    "residential",
    "unclassified",
    "living_street",
}


# ── geometry helpers ─────────────────────────────────────────────────────────

def point_in_polygon(x, y, ring):
    """Ray-casting point-in-polygon test. ring is a list of [lon, lat] pairs."""
    inside = False
    j = len(ring) - 1
    for i, (xi, yi) in enumerate(ring):
        xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def any_point_in_polygon(parts, ring):
    """True if any of the three anchor points (start, mid, end) of any part is inside the ring."""
    for coords in parts:
        n = len(coords)
        for idx in (0, n // 2, n - 1):
            x, y = coords[idx]
            if point_in_polygon(x, y, ring):
                return True
    return False


def bbox_overlaps(a, b):
    """a, b are (xmin, ymin, xmax, ymax) tuples."""
    return a[2] >= b[0] and a[0] <= b[2] and a[3] >= b[1] and a[1] <= b[3]


# ── SHP reader ───────────────────────────────────────────────────────────────

def read_shp(path):
    """Yield (bbox, parts) for every Polyline record in a WGS-84 shapefile."""
    with open(path, "rb") as f:
        f.seek(100)  # skip file header
        while True:
            hdr = f.read(8)
            if len(hdr) < 8:
                break
            content_len = struct.unpack(">ii", hdr)[1] * 2  # words → bytes
            content = f.read(content_len)
            if len(content) < 4:
                break

            shape_type = struct.unpack_from("<i", content, 0)[0]
            if shape_type == 0:          # Null shape
                yield None, []
                continue
            if shape_type not in (3, 5): # Polyline or Polygon
                yield None, []
                continue

            xmin, ymin, xmax, ymax = struct.unpack_from("<dddd", content, 4)
            num_parts  = struct.unpack_from("<i", content, 36)[0]
            num_points = struct.unpack_from("<i", content, 40)[0]

            parts_start = struct.unpack_from(f"<{num_parts}i", content, 44)
            pts_offset  = 44 + num_parts * 4

            all_pts = []
            for i in range(num_points):
                x, y = struct.unpack_from("<dd", content, pts_offset + i * 16)
                all_pts.append((x, y))

            parts = []
            for pi, start in enumerate(parts_start):
                end = parts_start[pi + 1] if pi + 1 < num_parts else num_points
                parts.append(all_pts[start:end])

            yield (xmin, ymin, xmax, ymax), parts


# ── DBF reader ───────────────────────────────────────────────────────────────

def read_dbf(path):
    """Yield one dict per record, omitting deleted rows."""
    with open(path, "rb") as f:
        f.read(4)
        num_records  = struct.unpack("<I", f.read(4))[0]
        header_size  = struct.unpack("<H", f.read(2))[0]
        record_size  = struct.unpack("<H", f.read(2))[0]
        f.read(20)

        fields = []
        while True:
            b = f.read(32)
            if not b or b[0] == 0x0D:
                break
            name   = b[:11].rstrip(b"\x00").decode("ascii", "replace").strip("\x00")
            typ    = chr(b[11])
            length = b[16]
            fields.append((name, typ, length))

        f.seek(header_size)
        for _ in range(num_records):
            rec = f.read(record_size)
            if not rec or rec[0] == 0x2A:  # deleted
                continue
            offset = 1
            row = {}
            for name, typ, length in fields:
                raw = rec[offset: offset + length]
                offset += length
                if typ in ("C", "N", "F"):
                    row[name] = raw.decode("utf-8", "replace").strip()
                else:
                    row[name] = raw.decode("utf-8", "replace").strip()
            yield row


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    if not BORDER_JSON.exists():
        sys.exit(f"ERROR: {BORDER_JSON} not found. Run build_dashboard_data.py first.")
    if not ROADS_SHP.exists():
        sys.exit(f"ERROR: {ROADS_SHP} not found.")

    # City polygon from the already-built border.json (WGS-84)
    with open(BORDER_JSON, encoding="utf-8") as f:
        border = json.load(f)
    city_ring = border["geometry"]["coordinates"][0]  # [[lon, lat], …]
    lons = [c[0] for c in city_ring]
    lats = [c[1] for c in city_ring]
    city_bbox = (min(lons), min(lats), max(lons), max(lats))

    dbf_path = ROADS_SHP.with_suffix(".dbf")
    print("Reading DBF attributes…")
    attrs = list(read_dbf(dbf_path))
    print(f"  {len(attrs):,} total road records in file")

    print("Reading SHP geometries and filtering…")
    features = []
    skipped_fclass = 0
    skipped_bbox   = 0
    skipped_poly   = 0

    for i, (bbox, parts) in enumerate(read_shp(ROADS_SHP)):
        if i >= len(attrs):
            break

        attr   = attrs[i]
        fclass = attr.get("fclass", "")

        if fclass not in KEEP_FCLASS:
            skipped_fclass += 1
            continue

        if bbox is None or not bbox_overlaps(bbox, city_bbox):
            skipped_bbox += 1
            continue

        if not any_point_in_polygon(parts, city_ring):
            skipped_poly += 1
            continue

        geom = (
            {"type": "LineString",      "coordinates": [[x, y] for x, y in parts[0]]}
            if len(parts) == 1
            else {"type": "MultiLineString", "coordinates": [[[x, y] for x, y in p] for p in parts]}
        )

        name   = attr.get("name", "").strip()  or None
        ref    = attr.get("ref",  "").strip()  or None
        oneway = attr.get("oneway", "").strip() or None

        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "fclass": fclass,
                "name":   name,
                "ref":    ref,
                "oneway": oneway,
            },
        })

    print(f"  skipped: {skipped_fclass:,} wrong class · {skipped_bbox:,} outside bbox · {skipped_poly:,} outside polygon")
    print(f"  kept: {len(features):,} features")

    out = {"type": "FeatureCollection", "features": features}
    out_path = OUT_DIR / "roads.geojson"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = out_path.stat().st_size / 1024
    print(f"Wrote {out_path}  ({size_kb:,.0f} KB)")


if __name__ == "__main__":
    main()
