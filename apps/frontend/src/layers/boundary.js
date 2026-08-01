/**
 * Two outlines: the city limits, and the highlight around the selected
 * neighbourhood.
 *
 * The highlight draws in its own pane below every data layer, so it always
 * reads as a background guide rather than a layer sitting on top of the transit
 * data — regardless of the order things get added to the map.
 */

import { map } from '../core/map.js';
import { mapColors } from '../core/palette.js';

export const cityBorderLayer = L.layerGroup();

let highlight = null;

function outlineStyle(extra = {}) {
  return { color: mapColors().focus, opacity: 0.7, fill: false, dashArray: '4 4', ...extra };
}

/** Draw (or redraw, on a theme flip) the city-limits outline. */
export function drawCityBorder(geoJson) {
  cityBorderLayer.clearLayers();
  if (!geoJson) return;
  L.geoJSON(geoJson, {
    style: outlineStyle({ weight: 2, opacity: 0.75, dashArray: '6 4' }),
  }).addTo(cityBorderLayer);
}

/**
 * Outline the selected neighbourhood and return bounds to fit the map to.
 *
 * `neigh.boundary` is an official municipal polygon and exists for most, but not
 * all, of these areas — some are informal zones (a mall complex, "city centre",
 * a boulevard) with no official boundary. Those fall back to the configured
 * bbox rectangle, which stays only an approximate outline and says so in its
 * tooltip.
 */
export function highlightArea(neigh) {
  clearHighlight();
  if (!neigh) return null;

  const style = outlineStyle({ pane: 'neighHighlightPane', weight: 1.5 });

  if (neigh.boundary) {
    highlight = L.geoJSON(neigh.boundary, { style });
    highlight.bindTooltip(neigh.name);
  } else {
    const b = neigh.bbox;
    highlight = L.rectangle([[b.min_lat, b.min_lon], [b.max_lat, b.max_lon]], style);
    highlight.bindTooltip(`${neigh.name} (אזור משוער — אין גבול מדויק בנתונים)`);
  }

  highlight.addTo(map);
  return highlight.getBounds();
}

export function clearHighlight() {
  if (highlight) {
    map.removeLayer(highlight);
    highlight = null;
  }
}

/** Re-step both outlines after a theme flip. */
export function refreshOutlines(borderGeoJson, neigh) {
  drawCityBorder(borderGeoJson);
  if (neigh) highlightArea(neigh);
}
