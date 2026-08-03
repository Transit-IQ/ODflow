import './AreaPanel.css';
import { html, $ } from '../../core/dom.js';
import { setState } from '../../core/store.js';
import { combineAreas } from '../../core/geo.js';
import { data, loadNeighbourhoods, loadRoutesIndex } from '../../core/data.js';
import { fmtNum, escHtml } from '../../core/format.js';
import { agencyLabel } from '../../core/agencies.js';
import { groupByKind } from '../../core/routeKind.js';
import * as routes from '../../layers/routes.js';

/**
 * Picking the analysis area, and the bus lines that serve it.
 *
 * The area is the first thing an analyst chooses, so this block sits at the top
 * of the sidebar. Any number of neighbourhoods can be selected at once —
 * corridors and gaps rarely respect one boundary, and comparing "these three
 * together" against the city is the question the dashboard exists to answer.
 * Selecting none means the whole city, which is what it opens on.
 *
 * The selection is a checkbox list rather than a native multi-select: there are
 * ~70 neighbourhoods with Hebrew names, so a filter box is worth more than the
 * ctrl-click convention nobody discovers, and the checkboxes make it obvious
 * that more than one is allowed.
 */
export function AreaPanel({ onAreaChange } = {}) {
  const el = html`
    <div class="block" style="--tint:var(--c-place)">
      <h3>אזור ניתוח</h3>

      <div class="neigh-picker">
        <input class="neigh-search" type="search" placeholder="חיפוש שכונה…" aria-label="חיפוש שכונה">
        <div class="neigh-chips" hidden></div>
        <div class="neigh-summary">
          <span class="neigh-summary-txt">כל העיר — ללא סינון</span>
          <button class="neigh-clear" hidden>נקה בחירה</button>
        </div>
        <div class="neigh-list" role="group" aria-label="בחירת שכונות"></div>
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

  const searchEl = $(el, '.neigh-search');
  const chipsEl = $(el, '.neigh-chips');
  const summaryEl = $(el, '.neigh-summary-txt');
  const clearSelEl = $(el, '.neigh-clear');
  const pickListEl = $(el, '.neigh-list');
  const routesEl = $(el, '.neigh-routes');
  const headerEl = $(el, '.neigh-header');
  const statsEl = $(el, '.neigh-stats');
  const loadingEl = $(el, '.neigh-loading');
  const countEl = $(el, '.neigh-route-count');
  const listEl = $(el, '.lines-scroll');

  // Selected ids in pick order — the order the chips and the caption read in,
  // so the list matches the order the analyst built it up in.
  const selected = new Set();
  let routesInArea = [];
  let selectionToken = 0;   // guards against a slow route fetch landing after a newer pick

  // ── Population ──────────────────────────────────────────────────────────
  // Real resident counts, apportioned from CBS statistical areas onto the
  // official municipal polygon by the offline pipeline. Areas with no official
  // polygon (a boulevard, a retail complex) carry no population and the block
  // simply stays hidden — better an absent figure than a fabricated one.
  //
  // Several neighbourhoods add up cleanly: these are counts apportioned onto
  // the *official* polygons, which don't overlap, so nobody is counted twice.
  // (The 250 m analysis catchments do overlap — that's why population is the
  // one figure the pipeline keeps on the unbuffered boundary.)
  function renderPopulation(neighs) {
    const parts = neighs.map(n => n.population).filter(p => p?.total);
    const pop = parts.length ? {
      total: parts.reduce((a, p) => a + p.total, 0),
      by_age: parts.reduce((acc, p) => {
        for (const [band, v] of Object.entries(p.by_age || {})) acc[band] = (acc[band] || 0) + v;
        return acc;
      }, {}),
    } : null;

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

  // ── The neighbourhood picker ────────────────────────────────────────────
  /** The selected records, in the order they were picked. */
  function selectedRecords() {
    const byId = new Map(data.neighbourhoods.map(n => [n.id, n]));
    return [...selected].map(id => byId.get(id)).filter(Boolean);
  }

  function renderPicker() {
    const q = searchEl.value.trim();
    const rows = data.neighbourhoods.filter(n => !q || n.name.includes(q));

    pickListEl.replaceChildren(...rows.map(n => {
      const on = selected.has(n.id);
      const row = html`
        <label class="neigh-opt ${on ? 'on' : ''}">
          <input type="checkbox" ${on ? 'checked' : ''}>
          <span>${escHtml(n.name)}</span>
        </label>`;
      $(row, 'input').addEventListener('change', () => toggleArea(n.id));
      return row;
    }));

    if (!rows.length) {
      pickListEl.append(html`<div class="neigh-empty">לא נמצאה שכונה בשם זה</div>`);
    }

    const picked = selectedRecords();
    chipsEl.hidden = !picked.length;
    chipsEl.replaceChildren(...picked.map(n => {
      const chip = html`
        <button class="neigh-chip" title="הסרה מהבחירה">
          ${escHtml(n.name)}<span class="neigh-chip-x">✕</span>
        </button>`;
      chip.addEventListener('click', () => toggleArea(n.id));
      return chip;
    }));

    clearSelEl.hidden = !picked.length;
    summaryEl.textContent = !picked.length
      ? 'כל העיר — ללא סינון'
      : picked.length === 1
        ? `שכונה אחת נבחרה · טווח ניתוח ${fmtNum(bufferMetres(picked))} מ׳ מהגבול`
        : `${fmtNum(picked.length)} שכונות נבחרו · טווח ניתוח ${fmtNum(bufferMetres(picked))} מ׳ מהגבול`;
  }

  /** The catchment width the pipeline used, read off the data rather than assumed. */
  function bufferMetres(picked) {
    return picked[0]?.analysis_buffer_m ?? 0;
  }

  function toggleArea(id) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    renderPicker();
    applySelection();
  }

  function clearAreas() {
    selected.clear();
    renderPicker();
    applySelection();
  }

  // ── Applying a selection ────────────────────────────────────────────────
  async function applySelection() {
    routes.clearAll();
    routesInArea = [];
    renderRoutes();

    const picked = selectedRecords();
    const token = ++selectionToken;

    if (!picked.length) {
      routesEl.hidden = true;
      setState({ area: null, areaName: null, areaRecords: [] });
      onAreaChange?.([]);
      return;
    }

    routesEl.hidden = false;
    loadingEl.hidden = false;
    countEl.textContent = '';

    // One name reads better than "1 שכונות"; past that the count is the caption,
    // since a KPI tile can't carry five Hebrew names.
    const areaName = picked.length === 1 ? picked[0].name : `${fmtNum(picked.length)} שכונות`;

    setState({ area: combineAreas(picked), areaName, areaRecords: picked });
    onAreaChange?.(picked);

    renderPopulation(picked);

    let index;
    try {
      index = await loadRoutesIndex();
    } catch (e) {
      console.error('[AreaPanel] failed to load the route index:', e);
      if (token !== selectionToken) return;
      loadingEl.hidden = true;
      headerEl.textContent = `שגיאה: ${e.message}`;
      return;
    }

    if (token !== selectionToken) return;   // a newer selection is already rendering

    // Union, not concatenation: a line serving three of the selected
    // neighbourhoods is one line in the list, and its colour and toggle are shared.
    const ids = new Set(picked.flatMap(n => n.route_ids || []));
    routesInArea = [...ids].map(id => index[id]).filter(Boolean);

    loadingEl.hidden = true;
    headerEl.innerHTML = `<b>${escHtml(picked.map(n => n.name).join(' · '))}</b> · ${fmtNum(routesInArea.length)} קווים פעילים ב-GTFS`;
    countEl.textContent = routesInArea.length
      ? `${fmtNum(routesInArea.length)} קווים · לחץ לבחירה (ניתן לבחור מספר)`
      : 'לא נמצאו קווים באזור זה';

    renderRoutes();
  }

  searchEl.addEventListener('input', renderPicker);
  clearSelEl.addEventListener('click', clearAreas);

  /** Fill the picker. Opens city-wide: the KPI tiles then describe the whole network. */
  async function load() {
    try {
      await loadNeighbourhoods();
      renderPicker();
    } catch (e) {
      console.error('[AreaPanel] failed to load neighbourhoods.json:', e);
      pickListEl.replaceChildren(html`<div class="neigh-empty">שגיאה בטעינת רשימת השכונות</div>`);
    }
  }

  /** Drop every active route — used by the reset button. */
  function clearRoutes() {
    routes.clearAll();
    renderRoutes();
  }

  return { el, load, renderRoutes, clearRoutes };
}
