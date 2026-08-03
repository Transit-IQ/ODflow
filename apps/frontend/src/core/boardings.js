/**
 * Station boardings for a single time-of-day window.
 *
 * The two sources cut the day differently and neither is negotiable: the תלת״ן
 * survey publishes boardings in its own bands (`04-06`, `06-09`, `09-12`,
 * `12-15`, `15-19`, `19-24`, `24-04`), while the speed network publishes P1..P7
 * (see PHOURS). Three windows line up exactly; the rest straddle each other —
 * P5 `15–17` and P6 `17–19` both fall inside the survey's single `15-19` band.
 *
 * So a period's boardings are apportioned from the bands it overlaps, by share
 * of the band's hours — the same uniform-within-a-bucket assumption the pipeline
 * makes when it apportions population from a statistical area onto a
 * neighbourhood. It is an estimate, and the ≈ on every period label is the
 * honest signal of that; splitting a `15-19` band between the two rush-hour
 * periods evenly is the assumption doing the most work here.
 *
 * Bands are parsed from the labels the survey itself ships, so a survey edition
 * that re-cuts its bands needs no change here.
 */

import { PHOURS } from './format.js';

/** `'06-09'` → `[6, 9]`; `'24-04'` → `[24, 28]`, the band that runs past midnight. */
function bandHours(label) {
  const m = String(label).match(/(\d+)\D+(\d+)/);
  if (!m) return null;
  const start = Number(m[1]);
  let end = Number(m[2]);
  if (end <= start) end += 24;
  return [start, end];
}

function overlapHours([aFrom, aTo], [bFrom, bTo]) {
  return Math.max(0, Math.min(aTo, bTo) - Math.max(aFrom, bFrom));
}

/**
 * How much of each survey band falls inside period `p` — one weight per band, in
 * the order the bands ship. `null` for the all-day cut, which needs no weighting.
 *
 * Computed once per render and passed to `boardingsFor` for every station, since
 * it depends only on the period and the band labels.
 */
export function bandWeights(bands, period) {
  if (period === 'all' || !bands?.length) return null;
  const window = PHOURS[period];
  if (!window) return null;

  return bands.map(label => {
    const band = bandHours(label);
    if (!band) return 0;
    const hours = band[1] - band[0];
    return hours > 0 ? overlapHours(window, band) / hours : 0;
  });
}

/**
 * A station's boardings under the given weights, or its daily total when
 * `weights` is null.
 *
 * The survey's two boarding columns disagree at station level: the `ON####`
 * bands sum to a median of 0.70 × `ONDAY` per station (0.0–1.62 across the
 * city), though city-wide the two totals land within 2.5% of each other. So the
 * bands are read for the *shape* of the station's day and `ONDAY` for its
 * *level* — the period's share of the banded day, applied to the daily total.
 * Taking the band values raw instead would put every period figure on a
 * different scale from the daily one shown everywhere else in the dashboard.
 *
 * P1..P7 therefore sum to `ONDAY` less the hours no period covers — the
 * survey's `24-04` band and the hour before P1 — which is a real gap in what
 * the speed windows describe, not a rounding loss.
 *
 * Stays `null` for a station the survey never covered — the layer draws those as
 * a hollow ring, and a period cut must not turn "not surveyed" into a zero. One
 * station carries an `ONDAY` with no band detail at all; it can't be placed in
 * the day, so it goes hollow under a period cut rather than to zero.
 */
export function boardingsFor(station, weights) {
  if (station.boardings_day == null) return null;
  if (!weights) return station.boardings_day;

  const byBand = station.boardings_by_band;
  if (!byBand) return null;
  const bandedDay = byBand.reduce((a, v) => a + (v || 0), 0);
  if (!bandedDay) return null;

  const inWindow = weights.reduce((sum, w, i) => sum + w * (byBand[i] || 0), 0);
  return (inWindow / bandedDay) * station.boardings_day;
}
