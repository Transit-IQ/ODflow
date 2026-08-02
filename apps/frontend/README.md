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
apps/frontend/src/                       ← renders the map/UI from that JSON
```

If you change anything under `../../data/`, re-run the pipeline before rebuilding/deploying:

```bash
cd ../backend
source venv/bin/activate
python scripts/build_dashboard_data.py
```

## Project structure

The UI is built from ES modules — no framework. `index.html` is a shell with a
single `<div id="app">`; everything else is mounted by `src/main.js`.

```
src/
  main.js              composition root — the only file that knows about
                       more than one component
  core/                no DOM outside its own concern, no Leaflet except map.js
    store.js           shared state + subscribe; the only way state changes
    theme.js           owns data-theme on <html>; onTheme() for re-styling
    palette.js         every colour the MAP draws with, both themes
    map.js             the Leaflet map, basemap tiles and the pane stack
    data.js            fetches + caches the generated JSON
    geo.js             point-in-area tests
    format.js          Hebrew labels, number formatting, escaping
    routeKind.js       urban / intercity split, parsed off route_long_name
    agencies.js        agency id → Hebrew name
    vendor.js          on-demand loader for the import parsers
    dom.js             html`` and $() — the only two DOM helpers
  layers/              draw on the map; never touch the DOM outside it
    speed.js  boundary.js  destinations.js  routes.js  stops.js  imported.js
  components/          one folder each: index.js + its own stylesheet
    Header/  KpiBar/  TimeFilter/  LayerToggles/  SpeedLegend/
    AreaPanel/  ImportPanel/  StopPanel/  TimeBadge/
  styles/
    tokens.css         design tokens for both themes (the CHROME palette)
    base.css           reset, page shell, Leaflet chrome
    primitives.css     pieces shared by several components (.block .btn .toggle …)
public/data/           generated JSON — do not hand-edit, regenerate via the pipeline
```

### Component contract

A component is a function returning `{ el, …methods }`. It owns its markup, its
stylesheet and its own event listeners, and it reads or writes shared state
through `core/store.js` — never through another component.

```js
import './KpiBar.css';
import { html } from '../../core/dom.js';

export function KpiBar() {
  const el = html`<div class="kpis">…</div>`;
  return { el, setSpeedStats(stats) { /* … */ } };
}
```

`main.js` mounts them, subscribes to the store once, and is the single place
that decides what a state change makes happen. To add a panel: create the
folder, export the function, import it in `main.js`, append its `el`.

### Where colour lives

Two places, deliberately. `src/styles/tokens.css` holds the chrome palette
(surfaces, ink, the domain tints on controls). `src/core/palette.js` holds every
colour Leaflet needs in JavaScript — speed bands, route slots, destination
families, the stop ramp. Each of those sets was validated *as a set* against the
basemap it draws on, so changing one hex means re-checking the whole set.

### Generated data files (`public/data/`)

| File | Contents |
|---|---|
| `border.json` | Tel Aviv city-limits polygon (GeoJSON) |
| `speeds.json` | Bus speed segments clipped to the city, each with a 35-value (5 days × 7 periods) speed array |
| `kpis.json` | Derived KPIs: segment count, average-speed-by-period profile, and city-wide ridership totals (fetched on page load so the boardings tile has a figure before the stop layer is opened) |
| `stops.json` | The city's 1,069 survey stops: boardings/day and by time band, scheduled calls, transfer share, rider mix, the GTFS lines calling there, and the neighbourhood each stands in. Fetched lazily on first toggle of the תחנות ועליות layer |
| `neighbourhoods.json` | Index of the 71 selectable neighbourhoods (id/name/bbox/**boundary**/population/route_ids) — every one is an official municipal polygon, see `../../data/README.md` |
| `neighbourhood_routes.json` | Shared route lookup (shape + stops) referenced by `neighbourhoods.json`, fetched lazily on first use |

The "קווי אוטובוס באזור" sidebar list is driven entirely by whichever neighbourhood is selected in
the dropdown at the top (no neighbourhood selected on load) — there is no separate hardcoded route
list, and the dropdown itself is filled from `neighbourhoods.json`.

It is split into **עירוני** and **בין-עירוני** sections, urban first, each sorted by line number.
Nothing in the feed flags a line as one or the other, so `src/core/routeKind.js` derives it from the
MOT's strictly formatted `route_long_name`, which carries both endpoint cities:

```
<origin stop>-<origin city><-><destination stop>-<destination city>-<direction code>
מסוף עתידים-תל אביב יפו<->ת. רכבת אוניברסיטה/הורדה-תל אביב יפו-11     ← urban
מסוף כרמלית/הכרמל-תל אביב יפו<->מסוף קדמה-רמת השרון-11                 ← intercity
```

A line is urban when **both** endpoints are `HOME_CITY` (Tel Aviv-Yafo). Same-city-elsewhere lines
are deliberately not urban: Holon's internal 4/5/6 and the 800-series park-and-ride shuttles (both
ends חניון שפיים) pass through the city but are not Tel Aviv urban lines. All 700 routes in the
index parse, and the urban set comes out as the recognisable internal network (2–16, 31, 44, 52, 54,
79, 80, 114, 6א). Because this reads a string rather than a real field, the sturdier long-term home
for the flag is the pipeline — see the note in that module.

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
