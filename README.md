# ODFlow

ODFlow visualizes public transportation data to identify demand gaps and highlight transit
performance. It currently demonstrates a pilot project for the HaTikva neighborhood in
South-East Tel Aviv.

This repo is a monorepo containing both halves of the project:

```
.
├── apps/
│   ├── frontend/   ← Vite static dashboard, component-based ES modules under
│   │                  src/ — deployed to GitHub Pages; see apps/frontend/README.md
│   └── backend/    ← FastAPI service (Python) — local dev API + the offline data pipeline
│                      see apps/backend/README.md
└── data/           ← raw GTFS + shapefiles the backend reads from, gitignored (see data/README.md)
```

## How the pieces fit together

The deployed dashboard is a **static site** — GitHub Pages can't run a backend, so it never calls
one at runtime. Instead:

1. Raw GTFS/GIS files live locally in `data/` (not committed — see [`data/README.md`](data/README.md)
   for what's needed and where it comes from).
2. `apps/backend/scripts/build_dashboard_data.py` reads `data/` once, offline, and writes
   pre-computed JSON into `apps/frontend/public/data/`.
3. `apps/frontend` fetches only that generated JSON at runtime — no live API calls.

`apps/backend`'s FastAPI app (`main.py`) is a second, independent way to use the same `data/` —
a live, interactive API for local exploration (`/docs`) and prototyping new metrics before they're
added to the pipeline. The deployed dashboard never talks to it.

## Getting started

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

See [`apps/frontend/README.md`](apps/frontend/README.md) for the build/deploy commands.

### Backend

```bash
cd apps/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

See [`apps/backend/README.md`](apps/backend/README.md) for the data pipeline vs. live-API distinction.

Both apps read from the same `data/` folder at the repo root; populate it first per
[`data/README.md`](data/README.md).

## Deployment

The frontend deploys to GitHub Pages from `apps/frontend`:

```bash
cd apps/frontend
npm run deploy
```

This builds the site and pushes `apps/frontend/dist/` to the `gh-pages` branch. The backend is not
deployed anywhere — it's a local development and data-pipeline tool only.
