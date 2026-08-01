# ODFlow — GIS & Configuration Data

This folder contains all raw inputs consumed by `../apps/backend/scripts/build_dashboard_data.py`
(the static-dashboard pipeline) and `../apps/backend/` (the interactive dev API). It is gitignored
(besides this README) — populate it locally per the instructions below. This is the only README
under `data/`; every source folder is documented in its own section here.

## Contents

| Path | Format | Used for |
|---|---|---|
| `gtfs/agency.txt`, `routes.txt`, `trips.txt`, `stops.txt`, `shapes.txt`, `stop_times.txt` | GTFS text | Bus lines, stops, shapes, trip frequency (see below) |
| `hazav/BUS_SPEED/` | Shapefile (ITM) | Per-segment bus speed by day-of-week × time-of-day, fields `d_1_h_1`…`d_5_h_7` (35 values/segment, 713,943 segments) |
| `municipal/גבול העיר/` | Shapefile (ITM) | Tel Aviv city-limits polygon, used to clip the speed segments |
| `taltan/stations/` | Shapefile (ITM + WGS-84 columns) | **33,661 surveyed stops with boardings, calls and rider mix** — the only ridership source in the project, see below |
| `taltan/NatazEX_shape_202605/`, `taltan/fcl_area_shape_202605/` | Shapefile (ITM) | Bus-lane segments and terminal/depot sites. Present in the source set; **not read by the pipeline yet** |
| `municipal/neighbourhoods/` | KML + Shapefile | **71 official municipal neighbourhood polygons** — the sole source of the selectable-neighbourhood list, see below |
| `municipal/אזורים סטטיסטים/` | KML + Shapefile | **184 CBS statistical areas with 2022 population** — see below |
| `municipal/destinations/<category>/` | KML + Shapefile | **16 civic/service POI layers, 2,395 points** — see below |

## Coordinate System

GTFS files are already WGS-84. `hazav/BUS_SPEED/` and `municipal/גבול העיר/` are read as ITM
(EPSG:2039) shapefiles and converted via `backend/services/gis_loader.itm_to_wgs84` — BUS_SPEED
segments are clipped against the city polygon in ITM space, so both must stay in ITM.

Every other municipal layer is read from its **`export.kml`**, which is WGS-84 by definition and
needs no conversion. `services/municipal_loader.py` deliberately never touches the ITM transformer. This is the safer of the two sources: the ~78 m
offset bug documented in `gis_loader.py` is only reachable through the ITM path.

`taltan/stations/` gets the same treatment by a different route: its geometry is ITM, but every
record also carries `LONGITUDEN`/`LATITUDEN` — the same point in WGS-84 as integer micro-degrees —
so `taltan_loader.py` divides by 1e6 and likewise never touches the transformer.

**Folder names are never hardcoded.** `gis_loader._find_shapefile()` and
`municipal_loader._find_layer_kml()` locate a layer by searching `data/**` for its ASCII shapefile
stem (`BUS_SPEED`, `City Limits`, `Stations`, `Neighbourhoods`…). That is why moving BUS_SPEED from
`municipal/` to `hazav/` needed no code change, and why the Hebrew-named folders survive macOS
storing them in a different Unicode normalisation (NFD) than a literal written in a `.py` file (NFC).

## `gtfs/` — Israel MOT GTFS feed

Download the Israel Ministry of Transport GTFS feed and extract these `.txt` files directly into
`data/gtfs/`. They are already WGS-84 and need no conversion.

| File | Size | Description |
|------|------|-------------|
| `agency.txt` | ~3 KB | Transit operators (Dan, Egged, etc.) |
| `routes.txt` | ~865 KB | All bus/rail route definitions |
| `trips.txt` | ~16 MB | Trip → shape_id mappings |
| `stops.txt` | ~4.8 MB | Stop locations (name, lat, lon) |
| `shapes.txt` | ~211 MB | GPS traces for each route shape (**required**) |
| `stop_times.txt` | ~458 MB | Stop sequences per trip (optional, needed for `/route/{id}/stops`) |

GTFS describes the timetable, not ridership — boardings come from `taltan/stations/` (see below), and
the two are joined on `stops.stop_code`, never on `stop_id`.

After copying the files in, restart the backend so it re-indexes them:

```bash
cd apps/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Indexing runs in the background; check progress at **http://127.0.0.1:8000/gtfs/status**. Once
`ready: true`, all endpoints are live at **http://127.0.0.1:8000/docs**.

## `municipal/` — Tel Aviv-Yafo municipal open data

**Source**: the municipality's "עיריית תל אביב" GIS export set. Every layer there is published twice,
as an ITM (EPSG:2039) shapefile *and* as a WGS-84 KML, plus an `export.xlsx` attribute table. We read
the KML.

**Encoding**: UTF-8 throughout. Every shapefile in the source set ships a `.cpg` declaring `utf-8`,
and Hebrew attribute values were verified to round-trip cleanly (`גלילות`, `התקוה`, `כרם התימנים`).

**There are no pre-generated intermediates.** `municipal_loader.py` parses each layer's
`export.kml` at pipeline time, so every file under `data/` is a raw source file as delivered.

### `neighbourhoods/`

71 official neighbourhood polygons keyed by `ms_shchuna`, with Hebrew names in `shem_shchuna`.

**This layer defines the dashboard's neighbourhoods outright.** `municipal_loader.load_neighbourhood_config()`
turns every polygon into one selectable entry — `id` is `ms-<ms_shchuna>` (the layer's own primary
key, so no transliteration of Hebrew names is invented anywhere), `name` is `shem_shchuna`, and the
`bbox` and `center` reported to the frontend are measured off the polygon (its bounds, and a
guaranteed-interior representative point). Adding, renaming or dropping a neighbourhood means
re-exporting this layer and re-running the pipeline; nothing is written down by hand.

It replaces **both** of the previous approximations:

- the hand-maintained `neighbourhoods.json` config, a fixed subset of 19 areas with hand-drawn `bbox`
  rectangles that were always noticeably larger than the area they represented, and in one case
  didn't overlap it at all; and
- the OpenStreetMap/Nominatim polygons that used to live in `neighbourhood_boundaries.json`.

**The OSM dependency is gone**, and with it OSM's ODbL attribution requirement for boundary data.
(The CartoDB basemap tiles are still OSM-derived, so the attribution note below still applies to
those.) Both `neighbourhoods.json` and `neighbourhood_boundaries.json` have been deleted.

Every entry therefore carries a real boundary, and stop-to-neighbourhood matching is always a
point-in-polygon test — the bbox only pre-filters candidate stops. `build_boundaries()` still joins
on explicit `ms_shchuna` codes rather than fuzzy names, and still accepts several codes per entry,
which is what a caller would need to merge the neighbourhoods this layer splits north/south
(e.g. 30+31, 33+35).

### `אזורים סטטיסטים/`

184 CBS (למ״ס) statistical areas, 2022, carrying `sum_pop_all` plus nine age bands
(`g0to9` … `g80up`). 162 are residential; the other 22 are parks, port and interchange areas and
carry no population — they are treated as *absent*, not as zero.

Total across the layer is 463,569 residents, which matches Tel Aviv-Yafo's published 2022 figure.

Population per neighbourhood is derived by **areal interpolation** in
`services/municipal_loader.population_for()`: each statistical area contributes population in
proportion to how much of it falls inside the neighbourhood polygon. This assumes uniform density
within a single statistical area — the standard assumption, and a reasonable one here since CBS
areas are drawn to be internally homogeneous and are small relative to a neighbourhood. 63 of the 71
neighbourhoods come out with a population; the other 8 (the port, the fairgrounds, two parks, the
university and adjacent employment/business zones) overlap no residential statistical area and
report *absent* rather than zero.

### `destinations/`

16 civic/service point layers, 2,395 features total. **The folder name is the Hebrew category
label** — it comes straight from the municipal export set, so no translation table is invented:

| | | | |
|---|---|---|---|
| גני ילדים תשפו 557 | בתי כנסת 484 | מגרשי ספורט 391 | בתי ספר תשפו 218 |
| מוסדות תרבות 136 | בתי מרקחת 122 | אולמות ספורט 114 | מכוני כושר 78 |
| מוסדות קהילה 80 | קופות חולים 63 | מוסדות רפואה 47 | בריכות שחיה 42 |
| מוסדות דת אחרים 29 | טיפות חלב 15 | חופים 13 | אצטדיונים 6 |

Every layer names its columns differently, so `municipal_loader._NAME_FIELDS` maps each spelling of
the facility name (`shem_mosad`, `facility_name`, `name_bet_cneset`, `beach_name`, `shem_thana`,
`NAME`, `shem`). It deliberately excludes `shem_rechov` / `Street` / `KTOVET`, which are *addresses*,
not names. 33 features (1.4%) have no name in the source — mostly unnamed sports pitches; they render
as `(ללא שם)` rather than being dropped.

A few categories (sports fields, pools, beaches) are digitised as footprint **polygons** rather than
points; those are collapsed to a representative interior point, since a destination only needs a
location to anchor a marker.

Output goes to `destinations.json` (~131 KB), fetched lazily the first time the layer is toggled —
the same pattern as `neighbourhood_routes.json`, to keep initial page load small.

**Attribution**: the CartoDB basemap tiles the app uses are OSM-derived. The current UI disables
Leaflet's attribution control (`attributionControl: false` in `apps/frontend/src/core/map.js`) — before any
public/production deployment, re-enable attribution or add equivalent credit; CartoDB's and OSM's
usage terms require it.

## `taltan/` — national transit survey

**Source**: the תלת״ן survey export set (folders carry their `202605` vintage). Three layers ship;
only `stations/` is read so far.

### `stations/Stations.shp`

33,661 surveyed stops nationwide. **This is the only ridership data in the project** — GTFS
describes the timetable, not who boards — and it is what the stop layer and the stop panel are built
from. Per station:

| Columns | Meaning |
|---|---|
| `ONDAY`, `ON0406`…`ON2404` | Boardings per day, total and per time band |
| `DEPDAY`, `DEP0406`…`DEP2404` | Scheduled calls per day, total and per band |
| `ADULT`, `YOUTH`, `ELDERLY`, `STUDENT`, `DISABLED`, `OTHER` | Rider mix, in boardings/day |
| `PERSTRANS` | Share of boardings that are transfers (% נסיעות מעבר) |
| `TRIPTODEST` | Average number of trips taken to reach a destination |
| `ROUTES` | How many routes serve the stop (not *which* — those come from GTFS) |
| `ID_SEKER`, `CORRECTPHS`, `STREET`/`HOUSE`, `NBR_NAME` | Public stop code, name, address, neighbourhood |

The time bands are parsed **out of the column names** (`ON0609` → `06-09`), not listed in code, so a
survey edition that re-cuts them flows through without an edit.

**Join key.** `ID_SEKER` is the public stop code (מק״ט) and is what matches GTFS `stops.stop_code`.
`ID`/`STOP_ID` is an internal survey key whose numbering *collides* with public codes — station `ID`
21482 is in בית גוברין, while the stop whose **code** is 21482 is הגדוד העברי/שד' הר ציון in Tel
Aviv. Joining on `ID` would silently attach the wrong city's ridership to a Tel Aviv stop.

**Not surveyed ≠ zero.** Of the 1,086 stations inside the city limits, 957 carry boardings; the rest
were never surveyed and are stored as `null` end-to-end, drawn as a hollow ring and labelled
"ללא נתוני סקר". They are never rendered as a zero, and they are excluded from the denominators.

**Direction pairs are merged.** The survey stores one record per direction of travel, and a pair
sits on identical coordinates under one code (e.g. code 17048, צומת חולון, `DIRECTION` + and −).
`taltan_loader._merge_direction_pair()` collapses them — counts sum, while ratios (`PERSTRANS`,
`TRIPTODEST`) are averaged **weighted by boardings**, since an unweighted mean would let a
near-empty platform pull the figure as hard as a busy one. 1,086 records → 1,069 stops.

**Rider shares are normalised against the reported segments,** whose sum is a few percent below
`ONDAY` (246.1 vs 216.4 at code 21482). Dividing by `ONDAY` instead would quietly shave that gap off
every station's mix.

City totals as generated: **422,398 boardings/day** across 957 surveyed stops.

### `NatazEX_shape_202605/` and `fcl_area_shape_202605/`

Bus-lane segments (1,040 features: operating hours per weekday/Friday/Saturday, lane counts,
permitted users) and terminal/depot sites (305 polygons: bays, parking, Rav-Kav machines, operator).
Both are present and readable; **nothing in the pipeline consumes them yet.**

## Missing data — dashboard sections currently hidden

The following dashboard sections were removed from the frontend (rather than shown with fabricated
numbers) because nothing in this folder backs them. Add the corresponding file(s) below and re-run
the pipeline to bring each one back:

### 1. Station Analytics panel — RESTORED
The UI previously showed daily boardings, stops served and a passenger-type breakdown per bus stop,
all from an empty, hardcoded `STATIONS = []` array. Now backed by `taltan/stations/` (see above) and
rendered by `apps/frontend/src/layers/stops.js` plus the `StopPanel` component.

The survey turned out to carry exactly the buckets this section asked for
(`04-06 … 24-04`), the rider types, and the transfer share — and the join is on `stop_code` as
predicted: `stop_id` here is a feed-internal key regenerated on every GTFS revision, and only 1 of
35,178 rows has `stop_id == stop_code`. 961 of the city's 1,069 stops match a GTFS line list.

### 2. Destination layer — RESTORED (as service destinations, not employment)
The "מוקדי תעסוקה ומסחר" layer pointed at `D.dests`, which was never populated by any fetch. Now
backed by `municipal/destinations/` and rendered as **מוקדי שירות ותעסוקה** with per-category filters.

**Why the relabel:** the 16 layers are *civic and service* facilities. The export set contains no
jobs, floor-area or business-registry data, so presenting them as employment data would repeat
exactly the failure mode this section exists to prevent. The panel says what the data is.

Still outstanding: **צירי יעד עיקריים** (desire lines). Drawing them needs origin→destination flows.
The station survey added in §1 gives boardings *at* a stop and an average trip count to destination
(`TRIPTODEST`), but no origin→destination pairs, so the desire lines still have nothing to draw.

### 3. "Bus vs. car" travel-time KPI — STILL MISSING
The KPI card claiming a 2.6× / 39-vs-15-minute gap was a hardcoded string in `index.html` with no
backing computation. Scheduled bus travel time is derivable from GTFS `stop_times.txt`, but there is
still no **driving time** source to compare against, and the municipal export set does not contain
one — the only traffic-related item there is a signal-operations PDF, which is narrative, not data.
Needs a road-network travel-time matrix or API-sourced driving durations.

### 4. Neighbourhood population — RESTORED
Was a hardcoded "~13,000 residents" string in the HaTikva flow-layer popup. Now derived from
`municipal/statistical_areas.geojson` (CBS 2022) and rendered per-neighbourhood in the sidebar. The
real HaTikva figure is **10,040**, not 13,000.

## Accessing raw data during development

The interactive backend (`../apps/backend/`, `uvicorn main:app --reload`) can query these files directly
via `/gis/*`, `/gtfs/*`, and `/layers/*` for exploration. The deployed dashboard does not use it —
see `../apps/frontend/README.md`.
