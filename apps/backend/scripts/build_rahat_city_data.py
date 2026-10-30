#!/usr/bin/env python3
"""
Build ``data/rahat/`` — the municipal layers the pipeline needs for Rahat.

**Provenance, stated plainly: these polygons come from OpenStreetMap, not from the
municipality.** They are not an official מרכז למיפוי ישראל / GovMap product.

That is a deliberate, temporary choice. Israel's open-data portal publishes no
municipal-boundary dataset (``data.gov.il`` returns nothing for גבולות מוניציפליים,
תחום שיפוט or גבול שיפוט), ArcGIS Online carries no Israeli municipal layer, and
GovMap's ArcGIS endpoint is not openly queryable. OSM's ``admin_level=8`` relation
for Rahat is the best openly fetchable boundary there is, and Israeli municipal
boundaries in OSM are generally traced from official sources.

**When the municipality supplies their own file, this script becomes unnecessary.**
Drop the official boundary in as ``data/rahat/גבול העיר/City Limits.shp`` (ITM,
EPSG:2039) and the pipeline picks it up with no code change — that path is the only
contract.

Sources:
  * city boundary    — OSM relation 1379225 (admin_level=8, wikidata Q167617)
  * neighbourhoods   — OSM ways tagged place=neighbourhood|suburb|quarter inside it

Usage (from apps/backend):
    venv/bin/python scripts/build_rahat_city_data.py
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

import pyproj
import shapefile

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from paths import DATA_DIR  # noqa: E402

RAHAT_DIR = DATA_DIR / "rahat"
BOUNDARY_DIR = RAHAT_DIR / "גבול העיר"
NEIGHBOURHOODS_DIR = RAHAT_DIR / "neighbourhoods"

OSM_RELATION = 1379225
POLYGON_URL = f"https://polygons.openstreetmap.fr/get_geojson.py?id={OSM_RELATION}&params=0"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
UA = "TransitIQ-ODFlow/1.0 (municipal boundary fetch)"

NEIGHBOURHOOD_QUERY = f"""
[out:json][timeout:120];
rel({OSM_RELATION});map_to_area->.a;
(
  way["place"~"neighbourhood|suburb|quarter"](area.a);
  rel["place"~"neighbourhood|suburb|quarter"](area.a);
);
out geom;
"""

_TO_ITM = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2039", always_xy=True).transform

# Copied verbatim from the Tel Aviv layer, so both cities declare an identical CRS
# and gis_loader's ITM assumption holds for either.
ITM_PRJ = (
    'PROJCS["Israel_TM_Grid",GEOGCS["GCS_Israel",DATUM["D_Israel",'
    'SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],'
    'UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],'
    'PARAMETER["False_Easting",219529.584],PARAMETER["False_Northing",626907.39],'
    'PARAMETER["Central_Meridian",35.20451694444445],PARAMETER["Scale_Factor",1.0000067],'
    'PARAMETER["Latitude_Of_Origin",31.73439361111111],UNIT["Meter",1.0]]'
)

# Neighbourhoods whose name carries no number (שכונת אל נור, אל־מרוואה) still need a
# stable integer key, because that is what the loader indexes on. They are given
# codes from a band no numbered שכונה can reach, so a synthetic key is recognisable
# as one and can never collide with a real one.
SYNTHETIC_CODE_BASE = 900


def _get(url: str, data: bytes | None = None) -> bytes:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


def _rings_wgs84(geom: dict) -> list[list[list[float]]]:
    """Outer rings only, as ``[[lon, lat], …]``. Holes are not used by any consumer."""
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    return [poly[0] for poly in geom["coordinates"]]


def _clockwise(ring: list[list[float]]) -> list[list[float]]:
    """
    Shapefile outer rings must wind clockwise.

    pyshp writes whatever it is given, and a counter-clockwise outer ring is read
    back by some consumers as a hole — an empty city. OSM makes no promise about
    winding, so it is enforced here rather than hoped for.
    """
    area = sum(
        (b[0] - a[0]) * (b[1] + a[1])
        for a, b in zip(ring, ring[1:] + ring[:1])
    )
    return ring if area > 0 else ring[::-1]


def _to_itm(ring: list[list[float]]) -> list[list[float]]:
    xs, ys = _TO_ITM([p[0] for p in ring], [p[1] for p in ring])
    return [[x, y] for x, y in zip(xs, ys)]


def _write_prj(stem: Path) -> None:
    stem.with_suffix(".prj").write_text(ITM_PRJ, encoding="utf-8")


def build_boundary() -> None:
    print(f"=== City boundary — OSM relation {OSM_RELATION} ===")
    geom = json.loads(_get(POLYGON_URL))
    rings = _rings_wgs84(geom)
    print(f"  {len(rings)} ring(s), {sum(len(r) for r in rings)} points (WGS-84)")

    BOUNDARY_DIR.mkdir(parents=True, exist_ok=True)
    out = BOUNDARY_DIR / "City Limits"
    with shapefile.Writer(str(out), shapeType=shapefile.POLYGON) as w:
        w.field("NAME", "C", 60)
        w.field("SOURCE", "C", 80)
        w.poly([_to_itm(_clockwise(r)) for r in rings])
        w.record("רהט", f"OpenStreetMap relation {OSM_RELATION} — provisional")
    _write_prj(out)
    print(f"  wrote {out.relative_to(DATA_DIR)}.shp (ITM / EPSG:2039)")


def _neighbourhood_code(name_he: str, fallback: int) -> tuple[int, str]:
    """``'שכונה 18'`` -> ``(18, 'שכונה 18')``; an unnumbered name gets a synthetic key."""
    m = re.search(r"(\d+)", name_he)
    if m:
        return int(m.group(1)), name_he
    return SYNTHETIC_CODE_BASE + fallback, name_he


def build_neighbourhoods() -> None:
    print("=== Neighbourhoods — OSM place polygons inside the city ===")
    raw = json.loads(_get(OVERPASS_URL, NEIGHBOURHOOD_QUERY.encode("utf-8")))

    records = []
    for i, el in enumerate(raw.get("elements", [])):
        tags = el.get("tags", {})
        name_he = (tags.get("name:he") or tags.get("name") or "").strip()
        geometry = el.get("geometry")
        if not name_he or not geometry or len(geometry) < 4:
            continue
        ring = [[p["lon"], p["lat"]] for p in geometry]
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        code, label = _neighbourhood_code(name_he, i)
        records.append({"code": code, "name": label, "ring": ring})

    # Deduplicate on the code: two OSM polygons carrying the same שכונה number would
    # otherwise both claim the key the loader indexes on, and one would silently win.
    seen: dict[int, dict] = {}
    for rec in records:
        seen.setdefault(rec["code"], rec)
    records = sorted(seen.values(), key=lambda r: r["code"])

    if not records:
        print("  none found — the area picker will stay empty")
        return

    NEIGHBOURHOODS_DIR.mkdir(parents=True, exist_ok=True)

    # The shapefile exists so the loader can FIND this folder: it locates a layer by
    # globbing for the ASCII stem and then reads export.kml beside it. The KML is
    # what actually carries the data.
    out = NEIGHBOURHOODS_DIR / "Neighbourhoods"
    with shapefile.Writer(str(out), shapeType=shapefile.POLYGON) as w:
        w.field("ms_shchuna", "N", 10)
        w.field("shem_shchu", "C", 60)
        for rec in records:
            w.poly([_to_itm(_clockwise(rec["ring"]))])
            w.record(rec["code"], rec["name"])
    _write_prj(out)

    # Matches the municipal export format municipal_loader._parse_description reads:
    # "field - value<BR/>field - value".
    placemarks = []
    for rec in records:
        coords = " ".join(f"{lon},{lat},0" for lon, lat in rec["ring"])
        placemarks.append(
            "  <Placemark>\n"
            f"    <name>{rec['name']}</name>\n"
            f"    <description>ms_shchuna - {rec['code']}<BR/>shem_shchuna - {rec['name']}"
            f"<BR/>source - OpenStreetMap (provisional)</description>\n"
            "    <Polygon><outerBoundaryIs><LinearRing><coordinates>\n"
            f"      {coords}\n"
            "    </coordinates></LinearRing></outerBoundaryIs></Polygon>\n"
            "  </Placemark>"
        )

    kml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n'
        "  <name>Rahat neighbourhoods (OpenStreetMap, provisional)</name>\n"
        + "\n".join(placemarks)
        + "\n</Document></kml>\n"
    )
    (NEIGHBOURHOODS_DIR / "export.kml").write_text(kml, encoding="utf-8")

    print(f"  {len(records)} neighbourhoods: {', '.join(r['name'] for r in records[:6])}…")
    print(f"  wrote {out.relative_to(DATA_DIR)}.shp + export.kml")


ROADS_QUERY = f"""
[out:json][timeout:180];
rel({OSM_RELATION});map_to_area->.a;
way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)(_link)?$"](area.a);
out geom;
"""


def build_roads() -> None:
    """
    Write ``roads.geojson`` for Rahat, straight from Overpass.

    This is the Overpass equivalent of ``build_roads.py``, which reads a national
    Geofabrik extract — and that extract (``data/openStreetMap/``) is not in this
    checkout, so for Rahat there is nothing for it to clip. One city's streets are
    a small enough query to take directly from the API.

    It matters beyond the roads layer itself: ``junctions_mock`` derives every
    junction from this file. Leave Tel Aviv's copy in place and the junction layer
    plots Tel Aviv intersections on a map of Rahat.

    Output matches build_roads.py's shape — a FeatureCollection of LineStrings with
    ``fclass``/``name``/``ref``/``oneway`` — so both producers stay interchangeable.
    """
    print("=== Road network — Overpass (build_roads.py's extract is not present) ===")
    raw = json.loads(_get(OVERPASS_URL, ROADS_QUERY.encode("utf-8")))

    features = []
    for el in raw.get("elements", []):
        geometry = el.get("geometry") or []
        if len(geometry) < 2:
            continue
        tags = el.get("tags", {})
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[round(p["lon"], 7), round(p["lat"], 7)] for p in geometry],
            },
            "properties": {
                "fclass": tags.get("highway", ""),
                "name": tags.get("name", ""),
                "ref": tags.get("ref", ""),
                # Geofabrik's convention, which build_roads.py passes through: F =
                # one-way along the drawn direction, B = both.
                "oneway": "F" if tags.get("oneway") == "yes" else "B",
            },
        })

    out = BACKEND_DIR.parent / "frontend" / "public" / "data" / "roads.geojson"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features},
                  f, ensure_ascii=False, separators=(",", ":"))
    named = sum(1 for f in features if f["properties"]["name"])
    print(f"  {len(features)} road segments ({named} named)")
    print(f"  wrote apps/frontend/public/data/roads.geojson ({out.stat().st_size / 1024:.1f} KB)")


def main() -> None:
    build_boundary()
    build_neighbourhoods()
    build_roads()
    print()
    print("Done. These layers are PROVISIONAL (OpenStreetMap) — replace with the")
    print("municipality's own files when they arrive; the paths are the contract.")
    print()
    print("Now build the dashboard for Rahat:")
    print("    ODFLOW_CITY=rahat venv/bin/python scripts/build_dashboard_data.py")


if __name__ == "__main__":
    main()
