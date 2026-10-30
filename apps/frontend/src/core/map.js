/**
 * The Leaflet map, its basemap, and the pane stack every layer draws into.
 *
 * `L` is the global from the Leaflet CDN tag in index.html — it is not bundled,
 * so there is no import for it.
 */

import { isLight, currentTheme } from './theme.js';

// Esri's Canvas Gray service, base and labels kept as two separate rasters.
//
// This used to be CARTO (Voyager light / Dark Matter). CARTO retired keyless
// access to basemaps.cartocdn.com, and it does not fail the way a dead endpoint
// normally would: every tile still answers HTTP 200, with a watermark PNG reading
// "API KEY REQUIRED" painted across it. Nothing throws, no request 404s, and the
// map simply fills with the watermark — which is why this looked like a rendering
// bug rather than a provider change.
//
// Canvas Gray is the keyless replacement that keeps the shape this module is built
// on: a label-free base with a matching label raster on top, in both themes, which
// is the split labelOpacity() and refreshBasemap() exist to drive. A single-image
// basemap would have cost the label control entirely.
//
// Note the {z}/{y}/{x} order — Esri's REST tile path is row-before-column, the
// reverse of the XYZ convention. There is no {s} subdomain and no {r} retina
// variant, so both are gone from the options below rather than left as decoration.
const TILES = {
  dark: {
    base: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  },
  light: {
    base: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  },
};

// Canvas Gray is only rendered to z16. Past that it does not 404 — it serves a
// placeholder tile reading "Map data not yet available", so a bare maxZoom of 19
// would print that sentence across the city at the exact zooms you use to look at
// one kerb. maxNativeZoom stops the requests at 16 and lets Leaflet upscale those
// tiles the rest of the way: soft at z19, but a real map. The dashboard's own
// views sit at z13–15, where the tiles are native.
const TILE_OPTS = { maxZoom: 19, maxNativeZoom: 16 };

// Required by the tile terms, and the map credited nobody before this.
const ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap contributors';

/**
 * Draw order, low to high. Leaflet's own overlayPane is 400 and holds the speed
 * segments; everything else is placed relative to that.
 *   350  neighbourhood highlight — a background guide, never over the data
 *   400  speed segments (Leaflet default overlayPane)
 *   405  route casings   ┐ two panes, so EVERY casing lands below EVERY stroke
 *   410  route strokes   ┘ (draw order within one group would not guarantee it)
 *   418  one-way direction arrows — over the road and route network, under the
 *        stop dots (see the rule below)
 *   420  points — stops and places, so a corridor never hides the stop that
 *        explains it
 *
 * Nothing may be added ABOVE pointPane while it renders to canvas. Leaflet stamps
 * every canvas renderer container with `_leaflet_disable_events`, so a click is
 * taken by the topmost canvas, hit-tested against that pane's layers only, and
 * never falls through — a canvas in a higher pane silently kills clicks on every
 * canvas below it, across the whole map rather than only where it has geometry.
 */
const PANES = {
  neighHighlightPane: 350,
  roadPane: 390,          // road network — below speed segments for context
  routeCasingPane: 405,
  routeLinePane: 410,
  arrowPane: 418,         // one-way direction arrows — see the rule above
  pointPane: 420,
};

// Where the map sits for the few hundred milliseconds before border.json lands.
// It is NOT the city: `main.js` recentres on the border's own midpoint as soon as
// loadCore resolves, and the reset button uses that too. Kept as a literal only
// because Leaflet needs some view to initialise with, before any data exists.
export const DEFAULT_CENTER = [31.39, 34.75];

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

  // Bottom-right is the one free corner: the stop-detail panel owns the left
  // edge and the time badge the bottom-left. `prefix: false` drops Leaflet's own
  // flag link so the credit is only the tile source.
  L.control.attribution({ position: 'bottomright', prefix: false })
    .addAttribution(ATTRIBUTION)
    .addTo(map);

  const theme = currentTheme();
  baseTiles = L.tileLayer(TILES[theme].base, { ...TILE_OPTS, className: 'basemap' }).addTo(map);
  labelTiles = L.tileLayer(TILES[theme].labels, { ...TILE_OPTS, opacity: labelOpacity() }).addTo(map);

  for (const [name, z] of Object.entries(PANES)) {
    map.createPane(name).style.zIndex = String(z);
  }

  return map;
}

function labelOpacity() {
  // Held well back. Esri's reference layer names every village for 30 km around,
  // in Hebrew AND Latin, and at full strength that bilingual thicket read as the
  // busiest thing on a map whose subject is the coloured network on top of it.
  return isLight() ? 0.62 : 0.5;
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
