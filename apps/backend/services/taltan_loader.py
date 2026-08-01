"""
Loader for the national transit-survey layers under ``data/taltan/``.

``stations/Stations.shp`` is the only layer read here. It is the survey layer behind
every ridership figure in the dashboard: alongside each physical stop it carries
observed **boardings** (``ON…`` / ``ONDAY``), scheduled **calls** (``DEP…`` /
``DEPDAY``), the **transfer share** (``PERSTRANS``), **average trips to destination**
(``TRIPTODEST``) and a **rider-type split** (``ADULT`` … ``OTHER``). GTFS has none of
this — it describes the timetable, not who actually boards — so this layer is what
makes stop-level demand analysis possible at all.

Two things about the source are worth knowing:

*Coordinates.* The geometry is ITM (EPSG:2039), but every record also carries
``LONGITUDEN``/``LATITUDEN`` — the same point in WGS-84, stored as integer
micro-degrees. Reading those costs one division and keeps this module off
``gis_loader._itm_transformer`` entirely, which is the only path on which the ~78 m
datum-shift bug documented there is reachable. Same reasoning as ``municipal_loader``
preferring the KML over the shapefile.

*Identity.* ``ID_SEKER`` is the public stop code (מק״ט) and is what joins to GTFS
``stops.stop_code``. ``ID``/``STOP_ID`` is an internal survey key whose numbering
collides with public codes — station ``ID`` 21482 is in בית גוברין, while the stop
whose *code* is 21482 is הגדוד העברי/שד' הר ציון in Tel Aviv. Never join on ``ID``.
"""

from __future__ import annotations

import re
from typing import Optional

import shapefile
from shapely.geometry import Point
from shapely.prepared import prep

from services.gis_loader import _find_shapefile

# Boardings and scheduled calls are both published per time band, with the band
# written into the field name (``ON0609`` = boardings between 06:00 and 09:00). The
# bands are read out of those names rather than listed here, so a survey edition that
# re-cuts them flows through without a code change.
_ON_BAND_RE = re.compile(r"^ON(\d{2})(\d{2})$")
_DEP_BAND_RE = re.compile(r"^DEP(\d{2})(\d{2})$")

# Rider-type columns, in the order the survey publishes them. These are column names,
# not values — the Hebrew labels shown in the UI live in the frontend.
RIDER_FIELDS = ["ADULT", "YOUTH", "ELDERLY", "STUDENT", "DISABLED", "OTHER"]

SOURCE_LABEL = "סקר תלת״ן — עליות ותדירות לפי תחנה"


def _bands(fields: list[str], pattern: re.Pattern) -> list[tuple[str, str]]:
    """``[('04-06', 'ON0406'), …]`` ordered by start hour, latest band last."""
    found = []
    for name in fields:
        m = pattern.match(name)
        if m:
            found.append((int(m.group(1)), f"{m.group(1)}-{m.group(2)}", name))
    return [(label, field) for _, label, field in sorted(found)]


def _num(value) -> Optional[float]:
    """
    Survey measures are blank for stations the survey never covered. pyshp hands those
    back as ``None``; they must stay ``None`` all the way to the frontend so "not
    surveyed" can never be rendered as "zero boardings".
    """
    if value is None or value == "":
        return None
    return float(value)


def _merge_direction_pair(group: list[dict]) -> dict:
    """
    Collapse records that describe the same physical stop from both directions.

    The survey stores one record per direction of travel, and a pair sits on identical
    coordinates under one code (e.g. code 17048, צומת חולון, ``DIRECTION`` + and −).
    Drawing both would put two markers on the same pixel and halve the apparent
    demand. Counts are additive so they sum; ratios (transfer share, trips to
    destination) are not, so they are averaged weighted by each direction's boardings
    — an unweighted mean would let a near-empty platform pull the figure as hard as a
    busy one.
    """
    if len(group) == 1:
        return group[0]

    merged = dict(group[0])
    merged["directions"] = sorted({d for g in group for d in g["directions"]})
    merged["ids"] = sorted(i for g in group for i in g["ids"])

    def total(key):
        vals = [g[key] for g in group if g[key] is not None]
        return round(sum(vals), 1) if vals else None

    def total_list(key):
        rows = [g[key] for g in group if g[key] is not None]
        if not rows:
            return None
        return [round(sum(col), 1) for col in zip(*rows)]

    def weighted(key):
        pairs = [(g[key], g["boardings_day"]) for g in group
                 if g[key] is not None and g["boardings_day"]]
        if not pairs:
            vals = [g[key] for g in group if g[key] is not None]
            return round(sum(vals) / len(vals), 2) if vals else None
        weight = sum(w for _, w in pairs)
        return round(sum(v * w for v, w in pairs) / weight, 2)

    merged["boardings_day"] = total("boardings_day")
    merged["departures_day"] = total("departures_day")
    merged["boardings_by_band"] = total_list("boardings_by_band")
    merged["departures_by_band"] = total_list("departures_by_band")
    merged["riders"] = total_list("riders")
    merged["transfer_pct"] = weighted("transfer_pct")
    merged["trips_to_dest"] = weighted("trips_to_dest")
    merged["routes_reported"] = max((g["routes_reported"] or 0) for g in group) or None
    merged["terminal"] = any(g["terminal"] for g in group)
    return merged


def load_stations(area) -> dict:
    """
    Read the survey stations that fall inside ``area`` (a shapely polygon in WGS-84 —
    the city limits, in practice; the layer is national and ~33.6k records).

    Returns ``{"bands", "rider_types", "source", "stations"}``. Band labels ship once
    at the top rather than per station, which is what keeps the generated JSON small
    enough to fetch in the browser.
    """
    path = _find_shapefile("Stations")
    inside = prep(area)

    with shapefile.Reader(path, encoding="utf-8") as sf:
        fields = [f[0] for f in sf.fields[1:]]
        on_bands = _bands(fields, _ON_BAND_RE)
        dep_bands = _bands(fields, _DEP_BAND_RE)
        if not on_bands:
            raise SystemExit(f"[taltan] {path} carries no ON<hhhh> boarding columns")
        if [b for b, _ in on_bands] != [b for b, _ in dep_bands]:
            raise SystemExit(
                f"[taltan] boarding and departure bands disagree: "
                f"{[b for b, _ in on_bands]} vs {[b for b, _ in dep_bands]}"
            )
        idx = {name: i for i, name in enumerate(fields)}

        by_key: dict[tuple, list[dict]] = {}
        for rec in sf.records():
            lon = rec[idx["LONGITUDEN"]] / 1e6
            lat = rec[idx["LATITUDEN"]] / 1e6
            if not inside.contains(Point(lon, lat)):
                continue

            code = str(rec[idx["ID_SEKER"]]).strip()
            band_values = [_num(rec[idx[f]]) for _, f in on_bands]
            dep_values = [_num(rec[idx[f]]) for _, f in dep_bands]
            riders = [_num(rec[idx[f]]) for f in RIDER_FIELDS if f in idx]

            station = {
                "ids": [int(rec[idx["ID"]])],
                "code": code,
                "name": (rec[idx["CORRECTPHS"]] or "").strip(),
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "street": (rec[idx["STREET"]] or "").strip(),
                "house": rec[idx["HOUSE"]] or 0,
                "directions": [(rec[idx["DIRECTION"]] or "").strip()],
                "terminal": bool(rec[idx["ENDSTATION"]]),
                "boardings_day": _num(rec[idx["ONDAY"]]),
                "departures_day": _num(rec[idx["DEPDAY"]]),
                "boardings_by_band": None if all(v is None for v in band_values) else [v or 0 for v in band_values],
                "departures_by_band": None if all(v is None for v in dep_values) else [v or 0 for v in dep_values],
                "riders": None if all(v is None for v in riders) else [v or 0 for v in riders],
                "transfer_pct": _num(rec[idx["PERSTRANS"]]),
                "trips_to_dest": _num(rec[idx["TRIPTODEST"]]),
                "routes_reported": None if rec[idx["ROUTES"]] is None else int(rec[idx["ROUTES"]]),
            }
            # Same code *and* same point = the two directions of one physical stop.
            # Two stops that merely share a code but sit on different corners stay
            # separate, which is why the coordinates are part of the key.
            by_key.setdefault((code, station["lat"], station["lon"]), []).append(station)

    stations = [_merge_direction_pair(group) for group in by_key.values()]
    stations.sort(key=lambda s: (-(s["boardings_day"] or 0), s["code"]))

    return {
        "bands": [b for b, _ in on_bands],
        "rider_types": [f for f in RIDER_FIELDS if f in idx],
        "source": SOURCE_LABEL,
        "stations": stations,
    }


def summarise(stations: list[dict], band_count: int, rider_count: int) -> dict:
    """
    City-wide (or any subset's) totals, summed from the station records themselves so
    the headline figure and the map can never drift apart.

    ``surveyed`` is reported next to ``count`` because the two differ: a station with
    no survey coverage contributes nothing to the totals, and a reader comparing
    "boardings per station" needs to know which denominator is real.
    """
    surveyed = [s for s in stations if s["boardings_day"] is not None]
    bands = [0.0] * band_count
    riders = [0.0] * rider_count
    for s in surveyed:
        for i, v in enumerate(s["boardings_by_band"] or []):
            bands[i] += v
        for i, v in enumerate(s["riders"] or []):
            riders[i] += v

    return {
        "count": len(stations),
        "surveyed": len(surveyed),
        "boardings_day": round(sum(s["boardings_day"] for s in surveyed), 1),
        "departures_day": round(sum(s["departures_day"] or 0 for s in surveyed), 1),
        "boardings_by_band": [round(v, 1) for v in bands],
        "riders": [round(v, 1) for v in riders],
    }
