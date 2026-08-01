/**
 * The bus-stop layer.
 *
 * Every figure comes from data/stops.json, generated out of the תלת״ן station
 * survey joined to GTFS for the line numbers. Nothing here invents a number: a
 * station the survey never covered renders as "no survey data", never as zero.
 */

import { setLayerVisible } from '../core/map.js';
import { state } from '../core/store.js';
import { pointInArea } from '../core/geo.js';
import { data } from '../core/data.js';
import { stopRamp, mapColors } from '../core/palette.js';
import { fmtNum, escHtml } from '../core/format.js';

export const stopsLayer = L.layerGroup();

const markers = new Map();   // stop key → Leaflet marker
let onSelect = () => {};

export const stopsState = {
  visible: [],   // stations passing the current area filter
  breaks: [],    // colour-class upper bounds, recomputed from the visible stations
  selected: null,
};

export function stopKey(s) {
  return `${s.code}@${s.lat},${s.lon}`;
}

/** Register the callback fired when a stop marker is clicked. */
export function setSelectHandler(fn) {
  onSelect = fn;
}

/**
 * Quantile classes: five bins holding a similar number of stations each.
 * Boardings are heavily skewed (a central terminal carries orders of magnitude
 * more than a side street), so equal-width bins would put almost every station
 * in the lowest colour and waste the ramp.
 */
function computeBreaks(stations) {
  const vals = stations.map(s => s.boardings_day).filter(v => v != null).sort((a, b) => a - b);
  if (!vals.length) return [];
  const ramp = stopRamp();
  return Array.from({ length: ramp.length - 1 },
    (_, i) => vals[Math.floor(vals.length * (i + 1) / ramp.length)]);
}

export function colorFor(v) {
  if (v == null) return null;    // not surveyed — drawn as a hollow ring
  const ramp = stopRamp();
  let i = 0;
  while (i < stopsState.breaks.length && v > stopsState.breaks[i]) i++;
  return ramp[i];
}

// Radius by square root of boardings, so the *area* of the circle is
// proportional to the value — scaling the radius directly would exaggerate the
// busy stops.
function radiusFor(v, max) {
  if (v == null || !max) return 3;
  return 3.5 + 9 * Math.sqrt(v / max);
}

export function render() {
  if (!data.stops) return;
  stopsLayer.clearLayers();
  markers.clear();

  // Same area rule the speed and destination layers use.
  stopsState.visible = data.stops.stations.filter(
    s => !state.area || pointInArea(s.lat, s.lon, state.area)
  );
  stopsState.breaks = computeBreaks(stopsState.visible);

  const max = stopsState.visible.reduce((m, s) => Math.max(m, s.boardings_day || 0), 0);
  const colors = mapColors();
  // Un-surveyed stops stay hollow; surveyed ones get a hairline in the
  // basemap's own colour so overlapping dots stay countable.
  const hollowRing = colors.empty;

  for (const s of stopsState.visible) {
    const fill = colorFor(s.boardings_day);
    const marker = L.circleMarker([s.lat, s.lon], {
      pane: 'pointPane',
      radius: radiusFor(s.boardings_day, max),
      color: fill ? colors.hairline : hollowRing,
      weight: fill ? 1 : 1.5,
      fillColor: fill || 'transparent',
      fillOpacity: fill ? 0.9 : 0,
    });

    marker._stroke = fill ? colors.hairline : hollowRing;
    marker._weight = fill ? 1 : 1.5;

    marker.bindTooltip(
      `<div dir="rtl" style="text-align:right"><b>${escHtml(s.name)}</b><br>` +
      (s.boardings_day != null ? `${fmtNum(s.boardings_day)} עליות ביום` : 'ללא נתוני סקר') +
      '</div>',
      { direction: 'top', opacity: 0.95 }
    );

    marker.on('click', () => select(s));
    marker.addTo(stopsLayer);
    markers.set(stopKey(s), marker);
  }

  if (stopsState.selected) highlightSelected();
}

/**
 * The selected stop is ringed in the ink colour rather than a brand hue — the
 * ramp already owns teal, so a teal halo on a teal dot would read as "busier".
 */
export function highlightSelected() {
  const ring = mapColors().selected;
  for (const [key, m] of markers) {
    const on = stopsState.selected && key === stopKey(stopsState.selected);
    m.setStyle({ color: on ? ring : m._stroke, weight: on ? 2.5 : m._weight });
    if (on) m.bringToFront();
  }
}

export function select(station) {
  stopsState.selected = station;
  highlightSelected();
  onSelect(station);
}

export function clearSelection() {
  stopsState.selected = null;
  highlightSelected();
}

export function setVisible(visible) {
  setLayerVisible(stopsLayer, visible);
}
