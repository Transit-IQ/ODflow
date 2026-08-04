import './LayerToggles.css';
import { html, $ } from '../../core/dom.js';
import { state, setState, notify } from '../../core/store.js';
import { DEST_FAMILIES, destFamilyColor, stopRamp } from '../../core/palette.js';
import { data } from '../../core/data.js';
import { colorOf, familyOf } from '../../layers/destinations.js';
import { stopsState } from '../../layers/stops.js';
import { fmtNum, escHtml } from '../../core/format.js';

/**
 * Layer switches, the destination category filter and the stops legend.
 *
 * Each switch declares its layer's colour via --tint, so a live switch wears
 * the colour that layer wears on the map.
 */
const LAYERS = [
  { key: 'speed', label: 'רשת מהירויות אוטובוס',   tint: 'var(--ramp)',   swatch: null },
  { key: 'cong',  label: 'מוקדי גודש (&lt;15 קמ״ש)', tint: 'var(--c-cong)', swatch: 'background:var(--sp1)' },
  { key: 'roads', label: 'רשת דרכים + כיוונים',    tint: '#f9b29c',       swatch: 'background:#f9b29c' },
  { key: 'dest',  label: 'מוקדי שירות ותעסוקה',     tint: 'var(--c-place)', swatch: 'multi' },
  { key: 'stops', label: 'תחנות ועליות',            tint: 'var(--c-ride)', swatch: 'background:var(--primary)' },
];

export function LayerToggles() {
  const el = html`
    <div class="block" style="--tint:var(--ramp)">
      <h3>שכבות מפה</h3>
      ${LAYERS.map(l => `
        <div class="toggle${state.layers[l.key] ? ' on' : ''}" data-layer="${l.key}" style="--tint:${l.tint}">
          <span class="sw"></span>
          ${l.swatch === 'multi' ? '<span class="tc tc-multi"></span>'
            : l.swatch ? `<span class="tc" style="${l.swatch}"></span>` : ''}
          <span class="tl">${l.label}</span>
        </div>
        ${l.key === 'dest' ? '<div class="dest-cats" hidden></div>' : ''}
        ${l.key === 'stops' ? '<div id="stopsLegend" class="legend" hidden></div>' : ''}`).join('')}
    </div>`;

  const catsEl = $(el, '.dest-cats');
  const legendEl = $(el, '#stopsLegend');

  el.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => {
      const key = t.dataset.layer;
      state.layers[key] = !state.layers[key];
      t.classList.toggle('on', state.layers[key]);
      notify(['layers']);
    });
  });

  /** Rebuild the 16 category checkboxes, grouped under their service family. */
  function renderCategories() {
    if (!data.destinations) return;

    const rowsFor = family => data.destinations.categories
      .filter(c => familyOf(c.id) === family.id)
      .map(c => `
        <label class="dest-cat" title="${escHtml(c.name)}">
          <input type="checkbox" data-cat="${c.id}" ${!state.destCats || state.destCats.has(c.id) ? 'checked' : ''}>
          <span class="dest-dot" style="background:${colorOf(c.id)}"></span>
          <span class="dest-name">${escHtml(c.name)}</span>
          <span class="dest-count">${fmtNum(c.count)}</span>
        </label>`).join('');

    catsEl.innerHTML = DEST_FAMILIES.map(f => {
      const rows = rowsFor(f);
      if (!rows) return '';
      return `<div class="dest-group">
                <span class="dest-dot" style="background:${destFamilyColor(f.id)}"></span>${f.name}
              </div>${rows}`;
    }).join('');

    catsEl.querySelectorAll('input[data-cat]').forEach(cb => {
      cb.addEventListener('change', () => {
        setState({
          destCats: new Set([...catsEl.querySelectorAll('input[data-cat]:checked')]
            .map(i => +i.dataset.cat)),
        });
      });
    });
  }

  /**
   * Ranges are printed from the breaks the map actually classified with, so the
   * legend can never describe a classification the map isn't using.
   */
  function renderStopsLegend() {
    if (!data.stops) return;
    const ramp = stopRamp();
    const surveyed = stopsState.visible.filter(s => s.boardings_day != null).length;

    const rows = ramp.map((c, i) => {
      const lo = i === 0 ? 0 : stopsState.breaks[i - 1];
      const hi = i < stopsState.breaks.length ? stopsState.breaks[i] : null;
      const label = hi == null ? `${fmtNum(lo)}+` : `${fmtNum(lo)}–${fmtNum(hi)}`;
      return `<div class="lg"><span style="background:${c}"></span> ${label}</div>`;
    }).join('');

    legendEl.innerHTML = `
      <div class="stops-legend-title">עליות ליום · ${fmtNum(surveyed)} תחנות עם נתוני סקר</div>
      ${rows}
      <div class="lg"><span class="lg-hollow"></span> ללא נתוני סקר</div>
      <div class="stops-legend-note">גודל העיגול ביחס למספר העליות</div>`;
  }

  /** Show or hide the two panels that only make sense when their layer is on. */
  function syncPanels() {
    catsEl.hidden = !state.layers.dest;
    legendEl.hidden = !state.layers.stops;
  }

  syncPanels();

  return { el, renderCategories, renderStopsLegend, syncPanels };
}
