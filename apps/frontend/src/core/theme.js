/**
 * Theme ownership. `data-theme` on <html> is the single source of truth — the
 * inline script in index.html stamps it before first paint, this module owns it
 * afterwards, and every palette in core/palette.js is keyed off `isLight()`.
 */

const KEY = 'theme';
const listeners = new Set();

export function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function isLight() {
  return currentTheme() === 'light';
}

/** Pick between a dark-mode and a light-mode value. */
export function byTheme(darkValue, lightValue) {
  return isLight() ? lightValue : darkValue;
}

export function toggleTheme() {
  const next = isLight() ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch { /* private mode — session only */ }
  for (const fn of listeners) fn(next);
}

/** Subscribe to theme flips. Returns an unsubscribe function. */
export function onTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
