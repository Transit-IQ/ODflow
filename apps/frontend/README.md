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
  - `js/`: Application logic (`app.js`), neighbourhood route browser (`neighbourhood.js`), stop layer + stop-detail panel (`stops.js`), shared agency labels (`agencies.js`).
  - `data/`: Generated JSON consumed by the frontend (see below). Do not hand-edit — regenerate via the pipeline.
- `index.html`: The main entry point of the dashboard.
- `vite.config.js`: Configuration for the Vite bundler.

### Generated data files (`public/data/`)

| File | Contents |
|---|---|
| `border.json` | Tel Aviv city-limits polygon (GeoJSON) |
| `speeds.json` | Bus speed segments clipped to the city, each with a 35-value (5 days × 7 periods) speed array |
| `kpis.json` | Derived KPIs: segment count, average-speed-by-period profile, and city-wide ridership totals (fetched on page load so the boardings tile has a figure before the stop layer is opened) |
| `stops.json` | The city's 1,069 survey stops: boardings/day and by time band, scheduled calls, transfer share, rider mix, the GTFS lines calling there, and the neighbourhood each stands in. Fetched lazily on first toggle of the תחנות ועליות layer |
| `neighbourhoods.json` | Index of the 71 selectable neighbourhoods (id/name/bbox/**boundary**/population/route_ids) — every one is an official municipal polygon, see `../../data/README.md` |
| `neighbourhood_routes.json` | Shared route lookup (shape + stops) referenced by `neighbourhoods.json`, fetched lazily on first use |

The "קווי אוטובוס בשכונה" sidebar list is driven entirely by whichever neighbourhood is selected in
the dropdown at the top (no neighbourhood selected on load) — there is no separate hardcoded route
list, and the dropdown itself is filled from `neighbourhoods.json`.

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
- **Neighbourhood Route Browser**: Pick any of the 71 official Tel Aviv neighbourhoods and see its real bus routes — the boundary drawn on the map and the "קווי אוטובוס בשכונה" list both update together, and clicking a route draws its path/stops. The top KPI tiles (avg speed / % congested / segment count) are scoped to whichever neighbourhood is selected — a point-in-polygon test against its official boundary — and fall back to city-wide numbers when no neighbourhood is selected.
- **Stops & Boardings** (`תחנות ועליות`): Every surveyed stop in the city, sized by area in proportion to daily boardings and coloured on a five-class quantile ramp recomputed from whatever is on screen — so the classes stay informative inside a single neighbourhood, not just city-wide. Clicking one opens the left panel: boardings/day, scheduled calls, transfer share, the lines calling there, boardings by time band with the peak marked, and the rider mix. Stops the survey never covered draw as a hollow ring and say so; they are never shown as zero. The panel's ↩ link rolls the same figures up over everything currently visible.
- **Dark & Light Mode**: Adapts dynamically based on user preference.

### Features removed pending data (see `../../data/README.md`)
Station-level ridership analytics and the destination layer have since been restored, from
`data/taltan/stations/` and `data/municipal/destinations/` respectively. Still missing their source
data: the **bus-vs-car travel-time** comparison (needs a driving-duration source, which no export in
`../../data/` contains) and **צירי יעד עיקריים** desire lines (need origin→destination flows; the
station survey counts boardings at a stop but not where those trips end). See the data README.
