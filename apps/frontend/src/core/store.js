/**
 * The dashboard's shared state, and the only way anything is allowed to change
 * it. Components never reach into each other: they call `setState`, and whoever
 * cares subscribes. `main.js` is the one place that orchestrates the reaction.
 */

export const state = {
  day: 'avg',                  // 0..4 for א׳..ה׳, or 'avg'
  period: 'all',               // 0..6 for P1..P7, or 'all'
  layers: { speed: true, cong: false, dest: false, stops: false, roads: false, junc: false },
  destCats: null,              // Set of enabled destination category ids, null = all
  // The area filter is a selection of zero or more neighbourhoods. Empty means
  // the whole city — no filtering — which is what the dashboard opens on.
  area: null,                  // combined { bbox, boundary } of the selection, or null
  areaName: null,              // caption for the KPI strip: one name, or "N שכונות"
  areaRecords: [],             // the selected neighbourhood records, in pick order
  transferPctMax: 100,         // maximum % of נסיעות מעבר to display; 100 = no filter

  // קווים מוצעים. A proposal over the lines already drawn: keep the route exactly
  // as it runs and drop only the stops whose נסיעות מעבר share is above `pctMax`.
  //
  // Deliberately NOT the same number as `transferPctMax` above. That one is a
  // display filter over the *area's* stops and exempts a drawn line on purpose
  // (see layers/stops.js); this is a claim about a *line*. Folding them into one
  // value would mean changing what the map shows in order to ask a question about
  // a route, and would silently reverse a decision the stop layer documents.
  suggest: { on: false, pctMax: 60 },
};

const listeners = new Set();

/** Merge a patch into the state and notify subscribers with the keys that moved. */
export function setState(patch) {
  Object.assign(state, patch);
  notify(Object.keys(patch));
}

/** Announce a change that isn't a plain assignment (a mutated Set, say). */
export function notify(keys) {
  const changed = new Set(keys);
  for (const fn of listeners) fn(state, changed);
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
