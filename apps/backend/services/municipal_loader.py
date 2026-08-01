"""
Loader for the Tel Aviv-Yafo municipal open-data layers under ``data/municipal/``.

Every layer the municipality publishes ships as an ITM (EPSG:2039) shapefile *and* a
KML. KML is WGS-84 by definition, so this module reads the KML and needs no coordinate
conversion at all — nothing here touches ``gis_loader._itm_transformer``, which is the
only path on which the ~78 m datum-shift bug documented there is reachable.

The source files are read directly; there are no pre-generated intermediates. Layers:

``neighbourhoods/export.kml``
    The official neighbourhood polygons, keyed by ``ms_shchuna``. This is the *only*
    source of the neighbourhood list: which neighbourhoods exist, what they are called
    and where their edges run all come from here. It replaces the hand-maintained
    ``data/neighbourhoods.json`` config (a fixed subset with hand-drawn ``bbox``
    rectangles and hand-entered centres) and the OpenStreetMap/Nominatim polygons
    formerly in ``data/neighbourhood_boundaries.json``.

``אזורים סטטיסטים/export.kml``
    184 CBS statistical areas carrying 2022 population by age band.

``destinations/<category>/export.kml``
    One point layer per civic/service category; the folder name is the Hebrew label.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

from paths import DATA_DIR

MUNICIPAL_DIR = DATA_DIR / "municipal"
DESTINATIONS_DIR = MUNICIPAL_DIR / "destinations"


def _find_layer_kml(shapefile_stem: str) -> Optional[Path]:
    """
    Locate a layer's ``export.kml`` by searching for its ASCII shapefile stem, rather
    than hardcoding the folder name.

    Several of these folders are Hebrew-named (``אזורים סטטיסטים``). A hardcoded Hebrew
    literal is fragile: macOS may store the directory name in a different Unicode
    normalisation (NFD) than the one written in this file (NFC), so an exact string
    comparison can miss a folder that is plainly present in `ls`. Every layer ships an
    ASCII-named shapefile beside its KML, so matching on that stem is stable — and it
    also survives the folder being renamed or re-nested.
    """
    for shp in sorted(MUNICIPAL_DIR.glob(f"**/{shapefile_stem}.shp")):
        kml = shp.parent / "export.kml"
        if kml.exists():
            return kml
    # Fall back to a folder that has an export.kml and matches on stem alone.
    for shp in sorted(MUNICIPAL_DIR.glob(f"**/{shapefile_stem}.shp")):
        return shp.parent / "export.kml"
    return None


NEIGHBOURHOODS_KML = _find_layer_kml("Neighbourhoods")
STATISTICAL_AREAS_KML = _find_layer_kml("Statistical Areas With Population")

# CBS age bands, in the order the municipality publishes them.
AGE_BANDS = [
    "g0to9", "g10to19", "g20to29", "g30to39", "g40to49",
    "g50to59", "g60to69", "g70to79", "g80up",
]

# Tel Aviv envelope. Anything outside is a CRS or lat/lon-swap bug, not real data.
TLV_LON = (34.70, 34.90)
TLV_LAT = (31.95, 32.20)


# ── KML parsing ───────────────────────────────────────────────────────────────

def _parse_description(desc: str) -> dict[str, str]:
    """KML descriptions are ``field - value<BR/>field - value`` strings."""
    attrs: dict[str, str] = {}
    for chunk in re.split(r"<BR/>", desc):
        key, sep, value = chunk.partition(" - ")
        if sep:
            attrs[key.strip()] = value.strip()
    return attrs


def _parse_coords(block: str) -> list[list[float]]:
    """KML coordinates are whitespace-separated ``lon,lat[,alt]`` triples."""
    out: list[list[float]] = []
    for token in block.split():
        parts = token.split(",")
        if len(parts) >= 2:
            out.append([float(parts[0]), float(parts[1])])
    return out


def _parse_kml(path: Path) -> list[dict]:
    """Parse a municipal KML export into GeoJSON-ish features (polygons and points)."""
    if not path.exists():
        return []
    kml = path.read_text(encoding="utf-8")
    features: list[dict] = []

    for pm in re.findall(r"<Placemark\b.*?</Placemark>", kml, re.S):
        desc = re.search(r"<description>(.*?)</description>", pm, re.S)
        props = _parse_description(desc.group(1)) if desc else {}

        # A Placemark may hold several <Polygon>s, each with an outer ring plus holes.
        polygons: list[list[list[list[float]]]] = []
        for poly in re.findall(r"<Polygon>.*?</Polygon>", pm, re.S):
            outer = re.search(
                r"<outerBoundaryIs>.*?<coordinates>(.*?)</coordinates>.*?</outerBoundaryIs>",
                poly, re.S,
            )
            if not outer:
                continue
            rings = [_parse_coords(outer.group(1))]
            for inner in re.findall(
                r"<innerBoundaryIs>.*?<coordinates>(.*?)</coordinates>.*?</innerBoundaryIs>",
                poly, re.S,
            ):
                rings.append(_parse_coords(inner))
            rings = [r for r in rings if len(r) >= 4]
            if rings:
                polygons.append(rings)

        if polygons:
            geometry = (
                {"type": "Polygon", "coordinates": polygons[0]}
                if len(polygons) == 1
                else {"type": "MultiPolygon", "coordinates": polygons}
            )
        else:
            points: list[list[float]] = []
            for pt in re.findall(r"<Point>.*?<coordinates>(.*?)</coordinates>.*?</Point>", pm, re.S):
                points.extend(_parse_coords(pt))
            if not points:
                continue
            geometry = {"type": "Point", "coordinates": points[0]}

        features.append({"properties": props, "geometry": geometry})

    _assert_in_tel_aviv(features, path.parent.name)
    return features


def _iter_positions(geometry: dict):
    kind, coords = geometry["type"], geometry["coordinates"]
    if kind == "Point":
        yield coords
        return
    rings = coords if kind == "Polygon" else [r for p in coords for r in p]
    for ring in rings:
        yield from ring


def _assert_in_tel_aviv(features: list[dict], label: str) -> None:
    for feat in features:
        for lon, lat in _iter_positions(feat["geometry"]):
            if not (TLV_LON[0] <= lon <= TLV_LON[1] and TLV_LAT[0] <= lat <= TLV_LAT[1]):
                raise SystemExit(
                    f"[municipal] {label}: coordinate ({lon}, {lat}) falls outside the "
                    f"Tel Aviv envelope — suspected CRS or lat/lon-swap error."
                )


# ── Neighbourhood boundaries ──────────────────────────────────────────────────

def load_official_neighbourhoods() -> dict[int, dict]:
    """Map ``ms_shchuna`` -> {name, geom} for the official neighbourhood polygons."""
    out: dict[int, dict] = {}
    for feat in _parse_kml(NEIGHBOURHOODS_KML):
        raw = (feat["properties"].get("ms_shchuna") or "").strip()
        if not raw:
            continue
        out[int(raw)] = {
            "name": feat["properties"].get("shem_shchuna", "").strip(),
            "geom": shape(feat["geometry"]),
        }
    return out


def load_neighbourhood_config() -> list[dict]:
    """
    Derive the selectable-neighbourhood list from the municipal layer itself.

    There is no curated list any more: every polygon the municipality publishes
    becomes an entry, so the set of neighbourhoods, their names and their codes are
    whatever ``neighbourhoods/export.kml`` currently says — re-exporting the layer is
    the only thing needed to add, rename or drop one.

    ``id`` is built from ``ms_shchuna``, the layer's own stable primary key, rather
    than from a transliterated name: names are Hebrew, get re-spelled between exports,
    and transliterating them would mean inventing a mapping that no source file backs.
    Ordered by name so the frontend dropdown reads alphabetically (Hebrew sorts
    correctly by code point).
    """
    official = load_official_neighbourhoods()
    return [
        {
            "id": f"ms-{code}",
            "name": official[code]["name"],
            "official_ms_shchuna": [code],
        }
        for code in sorted(official, key=lambda c: (official[c]["name"], c))
    ]


def build_boundaries(neighbourhoods_config: list) -> dict[str, dict]:
    """
    Build the ``{neighbourhood id: GeoJSON geometry}`` mapping that
    ``build_dashboard_data.build_neighbourhoods`` consumes.

    Driven by the explicit ``official_ms_shchuna`` codes on each config entry — never
    by fuzzy name matching. Entries produced by :func:`load_neighbourhood_config` carry
    exactly one code each; the multi-code path stays because the layer splits some
    neighbourhoods into several polygons, and a caller merging them into one entry is
    a legitimate use of this function.
    """
    official = load_official_neighbourhoods()
    boundaries: dict[str, dict] = {}
    missing: list[str] = []

    for entry in neighbourhoods_config:
        geoms = []
        for code in entry.get("official_ms_shchuna") or []:
            match = official.get(code)
            if match is None:
                missing.append(f"{entry['id']} -> ms_shchuna {code}")
                continue
            geoms.append(match["geom"])
        if not geoms:
            continue
        boundaries[entry["id"]] = mapping(
            geoms[0] if len(geoms) == 1 else unary_union(geoms)
        )

    if missing:
        raise SystemExit(
            "neighbourhood config references ms_shchuna codes absent from "
            f"{NEIGHBOURHOODS_KML}: {', '.join(missing)}"
        )
    return boundaries


# ── Population ────────────────────────────────────────────────────────────────

def load_statistical_areas() -> list[dict]:
    """CBS statistical areas that actually carry a population figure."""
    areas = []
    for feat in _parse_kml(STATISTICAL_AREAS_KML):
        props = feat["properties"]
        total = (props.get("sum_pop_all") or "").strip()
        if not total:
            continue  # non-residential (park, port, interchange) — absent, not zero
        areas.append({
            "geom": shape(feat["geometry"]),
            "total": int(float(total)),
            "bands": {
                b: int(float(props[b])) if (props.get(b) or "").strip() else 0
                for b in AGE_BANDS
            },
            "ms_ezor": props.get("ms_ezor", ""),
        })
    return areas


def population_for(geom, areas: list[dict]) -> Optional[dict]:
    """
    Areal interpolation: apportion each statistical area's population by how much of
    that area falls inside ``geom``.

    Assumes population is spread uniformly within a single statistical area — the
    standard assumption, and reasonable here because CBS areas are drawn to be
    internally homogeneous and are small relative to a neighbourhood. Returns ``None``
    when nothing overlaps, so callers can tell "no data" from "zero residents".
    """
    total = 0.0
    bands = {b: 0.0 for b in AGE_BANDS}
    contributing = 0

    for area in areas:
        if not area["geom"].intersects(geom):
            continue
        area_size = area["geom"].area
        if area_size <= 0:
            continue
        share = area["geom"].intersection(geom).area / area_size
        if share <= 0.001:
            continue
        contributing += 1
        total += area["total"] * share
        for band, value in area["bands"].items():
            bands[band] += value * share

    if not contributing:
        return None

    return {
        "total": int(round(total)),
        "by_age": {b: int(round(v)) for b, v in bands.items()},
        "statistical_areas": contributing,
        "source": "CBS statistical areas 2022, Tel Aviv-Yafo municipality",
    }


# ── Destinations (civic / service POIs) ───────────────────────────────────────

# Each municipal layer names its own columns differently, so the facility name has to
# be looked up across every spelling the export set uses. Most specific first; the
# generic `shem` is last so a layer that has both keeps the specific one.
#   shem_mosad      schools, kindergartens, medical, other religious
#   facility_name   sports halls, stadiums, pools, sports fields, gyms
#   name_bet_cneset synagogues
#   beach_name      beaches
#   shem_thana      baby-care clinics
#   NAME            culture venues
#   shem            pharmacies, community centres, HMO clinics
# Deliberately excludes shem_rechov / Street / KTOVET — those are addresses, not names.
_NAME_FIELDS = [
    "shem_mosad", "facility_name", "name_bet_cneset", "beach_name",
    "shem_thana", "NAME", "shem",
]

# Optional descriptive subtype, e.g. "בית חולים לאשפוז כללי" / "מכבי" / "יסודי".
_TYPE_FIELDS = [
    "t_sug_mosad", "facility_sport", "t_shlav_chinuch", "t_kupa",
    "t_sug_rashi", "t_sug", "nosah", "SUG", "sug_mifal", "sug_esek",
]

# Only the culture layer publishes an English name; the rest are Hebrew-only.
_NAME_EN_FIELDS = ["NAME_ENG"]


def _pick(props: dict, candidates: list[str]) -> str:
    for key in candidates:
        value = (props.get(key) or "").strip()
        if value:
            return value
    return ""


def load_destinations() -> dict:
    """
    Read every ``destinations/<category>/export.kml`` point layer.

    The folder name *is* the Hebrew category label — these come straight from the
    municipal export set, so no translation table is invented here. Returns a compact
    structure: a category index plus a flat point list, keyed by category index to
    keep the JSON small enough to ship.
    """
    if not DESTINATIONS_DIR.exists():
        return {"categories": [], "points": []}

    categories: list[dict] = []
    points: list[list] = []

    for folder in sorted(p for p in DESTINATIONS_DIR.iterdir() if p.is_dir()):
        feats = _parse_kml(folder / "export.kml")
        if not feats:
            continue
        idx = len(categories)
        for feat in feats:
            geom = feat["geometry"]
            if geom["type"] == "Point":
                lon, lat = geom["coordinates"]
            else:
                # Some categories (sports fields, pools, beaches) are digitised as
                # footprint polygons rather than points. A destination only needs a
                # location to draw a marker and a desire line from, so collapse the
                # footprint to a representative interior point.
                pt = shape(geom).representative_point()
                lon, lat = pt.x, pt.y
            props = feat["properties"]
            # [category, lat, lon, name, subtype] — positional to keep the file small.
            points.append([
                idx,
                round(lat, 6),
                round(lon, 6),
                _pick(props, _NAME_FIELDS),
                _pick(props, _TYPE_FIELDS),
            ])
        categories.append({"id": idx, "name": folder.name, "count": len(feats)})

    return {"categories": categories, "points": points}
