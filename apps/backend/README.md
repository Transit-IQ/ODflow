# ODFlow — Python Backend

A FastAPI-based backend that loads and analyzes GIS/GTFS layers from the `../../data/` directory,
used for **local, interactive** exploration and development. It is a companion to
`scripts/build_dashboard_data.py`, the one-time pipeline that pre-computes everything the deployed
static dashboard actually needs — see below for when to use which.

This is the backend half of the [ODFlow monorepo](../../README.md); see the root README for how it
relates to `apps/frontend/`.

## Project Structure

```
<repo root>/
├── apps/
│   ├── frontend/          ← Vite frontend (HTML/JS/CSS) — static site, fetches only public/data/*.json
│   └── backend/            ← This folder (Python)
│       ├── main.py              FastAPI app — live/interactive API, used for local dev only
│       ├── paths.py             single source of truth for repo-relative filesystem layout
│       ├── routers/
│       ├── services/            shared loaders, used by both main.py and the pipeline:
│       │                          gtfs_loader (timetable), gis_loader (ITM shapefiles),
│       │                          municipal_loader (city KML layers), taltan_loader (stop survey)
│       ├── scripts/
│       │   └── build_dashboard_data.py   ← run this to (re)generate apps/frontend/public/data/*.json
│       └── requirements.txt
└── data/                   ← raw GTFS files + shapefiles (see ../../data/README.md), gitignored
```

## Two ways to run this backend

### 1. Static dashboard data pipeline (what GitHub Pages needs)

GitHub Pages only serves static files — it cannot run `main.py`. Run the pipeline once locally
whenever the raw files in `../../data/` change, and commit the resulting JSON in
`../frontend/public/data/`:

```bash
cd apps/backend
python3 -m venv venv        # first time only
source venv/bin/activate
pip install -r requirements.txt
python scripts/build_dashboard_data.py
```

This takes a minute or two (it parses the full nationwide GTFS `stop_times.txt`/`shapes.txt` and the
BUS_SPEED shapefile) and prints a summary of everything it wrote.

#### Choosing the city

Most of what this pipeline reads is **national**: the MOT GTFS feed, the תלת״ן station survey and
BUS_SPEED all cover the whole country. What makes the output a *city's* dashboard is the municipal
boundary everything is clipped to. So switching city is mostly switching that one polygon:

```bash
ODFLOW_CITY=rahat python scripts/build_dashboard_data.py
```

`ODFLOW_CITY` defaults to `tel-aviv`. The known cities and their data directories are listed in
[`paths.py`](paths.py) — each city owns a directory holding only the municipal layers it publishes,
while national files stay where they are and are shared.

| City | Directory | Municipal layers present |
|---|---|---|
| `tel-aviv` | `data/municipal/` | boundary, neighbourhoods, statistical areas + population, 16 destination categories |
| `rahat` | `data/rahat/` | boundary, neighbourhoods *(both provisional — see below)* |

Missing municipal layers are **not** fatal. A city with no destination or statistical-area layer
still gets a complete stop, speed and survey picture, because those come from the national files;
the pipeline says what it could not find and the corresponding panels stay empty.

Rahat's boundary and neighbourhoods are generated from OpenStreetMap by
[`scripts/build_rahat_city_data.py`](scripts/build_rahat_city_data.py), because no official
municipal boundary is published through Israel's open-data channels. **They are provisional.** When
the municipality supplies their own files, drop them at the same paths and nothing else changes:

```bash
python scripts/build_rahat_city_data.py
```

That script also writes `roads.geojson` from Overpass, which `build_roads.py` cannot do for Rahat —
`build_roads.py` needs a national Geofabrik extract at `data/openStreetMap/` that this checkout does
not contain. `roads.geojson` is per-city and feeds the junction layer, so a stale copy from another
city would place that city's junctions on this city's map; the pipeline now checks for that and
refuses rather than overwriting.

### 2. Live API server (local development / ad-hoc querying only)

```bash
cd apps/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Useful for exploring the data interactively (`/docs`) or prototyping new metrics before adding them
to the pipeline. The deployed dashboard does not talk to this server.

## API Base URL (dev server only)

`http://localhost:8000`
