/**
 * Civic & service facilities — health, education, community, culture, sport.
 *
 * These are *service* destinations. The municipal export set carries no jobs,
 * floor-area or business-registry data, so nothing here is presented as
 * employment data.
 */

import { setLayerVisible } from '../core/map.js';
import { state } from '../core/store.js';
import { pointInArea } from '../core/geo.js';
import { data } from '../core/data.js';
import { mapColors, destFamilyOf, destFamilyColor } from '../core/palette.js';
import { escHtml } from '../core/format.js';

export const destinationsLayer = L.layerGroup();

/** Family id for a category id, resolved through the loaded category names. */
export function familyOf(categoryId) {
  const cat = data.destinations?.categories[categoryId];
  return destFamilyOf(cat?.name);
}

export function colorOf(categoryId) {
  return destFamilyColor(familyOf(categoryId));
}

export function render() {
  if (!data.destinations) return;
  destinationsLayer.clearLayers();

  const names = data.destinations.categories;
  // A hairline in the basemap's own colour separates dots that overlap, and
  // gives the lighter fills an edge to read against on the light basemap.
  const ring = mapColors().hairline;

  for (const [cat, lat, lon, name, subtype] of data.destinations.points) {
    if (state.destCats && !state.destCats.has(cat)) continue;
    // Respect the area selection, same rule the speed layer uses.
    if (state.area && !pointInArea(lat, lon, state.area)) continue;

    const label = escHtml(name || '(ללא שם)');
    const category = escHtml(names[cat]?.name || '');
    const sub = subtype ? ' · ' + escHtml(subtype) : '';

    // Small and light: city-wide this layer is ~2,400 points and it has to sit
    // over the speed network rather than bury it. Narrow to a neighbourhood (or
    // a few categories) and the dots read individually.
    L.circleMarker([lat, lon], {
      pane: 'pointPane',
      radius: 3,
      color: ring,
      weight: 0.75,
      fillColor: colorOf(cat),
      fillOpacity: 0.9,
    })
      .bindPopup(
        `<div dir="rtl" style="text-align:right"><b>${label}</b><br>` +
        `<span style="opacity:.75">${category}${sub}</span></div>`
      )
      .addTo(destinationsLayer);
  }
}

export function setVisible(visible) {
  setLayerVisible(destinationsLayer, visible);
}
