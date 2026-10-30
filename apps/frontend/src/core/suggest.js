/**
 * קווים מוצעים — the stop-pruning proposal.
 *
 * The proposal is deliberately narrow: a line keeps its path, its number and its
 * order, and the only thing that changes is which stops it calls at. Stops whose
 * נסיעות מעבר share (`transfer_pct`, the survey's `PERSTRANS`) is above a chosen
 * threshold are dropped — the reasoning being that a stop where most of the traffic
 * is passing through rather than starting or ending a journey is a stop the line
 * can skip. Re-routing is a different question and this module does not answer it.
 *
 * No DOM, no Leaflet, no state import. The sidebar block and the map layer both
 * call in here, which is what stops them telling two stories about one line, and
 * it is what makes the rules below testable without a browser.
 */

import { boardingsFor } from './boardings.js';
import { stationsForRoutes } from './routeStations.js';

/**
 * Why a stop survived, when it survived despite being over the threshold.
 *
 * Exported so the UI can explain itself. An analyst who sets the threshold to 40%
 * and then finds a 71% stop still on the line needs to be told which rule kept it,
 * or the tool looks broken.
 */
export const KEPT_REASON = {
  under: 'under',            // below the threshold — the ordinary case
  unsurveyed: 'unsurveyed',  // no transfer_pct at all
  terminal: 'terminal',      // an endpoint of the line
};

/**
 * Whether a station may be removed, and why not when it may not.
 *
 * Two exemptions, both forced by the data rather than chosen for taste:
 *
 * `unsurveyed` — `transfer_pct` is null for every stop the תלת״ן survey never
 * covered, which is roughly two thirds of the stop instances in the route index
 * (the survey stops at the city line; the lines do not). Removing those would mean
 * deleting a stop on the strength of a figure that does not exist, and because the
 * nulls are geographically clustered it would amount to pruning hardest exactly
 * where the dashboard knows least.
 *
 * `terminal` — a line stripped of its endpoints is a different line, and the
 * proposal's whole premise is that the line stays the same.
 */
export function keptReason(station, pctMax) {
  if (station.transfer_pct == null) return KEPT_REASON.unsurveyed;
  if (station.terminal) return KEPT_REASON.terminal;
  if (station.transfer_pct <= pctMax) return KEPT_REASON.under;
  return null;   // nothing protects it — it goes
}

/**
 * Apply the proposal to one route.
 *
 * `period` is passed through to `boardingsFor` so the boardings figures follow the
 * dashboard's time cut, exactly like the dots on the map do. A stop the survey
 * never covered contributes to neither side of the boardings split — it is counted
 * in `unsurveyed` and left out of the ratio, never entered as a zero, which would
 * read as "this stop carries nobody".
 */
export function pruneLine(route, pctMax, period = 'all') {
  const stations = stationsForRoutes([route]);

  const kept = [];
  const removed = [];
  const unsurveyed = [];
  let boardingsKept = 0;
  let boardingsRemoved = 0;

  for (const s of stations) {
    const reason = keptReason(s, pctMax);
    const boardings = boardingsFor(s, period);

    if (reason === KEPT_REASON.unsurveyed) {
      unsurveyed.push(s);
      kept.push(s);
      continue;
    }

    if (reason) {
      kept.push(s);
      if (boardings != null) boardingsKept += boardings;
    } else {
      removed.push(s);
      if (boardings != null) boardingsRemoved += boardings;
    }
  }

  return { route, stations, kept, removed, unsurveyed, boardingsKept, boardingsRemoved };
}

/**
 * The proposal across several routes at once.
 *
 * Stops are deduplicated across lines: two lines sharing a kerb are one stop in the
 * totals, because the tiles count stops on the map and the map draws one dot there.
 * Summing per-line results instead would double-count every shared stop and inflate
 * both the removal count and the boardings.
 */
export function pruneLines(routeList, pctMax, period = 'all') {
  const lines = routeList.map(r => pruneLine(r, pctMax, period));

  const keptSet = new Set();
  const removedSet = new Set();
  for (const line of lines) {
    for (const s of line.kept) keptSet.add(s);
    for (const s of line.removed) removedSet.add(s);
  }

  // A stop one line keeps and another drops stays on the map, so it counts as kept.
  // Reporting it as removed would promise a deletion the map is not making.
  for (const s of keptSet) removedSet.delete(s);

  let boardingsKept = 0;
  let boardingsRemoved = 0;
  for (const s of keptSet) {
    const v = boardingsFor(s, period);
    if (v != null) boardingsKept += v;
  }
  for (const s of removedSet) {
    const v = boardingsFor(s, period);
    if (v != null) boardingsRemoved += v;
  }

  return {
    lines,
    kept: [...keptSet],
    removed: [...removedSet],
    boardingsKept,
    boardingsRemoved,
  };
}

/**
 * Share of boardings the proposal retains, 0–100, or null when nothing is known.
 *
 * Null rather than 100 when the denominator is zero: "every rider kept" and "no
 * rider data at all" are different answers and the second one must not wear the
 * first one's face.
 */
export function retainedPct({ boardingsKept, boardingsRemoved }) {
  const total = boardingsKept + boardingsRemoved;
  if (!total) return null;
  return (boardingsKept / total) * 100;
}
