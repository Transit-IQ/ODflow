/**
 * Every colour the map draws with, in one place.
 *
 * Each set below was validated as a set against the basemap it is used on —
 * colourblind separation, contrast against that surface, and distinguishable
 * under normal vision. Editing one hex means re-running that check on the whole
 * set, not just the hex; they are not independent choices.
 *
 * Chrome colours (panels, text, tints) live in styles/tokens.css. These are only
 * the values Leaflet needs in JavaScript.
 */

import { isLight } from './theme.js';

// ── Bus speed ────────────────────────────────────────────────────────────────
// Five bands, cut at 8 / 15 / 22 / 30 km/h. The 15 edge is deliberate: it is the
// same threshold the "% congested" KPI reports, so a segment the tile counts as
// congested is exactly a segment drawn in one of the first two colours.
// Hue alone doesn't carry the band — line WEIGHT is the redundant encoding:
// slower reads thicker.
export const SPEED_BREAKS = [8, 15, 22, 30];
export const SPEED_WEIGHT = [5, 4, 3.25, 2.75, 2.5];
export const CONGESTION_KMH = 15;

const MAP_COLORS = {
  dark: {
    bands: ['#e11d48', '#f97316', '#facc15', '#34d399', '#60a5fa'],
    empty: '#3d4a63',      // segment with no speed reading for the current cut
    cong: '#fb7185',       // congestion-hotspot halo
    focus: '#2dd4bf',      // brand teal — selection outlines, never map data
    imported: '#38bdf8',
    casing: '#0b1220',     // basemap-coloured rim under route strokes
    hairline: '#0b0b0b',   // 1px edge on point markers
    selected: '#ffffff',   // ring on the selected stop
  },
  light: {
    bands: ['#e11d48', '#9a3412', '#ca8a04', '#15803d', '#1d4ed8'],
    empty: '#cbd5e1',
    cong: '#be123c',
    focus: '#0f766e',
    imported: '#1d4ed8',
    casing: '#ffffff',
    hairline: '#ffffff',
    selected: '#0f1f3e',
  },
};

export function mapColors() {
  return isLight() ? MAP_COLORS.light : MAP_COLORS.dark;
}

/** Band index for a speed, or -1 when there is no reading. */
export function speedBand(v) {
  if (v == null || v <= 0) return -1;
  let i = 0;
  while (i < SPEED_BREAKS.length && v >= SPEED_BREAKS[i]) i++;
  return i;
}

export function speedColor(v) {
  const c = mapColors();
  const b = speedBand(v);
  return b < 0 ? c.empty : c.bands[b];
}

export function speedWeight(v) {
  const b = speedBand(v);
  return b < 0 ? 2 : SPEED_WEIGHT[b];
}

// ── Bus routes ───────────────────────────────────────────────────────────────
// Eight slots, assigned in fixed order. Routes are stored by SLOT, not by hex,
// so a theme flip re-steps the same route to the same slot instead of
// reshuffling the map's colours. Past eight the slots repeat: the line-number
// badge and the hover tooltip carry the identity, colour only groups strokes.
const ROUTE_COLORS = {
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
};

export const ROUTE_SLOTS = ROUTE_COLORS.dark.length;

export function routeColor(slot) {
  const set = isLight() ? ROUTE_COLORS.light : ROUTE_COLORS.dark;
  return set[slot % set.length];
}

// ── Destinations ─────────────────────────────────────────────────────────────
// The export carries 16 facility categories. Sixteen hues on one map is not a
// legend anyone can read, so colour is carried by SERVICE FAMILY (six slots from
// the validated categorical order) while the checkbox list keeps all 16 for
// filtering — grouped under its family, where the name carries the identity.
// Families match on the category NAME, not its numeric id, so a change to the
// export's category order can't silently repaint the map.
export const DEST_FAMILIES = [
  { id: 'edu',    name: 'חינוך',        test: /ספר|גנ[יי]? ילדים|חינוך|לימוד/ },
  { id: 'health', name: 'בריאות',       test: /רפוא|מרפא|מרקחת|קופ[הות]|טיפ[הת] חלב|בריאות/ },
  { id: 'sport',  name: 'ספורט ופנאי',  test: /ספורט|בריכ|אצטדיון|כושר|מגרש|חוף/ },
  { id: 'comm',   name: 'קהילה ותרבות', test: /קהיל|תרבות|מתנ״?ס/ },
  { id: 'relig',  name: 'דת',           test: /כנסת|דת|מסגד|כנסי/ },
  { id: 'other',  name: 'אחר',          test: /.^/ },  // never matches — the fallback
];

const DEST_COLORS = {
  dark:  { edu: '#3987e5', health: '#d95926', sport: '#199e70', comm: '#c98500', relig: '#d55181', other: '#9085e9' },
  light: { edu: '#2a78d6', health: '#eb6834', sport: '#1baf7a', comm: '#eda100', relig: '#e87ba4', other: '#4a3aa7' },
};

/** Family id for a category name, falling back to 'other'. */
export function destFamilyOf(categoryName) {
  const found = DEST_FAMILIES.find(f => f.test.test(categoryName || ''));
  return (found || DEST_FAMILIES[DEST_FAMILIES.length - 1]).id;
}

export function destFamilyColor(familyId) {
  return (isLight() ? DEST_COLORS.light : DEST_COLORS.dark)[familyId];
}

// ── Stop ridership ───────────────────────────────────────────────────────────
// Sequential single-hue ramp (the brand teal), ordered low-to-high so "more"
// always reads as "stronger" on the surface in use: brightening against the dark
// basemap, darkening against the light one. Both directions were validated for
// monotonic lightness, visible step gaps, and a low end that separates from the
// basemap.
const STOP_RAMP = {
  dark: ['#115e59', '#0f766e', '#0d9488', '#14b8a6', '#5eead4'],
  light: ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#0b3d39'],
};

export function stopRamp() {
  return isLight() ? STOP_RAMP.light : STOP_RAMP.dark;
}
