# ODFlow — GIS & Configuration Data

This folder contains all raw inputs consumed by `../apps/backend/scripts/build_dashboard_data.py`
(the static-dashboard pipeline) and `../apps/backend/` (the interactive dev API). It is gitignored
(besides this README and `gtfs/README.md`) — populate it locally per the instructions below.

## Contents

| Path | Format | Used for |
|---|---|---|
| `gtfs/agency.txt`, `routes.txt`, `trips.txt`, `stops.txt`, `shapes.txt`, `stop_times.txt` | GTFS text | Bus lines, stops, shapes, trip frequency (see `gtfs/README.md`) |
| `municipal/BUS_SPEED/` | Shapefile (ITM) | Per-segment bus speed by day-of-week × time-of-day, fields `d_1_h_1`…`d_5_h_7` (35 values/segment, 713,943 segments) |
| `municipal/גבול העיר/` | Shapefile (ITM) | Tel Aviv city-limits polygon, used to clip the speed segments |
| `neighbourhoods.json` | JSON | Config: the 19 selectable neighbourhoods (id, Hebrew name, center, bbox, `official_ms_shchuna`) — an input parameter, not derived data |
| `municipal/neighbourhoods/` | KML + Shapefile | **71 official municipal neighbourhood polygons** — see below |
| `municipal/אזורים סטטיסטים/` | KML + Shapefile | **184 CBS statistical areas with 2022 population** — see below |
| `municipal/destinations/<category>/` | KML + Shapefile | **16 civic/service POI layers, 2,395 points** — see below |

## Coordinate System

GTFS files are already WGS-84. `municipal/BUS_SPEED/` and `municipal/גבול העיר/` are read as ITM
(EPSG:2039) shapefiles and converted via `backend/services/gis_loader.itm_to_wgs84` — BUS_SPEED
segments are clipped against the city polygon in ITM space, so both must stay in ITM.

Every other municipal layer is read from its **`export.kml`**, which is WGS-84 by definition and
needs no conversion. `services/municipal_loader.py` deliberately never touches the ITM transformer. This is the safer of the two sources: the ~78 m
offset bug documented in `gis_loader.py` is only reachable through the ITM path.

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

These replace **both** of the previous approximations:

- the hand-drawn `bbox` rectangles in `neighbourhoods.json`, which were always noticeably larger than
  the area they represented and in one case didn't overlap it at all; and
- the OpenStreetMap/Nominatim polygons that used to live in `neighbourhood_boundaries.json`.

**The OSM dependency is gone**, and with it OSM's ODbL attribution requirement for boundary data.
(The CartoDB basemap tiles are still OSM-derived, so the attribution note below still applies to
those.) `neighbourhood_boundaries.json` has been deleted.

The join is driven by the explicit `official_ms_shchuna` codes in `neighbourhoods.json` — never by
fuzzy name matching. 14 of the 19 dashboard areas now resolve to an official polygon (up from 13
under OSM; Jaffa is the gain). Two of them merge a pair of official polygons, because the municipal
layer splits them north/south: `tzafon_yashan` = 30+31, `tzafon_hadash` = 33+35.

The remaining 5 have an empty code list because no official municipal polygon exists for them —
`merkaz` (city centre, not a gazetted neighbourhood), `rothschild` (a boulevard), `azrieli` (a retail
complex), and the two intentionally-informal `*_border` zones outside the city limits. These still
fall back to their `bbox` rectangle, exactly as before.

### `אזורים סטטיסטים/`

184 CBS (למ״ס) statistical areas, 2022, carrying `sum_pop_all` plus nine age bands
(`g0to9` … `g80up`). 162 are residential; the other 22 are parks, port and interchange areas and
carry no population — they are treated as *absent*, not as zero.

Total across the layer is 463,569 residents, which matches Tel Aviv-Yafo's published 2022 figure.

Population per neighbourhood is derived by **areal interpolation** in
`services/municipal_loader.population_for()`: each statistical area contributes population in
proportion to how much of it falls inside the neighbourhood polygon. This assumes uniform density
within a single statistical area — the standard assumption, and a reasonable one here since CBS
areas are drawn to be internally homogeneous and are small relative to a neighbourhood. Population is
only computed where an official polygon exists; apportioning against a hand-drawn rectangle would
produce a confident-looking number with nothing behind it.

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
Leaflet's attribution control (`attributionControl: false` in `app.js`) — before any
public/production deployment, re-enable attribution or add equivalent credit; CartoDB's and OSM's
usage terms require it.

## Missing data — dashboard sections currently hidden

The following dashboard sections were removed from the frontend (rather than shown with fabricated
numbers) because nothing in this folder backs them. Add the corresponding file(s) below and re-run
the pipeline to bring each one back:

### 1. Station Analytics panel (per-stop boardings & demographics)
The UI previously showed daily validations (תיקופים), stops served, and a passenger-demographic
breakdown per bus stop — all from an empty, hardcoded `STATIONS = []` array. Needed:
- A per-stop ridership file (e.g. `data/ridership/stations.csv`), keyed by **`stop_code`** — *not*
  `stop_id`. In this feed `stop_id` is a feed-internal sequential key (1, 2, 3…) regenerated on every
  GTFS revision, while `stop_code` is the stable national station number (מספר תחנה) that MOT/Rav-Kav
  ridership is published against. Only 1 of 35,178 rows has `stop_id == stop_code`, so getting this
  backwards joins almost nothing and fails silently as a panel of zeros. Note 35,178 stops share
  34,099 distinct `stop_code`s (platforms/parent stations), so aggregate rather than assume 1:1.
  With: daily validations count, daily boarding count, hourly boarding counts for
  the buckets `04-06, 06-09, 09-12, 12-15, 15-19, 19-24, 24-04`, and a passenger-type breakdown
  (adult / elder / youth / disabled / student / other), plus % of trips that are pass-through vs.
  origin/destination at that stop.

### 2. Destination layer — RESTORED (as service destinations, not employment)
The "מוקדי תעסוקה ומסחר" layer pointed at `D.dests`, which was never populated by any fetch. Now
backed by `municipal/destinations/` and rendered as **מוקדי שירות ותעסוקה** with per-category filters.

**Why the relabel:** the 16 layers are *civic and service* facilities. The export set contains no
jobs, floor-area or business-registry data, so presenting them as employment data would repeat
exactly the failure mode this section exists to prevent. The panel says what the data is.

Still outstanding: **צירי יעד עיקריים** (desire lines). Drawing them needs an origin→destination
flow, which requires the ridership data in §1 — the POI layer alone gives destinations but no trips.

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
