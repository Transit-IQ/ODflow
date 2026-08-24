/** Hebrew labels and number formatting shared across components. */

import { periodName, hoursLabel, periodCount } from './periods.js';

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

/**
 * Caption for the currently selected time-of-day window.
 *
 * The hours are the survey's published band bounds, so they are stated plainly.
 * The dashboard used to print them with a ≈ because the windows were guessed
 * here rather than read from the data; there is nothing left to hedge.
 */
export function periodLabel(period) {
  if (period === 'all' || !periodCount()) return 'כל שעות היום';
  return `${periodName(period)} ${hoursLabel(period)}`;
}

export function escHtml(v) {
  return String(v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
