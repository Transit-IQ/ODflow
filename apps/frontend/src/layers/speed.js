/**
 * The bus-speed network, and the congestion halo derived from it.
 *
 * Polylines are built once and restyled on every filter change — rebuilding
 * ~15,000 of them per click would be the slow path. `recolor()` returns the
 * figures the KPI strip reports, so the tiles and the map can never disagree.
 */

import { map, setLayerVisible } from '../core/map.js';
import { state } from '../core/store.js';
import { polylineInArea } from '../core/geo.js';
import { speedColor, speedWeight, mapColors, CONGESTION_KMH } from '../core/palette.js';
import { data } from '../core/data.js';

export const speedLayer = L.layerGroup();
export const congestionLayer = L.layerGroup();

const polylines = [];
let areaMembership = null;   // Set of polylines inside the selected area, or null

/**
 * Average a segment's 35 readings (5 days × 7 periods) across whichever
 * day(s)/period(s) are currently selected.
 */
function segmentSpeed(speeds) {
  const days = state.day === 'avg' ? [0, 1, 2, 3, 4] : [state.day];
  const periods = state.period === 'all' ? [0, 1, 2, 3, 4, 5, 6] : [state.period];
  let sum = 0, n = 0;
  for (const d of days) {
    for (const h of periods) {
      const v = speeds[d * 7 + h];
      if (v && v > 0) { sum += v; n++; }
    }
  }
  return n ? sum / n : null;
}

/** Build the polylines from the loaded segments. Safe to call again on a theme flip. */
export function build() {
  speedLayer.clearLayers();
  polylines.length = 0;
  const colors = mapColors();

  for (const s of data.segments) {
    const pl = L.polyline(s.coordinates, { color: colors.empty, weight: 3, opacity: 0.9 });
    pl._speeds = s.speeds;

    pl.on('mouseover', function () { this.setStyle({ weight: (this._w || 3) + 3 }); });
    pl.on('mouseout', function () { this.setStyle({ weight: this._w || 3 }); });
    pl.on('click', function () {
      const v = segmentSpeed(this._speeds);
      const mid = this.getLatLngs()[Math.floor(this.getLatLngs().length / 2)];
      L.popup().setLatLng(mid)
        .setContent(`<div class="pp">מהירות אוטובוס במקטע<br><b>${v ? v.toFixed(1) : '—'} קמ״ש</b></div>`)
        .openOn(map);
    });

    polylines.push(pl);
    speedLayer.addLayer(pl);
  }

  // polylines was just rebuilt from scratch — recompute which of them fall
  // inside the currently-selected area, so membership stays correct even if an
  // area was picked before the segments finished loading.
  computeMembership();
}

/** Recompute which polylines fall inside the selected area. The expensive part. */
export function computeMembership() {
  areaMembership = state.area
    ? new Set(polylines.filter(pl => polylineInArea(pl, state.area)))
    : null;
}

/**
 * Restyle every segment for the current filter, and return the figures the KPI
 * strip shows. Segments are always drawn for full-city context — only the
 * totals are scoped to the selected area.
 */
export function recolor() {
  congestionLayer.clearLayers();
  const colors = mapColors();

  let sum = 0, counted = 0, below = 0;

  for (const pl of polylines) {
    const v = segmentSpeed(pl._speeds);
    const w = speedWeight(v);
    pl._w = w;
    pl.setStyle({ color: speedColor(v), opacity: v == null ? 0.5 : 0.9, weight: w });

    if (v == null) continue;
    if (areaMembership && !areaMembership.has(pl)) continue;

    sum += v;
    counted++;
    if (v < CONGESTION_KMH) {
      below++;
      congestionLayer.addLayer(
        L.polyline(pl.getLatLngs(), { color: colors.cong, weight: 8, opacity: 0.35 })
      );
    }
  }

  return {
    avgSpeed: counted ? sum / counted : null,
    congestedPct: counted ? Math.round((below / counted) * 100) : null,
    segmentCount: areaMembership ? areaMembership.size : data.segments.length,
  };
}

export function setVisible({ speed, cong }) {
  setLayerVisible(speedLayer, speed);
  setLayerVisible(congestionLayer, cong);
}
