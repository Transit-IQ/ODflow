/** Hebrew labels and number formatting shared across components. */

export const PNAMES = ['בוקר מוקדם', 'שעות הבוקר', 'לפני הצהריים', 'צהריים', 'אחר הצהריים', 'שעת שיא ערב', 'ערב / לילה'];

/**
 * The clock hours each speed period P1..P7 covers, `[start, end)`.
 *
 * The speed source names its columns `d_<day>_h_<period>` and publishes no hour
 * bounds for them, so these windows are the project's own reading of what the
 * seven windows are — hence the ≈ in the labels below. They are numbers rather
 * than only display strings because anything else measured per hour has to be
 * mapped onto the same windows to be shown beside a speed (see core/boardings.js).
 */
export const PHOURS = [[5, 7], [7, 9], [9, 12], [12, 15], [15, 17], [17, 19], [19, 24]];

const hh = h => String(h).padStart(2, '0');
export const PTIMES = PHOURS.map(([from, to]) => `≈${hh(from)}–${hh(to)}`);
export const DAYNAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
export const DAYAB = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳'];

/** Locale-formatted number; an em dash for a missing value, never a zero. */
export function fmtNum(n, digits = 0) {
  if (n == null) return '—';
  return (+n).toLocaleString('he-IL', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Caption for the currently selected day. */
export function dayLabel(day) {
  return day === 'avg' ? 'ממוצע ימי חול (א׳–ה׳)' : 'יום ' + DAYNAMES[day];
}

/** Caption for the currently selected time-of-day window. */
export function periodLabel(period) {
  return period === 'all' ? 'כל שעות היום' : PNAMES[period] + ' ' + PTIMES[period];
}

export function escHtml(v) {
  return String(v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
