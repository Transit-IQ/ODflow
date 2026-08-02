import './AreaPanel.css';
import { html, $ } from '../../core/dom.js';
import { setState } from '../../core/store.js';
import { data, loadNeighbourhoods, loadRoutesIndex } from '../../core/data.js';
import { fmtNum, escHtml } from '../../core/format.js';
import { agencyLabel } from '../../core/agencies.js';
import { groupByKind } from '../../core/routeKind.js';
import * as routes from '../../layers/routes.js';

/**
 * Picking the analysis area, and the bus lines inside it.
 *
 * The area is the first thing an analyst chooses, so this block sits at the top
 * of the sidebar. Selecting one narrows every KPI and every layer; the map
 * still draws the whole city for context.
 */
export function AreaPanel({ onAreaChange } = {}) {
  const el = html`
    <div class="block" style="--tint:var(--c-place)">
      <h3>אזור ניתוח</h3>

      <div class="neigh-select-wrap">
        <select class="neigh-select" aria-label="בחירת שכונה">
          <option value="">כל העיר — ללא סינון</option>
        </select>
      </div>

      <div class="neigh-routes" hidden>
        <div class="neigh-header"></div>
        <div class="neigh-stats" hidden></div>

        <h3 style="--tint:var(--c-net)">קווי אוטובוס באזור</h3>

        <div class="neigh-actions">
          <button class="btn ghost" data-all>בחר הכל</button>
          <button class="btn ghost" data-clear>נקה</button>
        </div>

        <div class="neigh-loading" hidden><span class="neigh-spinner"></span> טוען קווים…</div>
        <div class="neigh-route-count"></div>
        <div class="lines-scroll" style="max-height:280px"></div>
      </div>
    </div>`;

  const selectEl = $(el, '.neigh-select');
  const routesEl = $(el, '.neigh-routes');
  const headerEl = $(el, '.neigh-header');
  const statsEl = $(el, '.neigh-stats');
  const loadingEl = $(el, '.neigh-loading');
  const countEl = $(el, '.neigh-route-count');
  const listEl = $(el, '.lines-scroll');

  let routesInArea = [];

  // ── Population ──────────────────────────────────────────────────────────
  // Real resident counts, apportioned from CBS statistical areas onto the
  // official municipal polygon by the offline pipeline. Areas with no official
  // polygon (a boulevard, a retail complex) carry no population and the block
  // simply stays hidden — better an absent figure than a fabricated one.
  function renderPopulation(neigh) {
    const pop = neigh?.population;
    if (!pop?.total) {
      statsEl.hidden = true;
      statsEl.replaceChildren();
      return;
    }

    const age = pop.by_age || {};
    const sum = (...keys) => keys.reduce((acc, k) => acc + (age[k] || 0), 0);
    const pct = n => (pop.total ? Math.round((n / pop.total) * 100) : 0);

    statsEl.innerHTML = `
      <div class="neigh-stat-row">
        <div class="neigh-stat">
          <span class="neigh-stat-val">${fmtNum(pop.total)}</span>
          <span class="neigh-stat-lbl">תושבים</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${pct(sum('g0to9', 'g10to19'))}%</span>
          <span class="neigh-stat-lbl">בני 0–19</span>
        </div>
        <div class="neigh-stat">
          <span class="neigh-stat-val">${pct(sum('g60to69', 'g70to79', 'g80up'))}%</span>
          <span class="neigh-stat-lbl">בני 60+</span>
        </div>
      </div>
      <div class="neigh-stat-src">מקור: אזורים סטטיסטיים למ״ס 2022, עיריית תל אביב-יפו</div>`;
    statsEl.hidden = false;
  }

  // ── Route list ──────────────────────────────────────────────────────────
  // Split into עירוני / בין-עירוני, urban first — the lines that stay inside
  // the city are the ones a municipal planner acts on, and they are a small
  // minority of what passes through any given neighbourhood.
  function routeRow(r) {
    const active = routes.isActive(r.route_id);
    const color = routes.colorFor(r.route_id);

    const li = html`
      <li class="${active ? 'neigh-active' : ''}">
        <span class="num" style="background:${active ? color : `color-mix(in srgb, ${color} 20%, transparent)`};color:${active ? '#fff' : color}">${escHtml(r.route_short_name || '?')}</span>
        <span class="desc" title="${escHtml(r.route_long_name || '')}">${escHtml(r.route_long_name || 'ללא תיאור')}</span>
        <span class="ag">${escHtml(agencyLabel(r.agency_id))}</span>
        ${active ? `<span class="neigh-color-dot" style="background:${color}"></span>` : ''}
      </li>`;

    li.addEventListener('click', () => { routes.toggle(r); renderRoutes(); });
    return li;
  }

  function renderRoutes() {
    listEl.replaceChildren();

    for (const group of groupByKind(routesInArea)) {
      listEl.append(html`
        <div class="lines-group">
          <span>${group.label}</span>
          <span class="lines-group-n">${fmtNum(group.routes.length)}</span>
        </div>`);

      const ul = html`<ul class="lines"></ul>`;
      ul.append(...group.routes.map(routeRow));
      listEl.append(ul);
    }
  }

  $(el, '[data-all]').addEventListener('click', () => {
    routesInArea.forEach(r => routes.activate(r));
    renderRoutes();
  });

  $(el, '[data-clear]').addEventListener('click', () => {
    routes.clearAll();
    renderRoutes();
  });

  // ── Selection ───────────────────────────────────────────────────────────
  selectEl.addEventListener('change', async () => {
    routes.clearAll();
    routesInArea = [];
    renderRoutes();

    const neigh = data.neighbourhoods.find(n => n.id === selectEl.value) || null;

    if (!neigh) {
      routesEl.hidden = true;
      setState({ area: null, areaName: null, areaRecord: null });
      onAreaChange?.(null);
      return;
    }

    routesEl.hidden = false;
    loadingEl.hidden = false;
    countEl.textContent = '';

    setState({
      area: { bbox: neigh.bbox, boundary: neigh.boundary },
      areaName: neigh.name,
      areaRecord: neigh,
    });
    onAreaChange?.(neigh);

    renderPopulation(neigh);

    try {
      const index = await loadRoutesIndex();
      routesInArea = (neigh.route_ids || []).map(id => index[id]).filter(Boolean);
    } catch (e) {
      console.error('[AreaPanel] failed to load the route index:', e);
      loadingEl.hidden = true;
      headerEl.textContent = `שגיאה: ${e.message}`;
      return;
    }

    loadingEl.hidden = true;
    headerEl.innerHTML = `<b>${escHtml(neigh.name)}</b> · ${fmtNum(routesInArea.length)} קווים פעילים ב-GTFS`;
    countEl.textContent = routesInArea.length
      ? `${fmtNum(routesInArea.length)} קווים · לחץ לבחירה (ניתן לבחור מספר)`
      : 'לא נמצאו קווים באזור זה';

    renderRoutes();
  });

  /** Fill the select. Opens city-wide: the KPI tiles then describe the whole network. */
  async function load() {
    try {
      const list = await loadNeighbourhoods();
      selectEl.append(...list.map(n => new Option(n.name, n.id)));
    } catch (e) {
      console.error('[AreaPanel] failed to load neighbourhoods.json:', e);
    }
  }

  /** Drop every active route — used by the reset button. */
  function clearRoutes() {
    routes.clearAll();
    renderRoutes();
  }

  return { el, load, renderRoutes, clearRoutes };
}
