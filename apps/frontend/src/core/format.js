/** Hebrew labels and number formatting shared across components. */

export const PNAMES = ['בוקר מוקדם', 'שעות הבוקר', 'לפני הצהריים', 'צהריים', 'אחר הצהריים', 'שעת שיא ערב', 'ערב / לילה'];
export const PTIMES = ['≈05–07', '≈07–09', '≈09–12', '≈12–15', '≈15–17', '≈17–19', '≈19–24'];
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
