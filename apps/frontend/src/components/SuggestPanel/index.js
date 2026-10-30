import './SuggestPanel.css';
import { html, $ } from '../../core/dom.js';
import { state, setState, notify } from '../../core/store.js';
import { data } from '../../core/data.js';
import { map } from '../../core/map.js';
import { fmtNum, escHtml } from '../../core/format.js';
import { pruneLines, retainedPct } from '../../core/suggest.js';
import * as routes from '../../layers/routes.js';

/**
 * קווים מוצעים — the stop-pruning proposal, over the lines already drawn.
 *
 * It sits below the layer switches because it acts on a choice made above it: you
 * pick an area, you pick lines, and only then does "what would this line look like
 * without its pass-through stops" mean anything. With no line active the block says
 * so rather than showing an empty set of tiles.
 *
 * Every figure here comes from `core/suggest.js`, the same module the map layer
 * calls, so the count in the tile and the struck-through dots on the map are always
 * the same answer to the same question.
 */
export function SuggestPanel() {
  const el = html`
    <div class="block" style="--tint:var(--c-net)">
      <h3>קווים מוצעים</h3>

      <div class="toggle${state.suggest.on ? ' on' : ''}" data-sug style="--tint:var(--c-net)">
        <span class="sw"></span>
        <span class="tl">הצג הצעה לצמצום תחנות</span>
      </div>

      <div class="sug-body" hidden>
        <div class="filter-row">
          <span class="filter-label">הסר תחנות מעל</span>
          <input type="range" id="sugPctSlider" min="0" max="100" step="5" value="${state.suggest.pctMax}">
          <span id="sugPctVal">${state.suggest.pctMax}%</span>
        </div>
        <div class="sug-hint">אחוז נסיעות המעבר בתחנה</div>

        <div class="sug-tiles"></div>
        <div class="sug-lines"></div>
        <div class="sug-note"></div>
      </div>
    </div>`;

  const toggleEl = $(el, '[data-sug]');
  const bodyEl = $(el, '.sug-body');
  const slider = $(el, '#sugPctSlider');
  const valEl = $(el, '#sugPctVal');
  const tilesEl = $(el, '.sug-tiles');
  const linesEl = $(el, '.sug-lines');
  const noteEl = $(el, '.sug-note');

  toggleEl.addEventListener('click', () => {
    state.suggest.on = !state.suggest.on;
    toggleEl.classList.toggle('on', state.suggest.on);
    // A mutated nested object is not an assignment, so the store is told directly
    // which key moved — same contract the layer switches use.
    notify(['suggest']);
  });

  slider.addEventListener('input', () => {
    valEl.textContent = `${slider.value}%`;
    state.suggest.pctMax = +slider.value;
    notify(['suggest']);
  });

  function tile(value, label, accent) {
    return `<div class="sug-tile">
              <div class="sug-tile-val"${accent ? ` style="color:${accent}"` : ''}>${value}</div>
              <div class="sug-tile-lbl">${label}</div>
            </div>`;
  }

  function render() {
    bodyEl.hidden = !state.suggest.on;
    if (!state.suggest.on) return;

    const active = routes.activeRoutes();

    // The proposal is computed from the survey file. Until it has loaded there is
    // nothing to prune, and saying "0 stops removed" would be a claim rather than
    // an absence.
    if (!active.length || !data.stops) {
      tilesEl.innerHTML = '';
      linesEl.innerHTML = '';
      noteEl.innerHTML = !active.length
        ? '<div class="sug-empty">בחר קווים באזור הניתוח כדי לראות הצעה.</div>'
        : '<div class="sug-empty">טוען נתוני תחנות…</div>';
      return;
    }

    const result = pruneLines(active, state.suggest.pctMax, state.period);
    const pct = retainedPct(result);

    tilesEl.innerHTML =
      tile(fmtNum(result.removed.length), 'תחנות שהוסרו', 'var(--c-cong)') +
      tile(fmtNum(result.kept.length), 'תחנות שנשמרו') +
      tile(pct == null ? '—' : `${pct.toFixed(0)}%`, 'מהעליות נשמרו', 'var(--primary)');

    linesEl.innerHTML = result.lines.map(line => {
      const total = line.stations.length;
      const kept = line.kept.length;
      const linePct = retainedPct(line);
      const color = routes.colorFor(line.route.route_id);
      return `
        <div class="sug-line" data-route="${escHtml(line.route.route_id)}" title="לחץ למיקוד הקו במפה">
          <span class="sug-num" style="background:${color}">${escHtml(line.route.route_short_name || '?')}</span>
          <span class="sug-counts">${fmtNum(total)} ← ${fmtNum(kept)} תחנות</span>
          <span class="sug-ret">${linePct == null ? '—' : `${linePct.toFixed(0)}%`}</span>
        </div>`;
    }).join('');

    linesEl.querySelectorAll('.sug-line').forEach(row => {
      row.addEventListener('click', () => {
        const line = result.lines.find(l => l.route.route_id === row.dataset.route);
        if (line?.route.coordinates?.length) {
          map.fitBounds(L.latLngBounds(line.route.coordinates), { padding: [30, 30] });
        }
      });
    });

    // Naming the exemptions is not a nicety. Set the threshold to 40% and a 71%
    // stop is still on the line, and without this the tool looks broken rather
    // than careful.
    const unsurveyed = new Set(result.lines.flatMap(l => l.unsurveyed)).size;
    noteEl.innerHTML = `
      <div class="sug-rules">
        מסלול הקו נשמר כפי שהוא — משתנות רק התחנות שבהן הוא עוצר.
        תחנות קצה אינן מוסרות, וכך גם ${fmtNum(unsurveyed)} תחנות שלא נכללו בסקר
        ואין עבורן אחוז נסיעות מעבר.
      </div>`;
  }

  return { el, render };
}
