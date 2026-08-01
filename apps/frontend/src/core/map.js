/**
 * The Leaflet map, its basemap, and the pane stack every layer draws into.
 *
 * `L` is the global from the Leaflet CDN tag in index.html — it is not bundled,
 * so there is no import for it.
 */

import { isLight, currentTheme } from './theme.js';

// Light mode uses Voyager rather than the flat grey Positron: it carries parks,
// water and built-up land in soft colour, which is context a transit planner
// actually reads off the map. Dark mode keeps the neutral dark base and is
// tinted to the brand navy in CSS (see .basemap in styles/base.css).
const TILES = {
  dark: {
    base: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    labels: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
  },
  light: {
    base: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
    labels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
  },
};

/**
 * Draw order, low to high. Leaflet's own overlayPane is 400 and holds the speed
 * segments; everything else is placed relative to that.
 *   350  neighbourhood highlight — a background guide, never over the data
 *   400  speed segments (Leaflet default overlayPane)
 *   405  route casings   ┐ two panes, so EVERY casing lands below EVERY stroke
 *   410  route strokes   ┘ (draw order within one group would not guarantee it)
 *   420  points — stops and places, so a corridor never hides the stop that
 *        explains it
 */
const PANES = {
  neighHighlightPane: 350,
  routeCasingPane: 405,
  routeLinePane: 410,
  pointPane: 420,
};

export const DEFAULT_CENTER = [32.08, 34.78];

export let map = null;
let baseTiles = null;
let labelTiles = null;

/** Create the map inside `el`. Called once, by main.js. */
export function createMap(el) {
  map = L.map(el, { zoomControl: false, attributionControl: false, preferCanvas: true })
    .setView(DEFAULT_CENTER, 15);

  // Top-right keeps the map's left edge clear for the stop-detail panel and its
  // bottom-left for the time badge.
  L.control.zoom({ position: 'topright' }).addTo(map);

  const theme = currentTheme();
  baseTiles = L.tileLayer(TILES[theme].base, { maxZoom: 19, subdomains: 'abcd', className: 'basemap' }).addTo(map);
  labelTiles = L.tileLayer(TILES[theme].labels, { maxZoom: 19, subdomains: 'abcd', opacity: labelOpacity() }).addTo(map);

  for (const [name, z] of Object.entries(PANES)) {
    map.createPane(name).style.zIndex = String(z);
  }

  return map;
}

function labelOpacity() {
  return isLight() ? 0.8 : 0.7;
}

/** Swap the basemap when the theme flips. */
export function refreshBasemap() {
  const theme = currentTheme();
  baseTiles.setUrl(TILES[theme].base);
  labelTiles.setUrl(TILES[theme].labels);
  labelTiles.setOpacity(labelOpacity());
}

/** Add or remove a layer without caring which state it was already in. */
export function setLayerVisible(layer, visible) {
  if (visible) {
    if (!map.hasLayer(layer)) map.addLayer(layer);
  } else if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  }
}
