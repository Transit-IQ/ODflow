/**
 * Station boardings for a single time-of-day window.
 *
 * A period IS a survey band now, so this is a column read rather than an
 * estimate. That was not always true: the dashboard used to define its own seven
 * speed windows, none of which lined up with the survey's bands, and every period
 * figure had to be apportioned across the bands it straddled by share of hours —
 * a uniform-within-a-bucket assumption that was doing real work and could not be
 * checked against anything. The windows are now the survey's own, so a period
 * reads one band and nothing is inferred.
 *
 * The one figure the survey still cannot resolve is a period narrower than a
 * band, and the axis no longer has any: the 04-06 band carries two speed windows
 * and is shown as one period, rather than split into halves the survey never
 * measured.
 */

import { bandIndex } from './periods.js';

/**
 * A station's boardings in period `p`, or its daily total when `p` is `'all'`.
 *
 * The survey's two boarding columns disagree at station level: the `ON####`
 * bands sum to a median of 0.70 × `ONDAY` per station (0.0–1.62 across the
 * city), though city-wide the two totals land within 2.5% of each other. So the
 * bands are read for the *shape* of the station's day and `ONDAY` for its
 * *level* — the band's share of the banded day, applied to the daily total.
 * Taking the band value raw instead would put every period figure on a different
 * scale from the daily one shown everywhere else in the dashboard.
 *
 * Stays `null` for a station the survey never covered — the layer draws those as
 * a hollow ring, and a period cut must not turn "not surveyed" into a zero.
 *
 * One station (code 26721) reports `ONDAY` 16 against seven all-zero bands, so
 * there is no shape to place it in the day with. It goes hollow under a period
 * cut rather than to zero, which is why the seven periods sum to 16 short of the
 * city's daily total rather than to it exactly.
 */
export function boardingsFor(station, period) {
  if (station.boardings_day == null) return null;
  if (period === 'all' || period == null) return station.boardings_day;

  const band = bandIndex(period);
  if (band == null) return null;

  const byBand = station.boardings_by_band;
  if (!byBand) return null;
  const bandedDay = byBand.reduce((a, v) => a + (v || 0), 0);
  if (!bandedDay) return null;

  return ((byBand[band] || 0) / bandedDay) * station.boardings_day;
}
