/**
 * The dashboard's shared state, and the only way anything is allowed to change
 * it. Components never reach into each other: they call `setState`, and whoever
 * cares subscribes. `main.js` is the one place that orchestrates the reaction.
 */

export const state = {
  day: 'avg',                  // 0..4 for א׳..ה׳, or 'avg'
  period: 'all',               // 0..6 for P1..P7, or 'all'
  layers: { speed: true, cong: false, dest: false, stops: false, roads: false },
  destCats: null,              // Set of enabled destination category ids, null = all
  area: null,                  // { bbox, boundary } of the selected neighbourhood, or null
  areaName: null,              // its Hebrew name, for KPI captions
  areaRecord: null,            // the full neighbourhood record (population, transit blocks)
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
