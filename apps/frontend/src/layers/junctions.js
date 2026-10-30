/**
 * The signalized-junction layer — turning volumes per approach.
 *
 * **The counts this layer draws are synthetic.** Israel's municipal export set
 * carries no turning-movement data, so `services/junctions_mock.py` manufactures
 * them on top of real OSM geometry: the junctions, their street names and their
 * approach bearings are real, every vehicle number is invented. The payload says
 * so (`mock: true`) and every surface that shows a figure from it is expected to
 * carry the נתוני דמו badge. This file never renders a count without the layer
 * being marked, because the one failure mode `data/README.md` exists to prevent is
 * exactly a fabricated number that looks measured.
 *
 * Markers are diamonds, not circles. The stop layer owns circles, and at city zoom
 * a reader picks out shape before they resolve hue — a round junction dot would be
 * read as a busy stop.
 *
 * Like the stop layer, it follows the time cut: a period pill re-reads the band and
 * every diamond is resized and recoloured on that window's volume.
 */

import { setLayerVisible } from '../core/map.js';
import { state } from '../core/store.js';
import { pointInArea } from '../core/geo.js';
import { data } from '../core/data.js';
import { bandIndex } from '../core/periods.js';
import { juncRamp, mapColors } from '../core/palette.js';
import { fmtNum, escHtml, periodLabel } from '../core/format.js';

export const junctionsLayer = L.layerGroup();

const markers = new Map();   // junction id → Leaflet marker
let onSelect = () => {};

export const junctionsState = {
  visible: [],   // junctions passing the area filter
  breaks: [],    // colour-class upper bounds, recomputed from the visible set
  selected: null,
};

const MOVES = ['left', 'through', 'right'];

/**
 * Vehicles entering on one approach, in the selected period — or its daily total
 * when no period is selected.
 *
 * The daily figure is summed from the bands rather than stored alongside them. A
 * stored total is a second copy of the same fact, and the two drift the first time
 * one is regenerated without the other.
 */
export function approachVolume(approach, period = state.period) {
  if (period === 'all' || period == null) {
    return MOVES.reduce((sum, m) => sum + (approach[m] || []).reduce((a, v) => a + v, 0), 0);
  }
  const band = bandIndex(period);
  if (band == null) return null;
  return MOVES.reduce((sum, m) => sum + (approach[m]?.[band] || 0), 0);
}

/** Everything entering the junction from every approach, for the current cut. */
export function totalVolume(junction, period = state.period) {
  let sum = 0;
  for (const a of junction.approaches) {
    const v = approachVolume(a, period);
    if (v == null) return null;
    sum += v;
  }
  return sum;
}

/** Caption for whatever `totalVolume` is currently returning. */
export function valueLabel() {
  return state.period === 'all'
    ? 'כלי רכב נכנסים ליום'
    : `כלי רכב נכנסים · ${periodLabel(state.period)}`;
}

export function setSelectHandler(fn) {
  onSelect = fn;
}

/**
 * Quantile classes, for the same reason the stop layer uses them: volumes are
 * skewed, and equal-width bins would put a handful of arterial crossings in the
 * top colour and everything else in the bottom one.
 */
function computeBreaks(junctions) {
  const vals = junctions.map(j => totalVolume(j)).filter(v => v != null).sort((a, b) => a - b);
  if (!vals.length) return [];
  const ramp = juncRamp();
  return Array.from({ length: ramp.length - 1 },
    (_, i) => vals[Math.floor(vals.length * (i + 1) / ramp.length)]);
}

export function colorFor(v) {
  if (v == null) return null;
  const ramp = juncRamp();
  let i = 0;
  while (i < junctionsState.breaks.length && v > junctionsState.breaks[i]) i++;
  return ramp[i];
}

// Side length by square root of volume, so the diamond's *area* tracks the figure.
function sizeFor(v, max) {
  if (v == null || !max) return 9;
  return 9 + 13 * Math.sqrt(v / max);
}

function diamond(size, fill, stroke, selected) {
  const box = size + 6;
  return L.divIcon({
    className: 'junc-icon',
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
    html: `<span class="junc-diamond${selected ? ' is-sel' : ''}"
                 style="width:${size}px;height:${size}px;background:${fill};
                        border-color:${selected ? stroke : 'transparent'}"></span>`,
  });
}

export function render() {
  if (!data.junctions) return;
  junctionsLayer.clearLayers();
  markers.clear();

  // The same area rule every other layer uses, so one selection means one thing
  // across the dashboard.
  junctionsState.visible = data.junctions.junctions.filter(
    j => !state.area || pointInArea(j.lat, j.lon, state.area)
  );

  junctionsState.breaks = computeBreaks(junctionsState.visible);

  const max = junctionsState.visible.reduce((m, j) => Math.max(m, totalVolume(j) || 0), 0);
  const ring = mapColors().selected;

  for (const j of junctionsState.visible) {
    const value = totalVolume(j);
    const fill = colorFor(value);
    const selected = junctionsState.selected?.id === j.id;
    const marker = L.marker([j.lat, j.lon], {
      pane: 'pointPane',
      icon: diamond(sizeFor(value, max), fill || 'transparent', ring, selected),
      keyboard: false,
    });

    // The tooltip names the cut and says the figure is demo data. A hover is where
    // a number is most likely to be copied out of context, so the qualifier travels
    // with it rather than living only in the panel.
    marker.bindTooltip(
      `<div dir="rtl" style="text-align:right"><b>${escHtml(j.name)}</b><br>` +
      `${fmtNum(value)} ${escHtml(valueLabel())}<br>` +
      '<span style="opacity:.7">נתוני דמו — נפחים סינתטיים</span></div>',
      { direction: 'top', opacity: 0.95 }
    );

    marker.on('click', () => select(j));
    marker.addTo(junctionsLayer);
    markers.set(j.id, marker);
  }
}

export function select(junction) {
  junctionsState.selected = junction;
  render();
  onSelect(junction);
}

export function clearSelection() {
  junctionsState.selected = null;
  render();
}

export function setVisible(on) {
  setLayerVisible(junctionsLayer, !!on);
}
