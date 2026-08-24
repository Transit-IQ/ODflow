/**
 * The bus-stop layer.
 *
 * Every figure comes from data/stops.json, generated out of the תלת״ן station
 * survey joined to GTFS for the line numbers. Nothing here invents a number: a
 * station the survey never covered renders as "no survey data", never as zero.
 *
 * The layer follows the time cut as well as the area filter: pick a period (or
 * press הרצת יום and let it step through all seven) and every dot is resized,
 * recoloured and re-classified on that window's boardings, so the morning peak
 * and the late evening are visibly different networks rather than one static
 * daily picture. The survey is a weekday average, so the day pills א׳–ה׳ move
 * the speed network but correctly leave the stops alone.
 */

import { setLayerVisible } from '../core/map.js';
import { state } from '../core/store.js';
import { pointInArea } from '../core/geo.js';
import { data } from '../core/data.js';
import { boardingsFor } from '../core/boardings.js';
import { stationsForRoutes } from '../core/routeStations.js';
import * as routes from './routes.js';
import { stopRamp, mapColors } from '../core/palette.js';
import { fmtNum, escHtml, periodLabel } from '../core/format.js';

export const stopsLayer = L.layerGroup();

const markers = new Map();   // stop key → Leaflet marker
let onSelect = () => {};

export const stopsState = {
  // Two sets, because "what is drawn" and "what the area's totals are summed
  // from" stopped being the same thing once a drawn line brought its own stops in.
  visible: [],   // every station on the map right now — area stops plus line stops
  inArea: [],    // survey stations passing the area filter, and ONLY those. Every
                 // roll-up reads this: a line's stops reach far outside the
                 // selected neighbourhood, and summing them into a neighbourhood
                 // figure would inflate it with boardings from another city.
  breaks: [],    // colour-class upper bounds, recomputed from the visible stations
  selected: null,
};

/**
 * What the layer is drawing for a station right now: its boardings in the
 * selected period, or its daily total when no period is selected.
 *
 * Exported because the legend and the roll-up panel describe this same layer,
 * and reading a second figure out of the station record would let them drift
 * from the dots on the map.
 */
export function valueFor(station) {
  return boardingsFor(station, state.period);
}

/** Caption for whatever `valueFor` is currently returning. */
export function valueLabel() {
  return state.period === 'all' ? 'עליות ליום' : `עליות · ${periodLabel(state.period)}`;
}

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
  const vals = stations.map(valueFor).filter(v => v != null).sort((a, b) => a - b);
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
  stopsState.inArea = data.stops.stations.filter(
    s => !state.area || pointInArea(s.lat, s.lon, state.area)
  );

  // A drawn line brings its whole stop sequence, area filter or not — the point
  // of drawing a line is to see where it goes, and it does not stop at the
  // neighbourhood boundary. These are the same station records the survey set
  // holds, so a stop shared by the area and the line is one dot with one panel;
  // stops the survey never covered come back with a null boardings_day and draw
  // as the hollow ring this layer already uses for "not surveyed".
  const base = state.layers.stops ? stopsState.inArea : [];
  const seen = new Set(base);
  stopsState.visible = base.concat(
    stationsForRoutes(routes.activeRoutes()).filter(s => !seen.has(s))
  );

  stopsState.breaks = computeBreaks(stopsState.visible);

  // Classes and radii are rescaled to the period on screen, not to the daily
  // maximum. A quiet late evening should read as a quiet evening's own spread of
  // busy and empty stops, not as a city where every dot has gone dark.
  const max = stopsState.visible.reduce((m, s) => Math.max(m, valueFor(s) || 0), 0);
  const colors = mapColors();
  // Un-surveyed stops stay hollow; surveyed ones get a hairline in the
  // basemap's own colour so overlapping dots stay countable.
  const hollowRing = colors.empty;

  for (const s of stopsState.visible) {
    const value = valueFor(s);
    const fill = colorFor(value);
    const marker = L.circleMarker([s.lat, s.lon], {
      pane: 'pointPane',
      radius: 1.2*radiusFor(value, max),
      color: fill ? colors.hairline : hollowRing,
      weight: fill ? 1 : 1.5,
      fillColor: fill || 'transparent',
      fillOpacity: fill ? 0.9 : 0,
    });

    marker._stroke = fill ? colors.hairline : hollowRing;
    marker._weight = fill ? 1 : 1.5;

    // Under a period cut the tooltip names the window and keeps the daily total
    // beside it, so a dot that just shrank can be read against what it was.
    marker.bindTooltip(
      `<div dir="rtl" style="text-align:right"><b>${escHtml(s.name)}</b><br>` +
      (value == null
        ? 'ללא נתוני סקר'
        : state.period !== 'all'
          ? `${fmtNum(value)} עליות · ${escHtml(periodLabel(state.period))}<br>` +
            `<span style="opacity:.7">${fmtNum(s.boardings_day)} עליות ביום</span>`
          : `${fmtNum(value)} עליות ביום`) +
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

/**
 * The layer is on the map when the toggle asks for it OR a line is drawn.
 *
 * A line's stops must not depend on an unrelated switch: drawing a route and
 * getting no stops because "תחנות ועליות" happened to be off would read as a line
 * with no stops rather than as a hidden layer.
 */
export function syncVisibility() {
  setLayerVisible(stopsLayer, state.layers.stops || routes.activeRoutes().length > 0);
}
