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

const active = new Map();    // route_id → { stroke, casing, slot }
const slots = new Map();     // route_id → palette slot, stable for the session
let nextSlot = 0;

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
  active.set(route.route_id, { stroke, casing });
}

export function deactivate(routeId) {
  const entry = active.get(routeId);
  if (!entry) return;
  routeLayer.removeLayer(entry.stroke);
  routeLayer.removeLayer(entry.casing);
  active.delete(routeId);
}

export function toggle(route) {
  if (active.has(route.route_id)) deactivate(route.route_id);
  else activate(route);
}

export function clearAll() {
  for (const routeId of [...active.keys()]) deactivate(routeId);
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
