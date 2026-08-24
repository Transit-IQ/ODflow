/**
 * Bus routes drawn on the map, one stroke per selected line.
 *
 * Each route is two polylines: a casing in the basemap's own colour and the
 * coloured stroke on top. Without the casing a route and a congested speed
 * segment beneath it fuse into one line; the rim reads as "this belongs to a
 * different layer". The two live in separate panes so every casing lands below
 * every stroke, which draw order within one layer group would not guarantee.
 */

import { map } from '../core/map.js';
import { routeColor, ROUTE_SLOTS, mapColors } from '../core/palette.js';
import { agencyLabel } from '../core/agencies.js';

export const routeLayer = L.layerGroup();

const active = new Map();    // route_id → { route, stroke, casing }
const slots = new Map();     // route_id → palette slot, stable for the session
let nextSlot = 0;

// Anything that has to redraw when the set of live routes changes — the stop
// layer that follows them, for one. Layers do not call each other, so the
// listener is registered by main.js rather than reached for from here.
const listeners = new Set();

/** Subscribe to activate/deactivate/clearAll. Returns an unsubscribe function. */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Coalesced to one call per task. "בחר הכל" activates every route in the area in
// a synchronous loop, and a listener that redraws all their stops would otherwise
// rebuild the whole set once per route — quadratic in the number of lines.
let announcing = false;

function announce() {
  if (announcing) return;
  announcing = true;
  queueMicrotask(() => {
    announcing = false;
    for (const fn of listeners) fn();
  });
}

/** The live route records, in activation order. */
export function activeRoutes() {
  return [...active.values()].map(entry => entry.route);
}

/** The colour a route has (or would get), stable across theme flips. */
export function colorFor(routeId) {
  if (!slots.has(routeId)) {
    slots.set(routeId, nextSlot % ROUTE_SLOTS);
    nextSlot++;
  }
  return routeColor(slots.get(routeId));
}

export function isActive(routeId) {
  return active.has(routeId);
}

export function activate(route) {
  if (active.has(route.route_id) || !route.coordinates?.length) return;

  const color = colorFor(route.route_id);

  const casing = L.polyline(route.coordinates, {
    pane: 'routeCasingPane',
    color: mapColors().casing,
    weight: 8,
    opacity: 0.85,
    smoothFactor: 1.2,
  });

  const stroke = L.polyline(route.coordinates, {
    pane: 'routeLinePane',
    color,
    weight: 4.5,
    opacity: 1,
    smoothFactor: 1.2,
  });

  stroke.bindTooltip(
    `קו ${route.route_short_name} · ${agencyLabel(route.agency_id)}` +
    `<br><small>${route.route_long_name || ''}</small>`,
    { sticky: true, direction: 'top' }
  );

  casing.addTo(routeLayer);
  stroke.addTo(routeLayer);
  active.set(route.route_id, { route, stroke, casing });
  announce();
}

export function deactivate(routeId) {
  const entry = active.get(routeId);
  if (!entry) return;
  routeLayer.removeLayer(entry.stroke);
  routeLayer.removeLayer(entry.casing);
  active.delete(routeId);
  announce();
}

export function toggle(route) {
  if (active.has(route.route_id)) deactivate(route.route_id);
  else activate(route);
}

export function clearAll() {
  if (!active.size) return;
  for (const entry of active.values()) {
    routeLayer.removeLayer(entry.stroke);
    routeLayer.removeLayer(entry.casing);
  }
  active.clear();
  announce();
}

/** Re-step every live route after a theme flip. */
export function refresh() {
  const casing = mapColors().casing;
  for (const [routeId, entry] of active) {
    entry.stroke.setStyle({ color: colorFor(routeId) });
    entry.casing.setStyle({ color: casing });
  }
}

export function attachTo(target) {
  routeLayer.addTo(target || map);
}
