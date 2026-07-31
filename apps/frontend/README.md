# ODFlow Dashboard

The ODFlow Dashboard visualizes public transportation data to identify demand gaps and highlight transit performance.
Currently, it demonstrates a pilot project for the HaTikva neighborhood in South-East Tel Aviv.

This is the frontend half of the [ODFlow monorepo](../../README.md); see the root README for how it
relates to `apps/backend/`.

## Architecture

The dashboard is a **static site** — it does not call any backend API at runtime. All transit data
analysis happens once, offline, via the Python pipeline in `../backend/scripts/build_dashboard_data.py`,
which reads the raw GTFS/GIS files in `../../data/` and writes pre-computed JSON into `public/data/`. The
frontend only ever fetches those static JSON files. This is what makes the site deployable to GitHub
Pages, which cannot run a backend server.

```
data/                                    ← raw GTFS + shapefiles (see ../../data/README.md)
apps/backend/scripts/build_dashboard_data.py
        │  (run once locally, whenever data/ changes)
        ▼
apps/frontend/public/data/*.json         ← generated, static
        │  (fetched by the browser)
        ▼
apps/frontend/public/js/*.js             ← renders the map/UI from that JSON
```

If you change anything under `../../data/`, re-run the pipeline before rebuilding/deploying:

```bash
cd ../backend
source venv/bin/activate
python scripts/build_dashboard_data.py
```

## Project Structure

- `public/`: Contains the frontend assets:
  - `css/`: Styling for the application.
  - `js/`: Application logic (`app.js`), neighbourhood route browser (`neighbourhood.js`), shared agency labels (`agencies.js`).
  - `data/`: Generated JSON consumed by the frontend (see below). Do not hand-edit — regenerate via the pipeline.
- `index.html`: The main entry point of the dashboard.
- `vite.config.js`: Configuration for the Vite bundler.

### Generated data files (`public/data/`)

| File | Contents |
|---|---|
| `border.json` | Tel Aviv city-limits polygon (GeoJSON) |
| `speeds.json` | Bus speed segments clipped to the city, each with a 35-value (5 days × 7 periods) speed array |
| `kpis.json` | Derived KPIs: segment count, average-speed-by-period profile |
| `neighbourhoods.json` | Lightweight index of the 19 selectable neighbourhoods (id/name/bbox/**boundary**/route_ids) — `boundary` is a real polygon for the 13 areas that have one, see `../../data/README.md` |
| `neighbourhood_routes.json` | Shared route lookup (shape + stops) referenced by `neighbourhoods.json`, fetched lazily on first use |

The "קווי אוטובוס בשכונה" sidebar list is driven entirely by whichever neighbourhood is selected in
the dropdown at the top (defaults to HaTikva on load) — there is no separate hardcoded route list.

## Development

The project uses [Vite](https://vitejs.dev/) as its development server and build tool. It relies on [Leaflet](https://leafletjs.com/) for rendering interactive maps.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed, and that `public/data/*.json` has already been generated (see Architecture above).

### Setup and Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the provided local URL in your browser to view the dashboard.

### Building for Production
To build the optimized static assets:
```bash
npm run build
```
The output will be generated in the `dist/` directory.

## Deployment
The project is configured to easily deploy to GitHub Pages using the `gh-pages` package.

To deploy the current code, simply run:
```bash
npm run deploy
```
This command will automatically build the project and push the `dist/` folder to the `gh-pages` branch on GitHub.

## Features
- **Speed Heatmaps**: Visualizes bus speeds across road segments at different times of the day.
- **Congestion Analysis**: Highlights bottlenecks where average bus speeds drop below 15 km/h.
- **Neighbourhood Route Browser**: Pick any of 19 Tel Aviv neighbourhoods (defaults to HaTikva) and see its real bus routes — the boundary drawn on the map and the "קווי אוטובוס בשכונה" list both update together, and clicking a route draws its path/stops. The top KPI tiles (avg speed / % congested / segment count) are scoped to whichever neighbourhood is selected — a point-in-polygon test against its real boundary where one exists, its bbox otherwise — and fall back to city-wide numbers when no neighbourhood is selected.
- **Dark & Light Mode**: Adapts dynamically based on user preference.

### Features removed pending data (see `../../data/README.md`)
Station-level ridership analytics, employment/destination map layers, and the bus-vs-car travel-time
comparison were removed from the UI because no source data for them exists in `../../data/`. See the data
README for exactly what's needed to bring each one back.
