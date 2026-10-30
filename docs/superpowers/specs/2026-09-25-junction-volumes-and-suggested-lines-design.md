# Junction turning volumes + suggested bus lines

Date: 2026-09-25
Status: approved, implementing

Two additions to the ODFlow dashboard. They are independent: neither reads the
other's data, and either can ship without the other.

## Feature 1 — נפחים בצמתים מרומזרים

Turning-movement counts at signalized junctions: per approach, how many vehicles
turn left, go straight, and turn right.

**The counts are mock. Nothing else is.** Junction positions, street names and
approach bearings are derived from `roads.geojson`, which is real OSM geometry.
Only the volumes are synthetic. `data/README.md` records three dashboard sections
that were deleted rather than shown with invented figures, so the mock status is
surfaced in the UI — a `נתוני דמו` badge on the layer toggle, the legend and the
junction panel — and carried in the JSON as `"mock": true`.

### Generation

`apps/backend/services/junctions_mock.py`, called from `build_dashboard_data.py`:

1. Read `roads.geojson`; keep `trunk`/`primary`/`secondary`/`tertiary` named ways.
   `motorway*` is excluded — grade-separated, never signalized.
2. Find crossings between differently-named roads via a shapely `STRtree`.
3. Cluster crossing points within ~30 m into one junction. A crossing of two
   multi-segment ways, or a dual carriageway, otherwise yields a scatter of
   near-duplicate points.
4. Derive approaches from the real geometry: bearing to a point ~25 m out along
   each incident direction, the street that leg belongs to, and its compass label.
   Keep 3- and 4-leg junctions, capped at 4 legs by road class.
5. Rank by road class, keep the top ~100.
6. Counts: `random.Random` seeded per junction id, so reruns are byte-identical.
   Daily entering volume scaled by the leg's road class, split left/through/right
   with `through` dominant, spread over the seven survey bands with an AM/PM-peaked
   diurnal shape.

### Output — `apps/frontend/public/data/junctions.json`

```json
{ "mock": true,
  "source": "נתוני דמו — נפחי פנייה סינתטיים על צמתים אמיתיים (OSM)",
  "bands": ["04-06", "06-09", …],
  "junctions": [{ "id": "j001", "name": "אבן גבירול / ארלוזורוב",
    "lat": 32.0853, "lon": 34.7818, "streets": ["אבן גבירול", "ארלוזורוב"],
    "approaches": [{ "dir": "צפון", "bearing": 12, "street": "אבן גבירול",
      "left": [7], "through": [7], "right": [7] }] }] }
```

Bands are copied from the axis the pipeline already derives, so the junction layer
and the stop layer can never disagree about what `06-09` means. Daily totals are
summed from the bands in the frontend — no stored total that can drift from its
parts.

### Frontend

| Where | Change |
|---|---|
| `core/data.js` | `data.junctions` + `loadJunctions()` on the existing `once()` memo |
| `core/store.js` | `state.layers.junc` |
| `layers/junctions.js` *(new)* | diamond `divIcon` markers — visibly not a stop dot — sized and coloured by total entering volume in the current period |
| `components/JunctionPanel/` *(new)* | SVG crossroads diagram, three arrows per leg with width ∝ share, plus a per-approach table and the demo badge |
| `LayerToggles`, `main.js` | a `נפחי פנייה בצמתים` row, a legend, and the three hooks the stop layer uses (load-on-toggle, re-render on `period`, rebuild on theme) |

Out of scope: no FastAPI endpoint. That app exists to explore raw `data/`; these
are generated, and a route would imply a live source that does not exist.

## Feature 2 — קווים מוצעים

For the bus lines already activated in the sidebar, drop the stops whose
`אחוזי מעבר` exceeds a threshold chosen in the dashboard. **The line geometry never
changes** — same path, same number, fewer stops.

### State

```js
suggest: { on: false, pctMax: 60 }
```

The existing `transferPctMax` slider and its documented line exemption in
`layers/stops.js` are left exactly as they are. That slider is a display filter
over the *area's* stops; this is a proposal about a *line*. One shared number would
have coupled them and silently reversed a decision the code documents.

### Pruning — `core/suggest.js`

Pure: no DOM, no Leaflet, so it is testable and so the sidebar and the map read one
answer.

```js
pruneLine(route, pctMax, period) →
  { kept, removed, unsurveyed, boardingsKept, boardingsRemoved }
```

Three rules, each forced by something in the data:

- **`transfer_pct == null` is never removed.** ~⅔ of route stop instances lie
  outside Tel Aviv, where the survey does not reach. A stop cannot be deleted on
  the strength of a figure that does not exist.
- **Terminals are never removed** (`s.terminal`). A line without its endpoints is a
  different line.
- **Boardings come from `boardingsFor(s, period)`** — the same function the dots
  use. Null boardings are excluded from ratios, never counted as zero.

### Rendering

`route.coordinates` is untouched. `layers/stops.js` splits a line's stop sequence
when the mode is on: kept stops draw as normal dots, **removed stops stay on the map
as struck-through hollow markers**, so the proposal is auditable rather than merely
shorter. A struck marker still opens `StopPanel`, which gains one line stating
whether the stop was kept or removed and at what percentage.

### Sidebar — `components/SuggestPanel/`

Placed after `LayerToggles`, since it acts on lines chosen above it.

- mode switch, and the `הסר תחנות עם נסיעות מעבר מעל __%` slider (0–100, step 5,
  default 60)
- proposal tiles: `תחנות שהוסרו` · `תחנות שנשמרו` · `% עליות שנשמרו`
- per-line rows: line badge in its route colour, `12 → 9 תחנות`, retained boardings
  share; clicking a row fits the map to that line
- empty state when no line is active
- a footnote naming what is never removed, so a high-% stop that stayed does not
  read as a bug

### Deliberately deferred

No minimum-spacing rule. Pruning on percentage alone can drop adjacent stops and
leave a long gap; a max-walk-gap constraint is the obvious next knob, but it is a
second threshold and the brief asked for one.

## Testing

The repo has no test infrastructure. Rather than retrofit the whole app, the two
pure-logic pieces get targeted coverage:

- **vitest** → `core/suggest.js`: the null-`transfer_pct` rule, the terminal rule,
  boardings ratios with unsurveyed stops present, threshold boundaries.
- **pytest** → `junctions_mock.py`: crossing clustering, approach-bearing
  derivation, 3/4-leg filtering, reproducibility of the seeded counts.

Layers and components stay browser-verified, as everything is today.
