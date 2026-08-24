/**
 * The time axis both data sources are reported on.
 *
 * There is exactly one set of hour ranges in this dashboard and it is not written
 * here: the תלת״ן survey encodes its bands in its own column names (`ON0406` is
 * boardings between 04:00 and 06:00), the pipeline parses them out, and
 * kpis.json ships the result. This module only holds what was loaded.
 *
 * BUS_SPEED publishes no hour bounds at all — its columns are `d_<day>_h_<window>`
 * and nothing in the .dbf or the .lyr says what a window covers — so the pipeline
 * lays its seven windows onto the survey's bands and records which windows fall in
 * which band. That mapping arrives as `speed_indices`, and it is why this file has
 * no clock hours in it: an earlier version of the dashboard invented seven windows
 * here, and the invented bounds put the morning rush in the wrong place.
 *
 * A band with an empty `speed_indices` (the near-empty 00-04 night) has real
 * boardings and no speed reading. That is a fact about the sources, so the UI
 * reports it as missing rather than as a zero.
 */

/** Live list of `{ label, from, to, band_index, speed_indices }`, filled at boot. */
export const periods = [];

// Display names for the survey's published bands, keyed by the band's HOURS
// rather than by its label text or its position.
//
// The label is the survey's own string and it is not stable — the night band has
// been written both `24-04` and `00-04`. A name keyed on that text stops matching
// the moment it changes, and the row then silently prints its hours where its
// name belongs, with no error to notice. The bounds do not have that problem:
// they are numbers, the night is unambiguously 24->28, and a band that genuinely
// moves gets no name rather than a wrong one.
const NAMES = {
  '4-6': 'לפנות בוקר',
  '6-9': 'שעת שיא בוקר',
  '9-12': 'לפני הצהריים',
  '12-15': 'צהריים',
  '15-19': 'שעת שיא אחר הצהריים',
  '19-24': 'ערב',
  '24-28': 'לילה',
};

export function setPeriods(list) {
  periods.length = 0;
  if (Array.isArray(list)) periods.push(...list);
}

export function periodCount() {
  return periods.length;
}

export function periodAt(i) {
  return periods[i] || null;
}

/** The band's own name, or its hours when the data ships a band we have no name for. */
export function periodName(i) {
  const p = periods[i];
  if (!p) return '';
  return NAMES[`${p.from}-${p.to}`] || hoursLabel(i);
}

/**
 * `04–06`. The survey's own published band string, only re-punctuated.
 *
 * Printed rather than recomputed from the bounds: the bounds carry the night as
 * 24->28 so it sorts and overlaps correctly, and rendering those through a modulo
 * turned the evening into `19–00`, a range the survey never wrote.
 */
export function hoursLabel(i) {
  const p = periods[i];
  if (!p) return '';
  return String(p.label ?? '').replace('-', '–');
}

/** The speed-file column offsets inside this period. Empty when it has no speed data. */
export function speedIndices(i) {
  return periods[i]?.speed_indices || [];
}

/** Every speed column, for the all-day cut. */
export function allSpeedIndices() {
  return periods.flatMap(p => p.speed_indices || []);
}

export function hasSpeed(i) {
  return speedIndices(i).length > 0;
}

/** The survey band a period reads its boardings from — one band, never a blend. */
export function bandIndex(i) {
  return periods[i]?.band_index ?? null;
}
