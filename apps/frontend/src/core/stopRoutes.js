/**
 * Which bus lines actually call at a given station, and in which direction.
 *
 * The survey lists a station's lines as bare numbers (`"1"`, `"6א"`) because that
 * is all its ROUTES column carries. Drawing one on the map needs a route record
 * with a shape, and a line number is not enough to pick one: 285 of the 318
 * numbers in the route index map to more than one `route_id` — the same line in
 * both directions, and in a few cases two operators running their own line 1.
 *
 * The station resolves that, but only if it is matched on the right key. A route
 * and a survey station are the same stop when they share a public stop **code** —
 * the key the pipeline itself joins the two sources on. Matching on position
 * instead looks equivalent and is not: the opposite direction's stop sits across
 * the street, a median 29 m away, so any radius wide enough to absorb float noise
 * also swallows the other direction. That is the difference between 92.5% of
 * chips resolving to a single direction and only 64.3% of them.
 *
 * The codes that survive to more than one route are the honest ones — a terminal
 * or a loop where both directions genuinely call at the same kerb.
 */

import { data } from './data.js';

let indexed = null;   // the routesById object the lookups were built from
let byShort = null;   // short name → route records
let codes = null;     // route_id → Set of stop codes it calls at

function ensureIndex() {
  if (indexed === data.routesById) return true;
  if (!data.routesById) return false;

  byShort = new Map();
  codes = new Map();

  for (const route of Object.values(data.routesById)) {
    const name = String(route.route_short_name ?? '').trim();
    if (name) {
      if (!byShort.has(name)) byShort.set(name, []);
      byShort.get(name).push(route);
    }
    const set = new Set();
    for (const stop of route.stops || []) {
      const code = String(stop.code ?? '').trim();
      if (code) set.add(code);
    }
    codes.set(route.route_id, set);
  }

  indexed = data.routesById;
  return true;
}

/**
 * The routes to draw for one of a station's line-number chips.
 *
 * Returns `{ routes, confirmed }`. Normally one route — the single direction that
 * stops at this kerb. Two only where both directions really do call here.
 *
 * `confirmed` is false for the ~0.2% of chips whose stop code appears in no
 * candidate's stop list: the survey records the line at this stop, but the route's
 * representative GTFS trip does not include it, which happens on lines with
 * variant patterns. Those fall back to every route carrying the number, so the
 * chip still draws the line that was asked for, and the flag lets the UI say the
 * direction could not be pinned down.
 */
export function routesAtStop(station, shortName) {
  if (!ensureIndex()) return { routes: [], confirmed: false };

  const candidates = byShort.get(String(shortName ?? '').trim()) || [];
  if (!candidates.length) return { routes: [], confirmed: false };

  const code = String(station.code ?? '').trim();
  const here = code
    ? candidates.filter(r => codes.get(r.route_id)?.has(code))
    : [];

  return here.length
    ? { routes: here, confirmed: true }
    : { routes: candidates, confirmed: false };
}
