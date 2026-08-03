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
 * Outline every selected neighbourhood and return bounds to fit the map to.
 *
 * Two outlines per neighbourhood, because the selection means two things:
 * the firm line is the official municipal boundary — what the neighbourhood is,
 * and what its resident count is measured inside — and the faint one around it
 * is the analysis catchment, the border grown by `analysis_buffer_m`, which is
 * what every layer is actually filtered by. Drawing only the official line would
 * leave the stops just outside it looking like a filtering bug.
 *
 * `neigh.boundary` is an official municipal polygon and exists for most, but not
 * all, of these areas — some are informal zones (a mall complex, "city centre",
 * a boulevard) with no official boundary. Those fall back to the configured
 * bbox rectangle, which stays only an approximate outline and says so in its
 * tooltip.
 */
export function highlightAreas(neighs) {
  clearHighlight();
  const list = (Array.isArray(neighs) ? neighs : [neighs]).filter(Boolean);
  if (!list.length) return null;

  highlight = L.layerGroup();

  const style = outlineStyle({ pane: 'neighHighlightPane', weight: 1.5 });
  const catchmentStyle = outlineStyle({
    pane: 'neighHighlightPane', weight: 1, opacity: 0.45, dashArray: '2 5',
  });

  for (const neigh of list) {
    let shapeLayer;
    if (neigh.boundary) {
      shapeLayer = L.geoJSON(neigh.boundary, { style });
      shapeLayer.bindTooltip(neigh.name);
    } else {
      const b = neigh.bbox;
      shapeLayer = L.rectangle([[b.min_lat, b.min_lon], [b.max_lat, b.max_lon]], style);
      shapeLayer.bindTooltip(`${neigh.name} (אזור משוער — אין גבול מדויק בנתונים)`);
    }

    if (neigh.analysis_boundary) {
      const catchment = L.geoJSON(neigh.analysis_boundary, { style: catchmentStyle });
      catchment.bindTooltip(`${neigh.name} · טווח ניתוח ${neigh.analysis_buffer_m} מ׳ מהגבול`);
      catchment.addTo(highlight);
    }

    shapeLayer.addTo(highlight);
  }

  highlight.addTo(map);
  return bounds(list);
}

/** The bounds of everything selected, catchment included, for the map to fit. */
function bounds(list) {
  const b = L.latLngBounds([]);
  for (const neigh of list) {
    const box = neigh.analysis_bbox || neigh.bbox;
    b.extend([[box.min_lat, box.min_lon], [box.max_lat, box.max_lon]]);
  }
  return b.isValid() ? b : null;
}

export function clearHighlight() {
  if (highlight) {
    map.removeLayer(highlight);
    highlight = null;
  }
}

/** Re-step both outlines after a theme flip. */
export function refreshOutlines(borderGeoJson, neighs) {
  drawCityBorder(borderGeoJson);
  if (neighs?.length) highlightAreas(neighs);
}
