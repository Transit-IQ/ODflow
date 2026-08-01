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
