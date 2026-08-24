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

// Display names for the survey's published bands. Keyed by the band label rather
// than by position, so a survey edition that re-cuts its bands falls back to
// showing the hours instead of silently mislabelling a window.
const NAMES = {
  '04-06': 'לפנות בוקר',
  '06-09': 'שעת שיא בוקר',
  '09-12': 'לפני הצהריים',
  '12-15': 'צהריים',
  '15-19': 'שעת שיא אחר הצהריים',
  '19-24': 'ערב',
  '00-04': 'לילה',
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
  return NAMES[p.label] || hoursLabel(i);
}

/** `04–06`. The bounds are the survey's, so there is no ≈ to apologise with. */
export function hoursLabel(i) {
  const p = periods[i];
  if (!p) return '';
  const hh = h => String(h % 24).padStart(2, '0');
  return `${hh(p.from)}–${hh(p.to)}`;
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
