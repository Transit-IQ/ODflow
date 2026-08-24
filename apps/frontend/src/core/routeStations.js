/**
 * The station records for the stops of whichever bus lines are drawn.
 *
 * A drawn line's stops are not a second kind of dot. They are the same station
 * records the stop layer already draws, so clicking one opens the same panel with
 * the same survey figures — a line's stop and "that stop" have to be the same
 * object or the dashboard is telling two stories about one kerb.
 *
 * The two sources are joined on the public stop **code**, which is the key the
 * pipeline itself uses to attach survey figures to GTFS stops. Position is not a
 * safe substitute: the stop across the street is a median 29 m away, so a radius
 * loose enough to absorb float noise would let a line's stop adopt the figures of
 * the stop serving the opposite direction.
 *
 * Roughly two thirds of the stop instances in the route index lie outside Tel
 * Aviv, where the survey does not reach. Those become records with a null
 * `boardings_day` — the same shape the survey uses for a station it never covered
 * — so the layer draws them as hollow rings and the panel says the stop was not
 * surveyed. They are never given a zero.
 */

import { data } from './data.js';

let indexedFrom = null;   // the station array the lookup was built from
let byCode = null;        // stop code → survey station

function ensureIndex() {
  const stations = data.stops?.stations;
  if (!stations) return false;
  if (indexedFrom === stations) return true;

  byCode = new Map();
  for (const s of stations) {
    const code = String(s.code ?? '').trim();
    if (code) byCode.set(code, s);
  }
  indexedFrom = stations;
  return true;
}

/**
 * A stop the survey never covered, shaped like a station record so the layer and
 * the panel need no special case. Every survey-only field is null rather than
 * zero, which is what makes the panel say "not surveyed" instead of "no riders".
 */
function unsurveyed(stop, lines) {
  return {
    code: String(stop.code ?? stop.id ?? '').trim(),
    name: stop.name || '',
    lat: stop.lat,
    lon: stop.lon,
    street: '',
    house: 0,
    routes: [...lines],
    routes_reported: lines.size,
    terminal: false,
    boardings_day: null,
    departures_day: null,
    boardings_by_band: null,
    departures_by_band: null,
    riders: null,
    transfer_pct: null,
    trips_to_dest: null,
    neighbourhoods: [],
    fromRoute: true,          // marks a record the survey did not supply
  };
}

/**
 * Every station served by `liveRoutes`, deduplicated.
 *
 * A stop shared by both directions of a line, or by several lines, yields one
 * record — the map draws one dot per kerb, not one per line calling there.
 * Returns an empty array until the survey file has loaded, so the caller can draw
 * what it already has and re-render when the fetch lands.
 */
export function stationsForRoutes(liveRoutes) {
  if (!liveRoutes?.length || !ensureIndex()) return [];

  const found = new Map();          // survey station → itself
  const synthetic = new Map();      // stop key → record built for an unsurveyed stop

  for (const route of liveRoutes) {
    const line = String(route.route_short_name ?? '').trim();
    for (const stop of route.stops || []) {
      const code = String(stop.code ?? '').trim();
      const station = code ? byCode.get(code) : null;
      if (station) {
        found.set(station, station);
        continue;
      }
      // Keyed on the GTFS stop id, so two lines sharing an unsurveyed stop share
      // one record rather than stacking two dots on the same kerb.
      const key = String(stop.id ?? `${stop.lat},${stop.lon}`);
      if (synthetic.has(key)) synthetic.get(key)._lines.add(line);
      else {
        const lines = new Set([line]);
        const record = unsurveyed(stop, lines);
        record._lines = lines;
        synthetic.set(key, record);
      }
    }
  }

  // The line list on a synthetic record is only settled once every route has been
  // walked, so it is copied out at the end rather than on creation.
  for (const record of synthetic.values()) {
    record.routes = [...record._lines].filter(Boolean);
    record.routes_reported = record.routes.length;
    delete record._lines;
  }

  return [...found.values(), ...synthetic.values()];
}
