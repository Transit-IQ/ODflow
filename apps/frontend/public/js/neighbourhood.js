/**
 * ODFlow — Neighbourhood Selector Module
 * Lets the user browse bus routes inside any of 19 Tel Aviv neighbourhoods.
 * Data is pre-computed once by apps/backend/scripts/build_dashboard_data.py from
 * the raw GTFS files — this module only reads the generated static JSON,
 * so it works on GitHub Pages with no backend running.
 * Supports multi-select with distinct per-route colors.
 * Depends on: Leaflet `map` global (created by app.js)
 */

// ── Route colours ─────────────────────────────────────────────────────────────
// Eight slots, assigned in fixed order and stepped per basemap — each set was
// validated together (colourblind separation, contrast, distinct under normal
// vision). Routes are stored by SLOT, not by hex, so a theme flip re-steps the
// same route to the same slot instead of reshuffling the map's colours.
// Past eight the slots repeat: the line-number badge in the list and the
// hover tooltip carry the identity, colour only groups the strokes.
const PALETTE = {
  dark:  ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
};

function routePalette() {
  return document.body.classList.contains('light-theme') ? PALETTE.light : PALETTE.dark;
}

// ── Module state ──────────────────────────────────────────────────────────────
const NS = {
  neighbourhoods: [],          // loaded from data/neighbourhoods.json
  routesById: null,            // loaded lazily from data/neighbourhood_routes.json
  selectedNeigh: null,         // current neighbourhood object
  routesInNeigh: [],           // [{route_id, route_short_name, agency_id, route_long_name}]
  activeRoutes: new Map(),     // route_id → { polyline, color }
  colorMap: new Map(),         // route_id → palette slot (stable per session)
  neighHighlight: null,        // Leaflet layer for the selected neighbourhood's outline
  routeGroup: L.layerGroup(),  // all active polylines
  colorIdx: 0,                 // next slot to assign
};

function nextColor(routeId) {
  if (!NS.colorMap.has(routeId)) {
    NS.colorMap.set(routeId, NS.colorIdx % PALETTE.dark.length);
    NS.colorIdx++;
  }
  return routePalette()[NS.colorMap.get(routeId)];
}

// Called from app.js when the basemap flips, so live routes re-step with it.
function recolorRoutes() {
  const casing = document.body.classList.contains('light-theme') ? '#ffffff' : '#0b1220';
  NS.activeRoutes.forEach((entry, routeId) => {
    const color = nextColor(routeId);
    entry.color = color;
    entry.polyline.setStyle({ color });
    entry.casing.setStyle({ color: casing });
  });
  if (document.getElementById('neighLines')) renderRouteList();
}

function numFmt(n) { return (+n).toLocaleString('he-IL'); }

// ── Inject sidebar HTML ────────────────────────────────────────────────────────
function injectSidebarBlock() {
  const aside = document.querySelector('aside');
  if (!aside) return;

  const html = `
    <div class="block" id="neighBlock" style="--tint:var(--c-place)">
      <h3>אזור ניתוח</h3>

      <div class="neigh-select-wrap">
        <select id="neighSelect" class="neigh-select" aria-label="בחירת שכונה">
          <option value="">כל העיר — ללא סינון</option>
        </select>
      </div>

      <div id="neighRouteSection" hidden>
        <div class="neigh-header" id="neighHeader"></div>
        <div class="neigh-stats" id="neighStats" hidden></div>

        <h3 style="--tint:var(--c-net)">קווי אוטובוס באזור</h3>

        <div class="neigh-actions">
          <button class="btn ghost" id="neighSelectAll">בחר הכל</button>
          <button class="btn ghost" id="neighClear">נקה</button>
        </div>

        <div id="neighLoading" hidden class="neigh-loading">
          <span class="neigh-spinner"></span> טוען קווים…
        </div>

        <div class="neigh-route-count" id="neighCount"></div>
        <div class="lines-scroll" style="max-height:240px">
          <ul class="lines" id="neighLines"></ul>
        </div>
      </div>
    </div>
  `;

  // Picking the area is the first thing an analyst does, so this block sits at
  // the top of the sidebar even though the module loads last.
  aside.insertAdjacentHTML('afterbegin', html);

  injectStyles();
  bindControls();
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .neigh-stats {
      margin:8px 0; padding:8px; border-radius:var(--radius-sm);
      border:1px solid var(--line); background:var(--panel2);
    }
    .neigh-stat-row { display:flex; gap:6px; text-align:center }
    .neigh-stat { flex:1; display:flex; flex-direction:column; gap:1px }
    .neigh-stat-val {
      font-family:var(--font-num); font-size:15px; font-weight:600;
      color:var(--c-place); font-variant-numeric:tabular-nums;
    }
    .neigh-stat-lbl { font-size:10px; color:var(--ink3) }
    .neigh-stat-src { margin-top:6px; font-size:9.5px; color:var(--ink3); text-align:center }

    .neigh-select-wrap { margin-bottom:8px }
    .neigh-select {
      width:100%; padding:7px 9px; border-radius:var(--radius-sm);
      border:1px solid var(--line); background:var(--panel2);
      color:var(--ink); font-size:12.5px; font-family:var(--font-sans);
      cursor:pointer;
    }
    .neigh-select:hover { border-color:var(--primary) }
    .neigh-header {
      font-size:11px; color:var(--ink2); margin-bottom:8px;
      padding:6px 8px; background:var(--panel2);
      border:1px solid var(--line); border-radius:var(--radius-sm);
      line-height:1.5;
    }
    .neigh-header b { color:var(--ink); font-weight:600 }
    .neigh-actions { display:flex; gap:6px; margin-bottom:8px }
    .neigh-actions .btn { flex:1; font-size:11px; padding:5px }
    .neigh-loading {
      display:flex; align-items:center; gap:8px;
      color:var(--ink2); font-size:12px; padding:8px 0;
    }
    .neigh-spinner {
      display:inline-block; width:13px; height:13px;
      border:2px solid var(--line); border-top-color:var(--primary);
      border-radius:50%; animation:spin .8s linear infinite;
    }
    @keyframes spin { to { transform:rotate(360deg) } }
    .neigh-route-count { font-size:10.5px; color:var(--ink3); margin-bottom:5px }
    .neigh-color-dot { width:8px; height:8px; border-radius:50%; flex:0 0 auto }
    .lines li.neigh-active {
      background:var(--panel2); border-color:var(--line); color:var(--ink);
    }
  `;
  document.head.appendChild(style);
}

function bindControls() {
  document.getElementById('neighSelect').addEventListener('change', onNeighSelect);

  document.getElementById('neighSelectAll').addEventListener('click', () => {
    for (const r of NS.routesInNeigh) {
      if (!NS.activeRoutes.has(r.route_id)) activateRoute(r);
    }
    renderRouteList();
  });

  document.getElementById('neighClear').addEventListener('click', () => {
    clearAllRoutes();
    renderRouteList();
  });
}

// ── Load neighbourhood index (small, fetched eagerly) ─────────────────────────
async function loadNeighbourhoods() {
  try {
    const r = await fetch('./data/neighbourhoods.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    NS.neighbourhoods = await r.json();

    const sel = document.getElementById('neighSelect');
    NS.neighbourhoods.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.id;
      opt.textContent = n.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('[Neighbourhood] Failed to load neighbourhoods.json:', e);
  }
}

// ── Load the shared route lookup (large, fetched once, lazily) ────────────────
async function loadRoutesIndex() {
  if (NS.routesById) return NS.routesById;
  const r = await fetch('./data/neighbourhood_routes.json');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  NS.routesById = await r.json();
  return NS.routesById;
}

// ── Neighbourhood selected ─────────────────────────────────────────────────────
async function onNeighSelect() {
  const sel = document.getElementById('neighSelect');
  const id = sel.value;

  clearAllRoutes();
  NS.routesInNeigh = [];

  if (!id) {
    document.getElementById('neighRouteSection').hidden = true;
    removeNeighHighlight();
    // Back to city-wide KPIs when no neighbourhood is selected.
    if (typeof applyNeighbourhoodFilter === 'function') applyNeighbourhoodFilter(null, null);
    return;
  }

  const neigh = NS.neighbourhoods.find(n => n.id === id);
  if (!neigh) return;
  NS.selectedNeigh = neigh;

  document.getElementById('neighRouteSection').hidden = false;
  document.getElementById('neighLoading').hidden = false;
  document.getElementById('neighLines').innerHTML = '';
  document.getElementById('neighCount').textContent = '';

  // Draw the real boundary shape when we have one; otherwise fall back to
  // the (approximate) bbox rectangle — see drawNeighHighlight.
  const bounds = drawNeighHighlight(neigh);
  if (map && bounds) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  // Scope the top KPI tiles (avg speed / % congested / segment count) to
  // this neighbourhood's real boundary (or its bbox, if no boundary exists).
  if (typeof applyNeighbourhoodFilter === 'function') {
    applyNeighbourhoodFilter({ bbox: neigh.bbox, boundary: neigh.boundary }, neigh.name, neigh);
  }

  // Look up routes from the pre-computed static index
  try {
    const routesById = await loadRoutesIndex();
    NS.routesInNeigh = neigh.route_ids
      .map(rid => routesById[rid])
      .filter(Boolean);
  } catch (e) {
    console.error('[Neighbourhood] Failed to load neighbourhood_routes.json:', e);
    document.getElementById('neighLoading').hidden = true;
    document.getElementById('neighHeader').textContent = `שגיאה: ${e.message}`;
    return;
  }

  document.getElementById('neighLoading').hidden = true;

  const count = NS.routesInNeigh.length;
  document.getElementById('neighHeader').innerHTML =
    `<b>${neigh.name}</b> · ${numFmt(count)} קווים פעילים ב-GTFS`;

  renderPopulation(neigh);
  document.getElementById('neighCount').textContent =
    count > 0 ? `${numFmt(count)} קווים · לחץ לבחירה (ניתן לבחור מספר)` : 'לא נמצאו קווים באזור זה';

  renderRouteList();
}

// ── Render population ─────────────────────────────────────────────────────────
// Real resident counts, apportioned from CBS statistical areas onto the official
// municipal neighbourhood polygon by the offline pipeline. Neighbourhoods with no
// official polygon (a boulevard, a retail complex, a zone outside the city limits)
// carry no population and the block simply stays hidden — better an absent figure
// than a fabricated one.
function renderPopulation(neigh) {
  const el = document.getElementById('neighStats');
  const pop = neigh.population;

  if (!pop || !pop.total) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }

  const age = pop.by_age || {};
  const sum = (...keys) => keys.reduce((acc, k) => acc + (age[k] || 0), 0);
  const young = sum('g0to9', 'g10to19');
  const senior = sum('g60to69', 'g70to79', 'g80up');
  const pct = n => pop.total ? Math.round((n / pop.total) * 100) : 0;

  el.innerHTML = `
    <div class="neigh-stat-row">
      <div class="neigh-stat">
        <span class="neigh-stat-val">${numFmt(pop.total)}</span>
        <span class="neigh-stat-lbl">תושבים</span>
      </div>
      <div class="neigh-stat">
        <span class="neigh-stat-val">${pct(young)}%</span>
        <span class="neigh-stat-lbl">בני 0–19</span>
      </div>
      <div class="neigh-stat">
        <span class="neigh-stat-val">${pct(senior)}%</span>
        <span class="neigh-stat-lbl">בני 60+</span>
      </div>
    </div>
    <div class="neigh-stat-src">מקור: אזורים סטטיסטיים למ״ס 2022, עיריית תל אביב-יפו</div>
  `;
  el.hidden = false;
}

// ── Render route list ─────────────────────────────────────────────────────────
function renderRouteList() {
  const ul = document.getElementById('neighLines');
  ul.innerHTML = '';

  NS.routesInNeigh.forEach(r => {
    const isActive = NS.activeRoutes.has(r.route_id);
    const color = nextColor(r.route_id);

    const li = document.createElement('li');
    li.className = isActive ? 'neigh-active' : '';
    li.dataset.routeId = r.route_id;
    li.innerHTML = `
      <span class="num" style="background:${isActive ? color : `color-mix(in srgb, ${color} 20%, transparent)`};color:${isActive ? '#fff' : color}">${r.route_short_name || '?'}</span>
      <span class="desc" title="${r.route_long_name || ''}">${r.route_long_name || 'ללא תיאור'}</span>
      <span class="ag">${agencyLabel(r.agency_id)}</span>
      ${isActive ? `<span class="neigh-color-dot" style="background:${color}"></span>` : ''}
    `;

    li.addEventListener('click', () => {
      if (NS.activeRoutes.has(r.route_id)) {
        deactivateRoute(r.route_id);
        li.classList.remove('neigh-active');
      } else {
        activateRoute(r);
        li.classList.add('neigh-active');
      }
    });

    ul.appendChild(li);
  });
}

// ── Activate / deactivate route ────────────────────────────────────────────────
function activateRoute(r) {
  if (NS.activeRoutes.has(r.route_id)) return;
  if (!r.coordinates || r.coordinates.length === 0) return;

  const color = nextColor(r.route_id);

  // A casing in the basemap's own colour, laid down first. Without it a route
  // stroke and a congested speed segment beneath it fuse into one line; the
  // dark rim reads as "this belongs to a different layer".
  const casing = L.polyline(r.coordinates, {
    pane: 'routeCasingPane',
    color: document.body.classList.contains('light-theme') ? '#ffffff' : '#0b1220',
    weight: 8,
    opacity: 0.85,
    smoothFactor: 1.2,
  });

  const polyline = L.polyline(r.coordinates, {
    pane: 'routeLinePane',
    color,
    weight: 4.5,
    opacity: 1,
    smoothFactor: 1.2,
  });

  polyline.bindTooltip(
    `קו ${r.route_short_name} · ${agencyLabel(r.agency_id)}<br><small>${r.route_long_name || ''}</small>`,
    { sticky: true, direction: 'top' }
  );

  casing.addTo(NS.routeGroup);
  polyline.addTo(NS.routeGroup);
  NS.activeRoutes.set(r.route_id, { polyline, casing, color });
}

function deactivateRoute(routeId) {
  const entry = NS.activeRoutes.get(routeId);
  if (!entry) return;
  NS.routeGroup.removeLayer(entry.polyline);
  NS.routeGroup.removeLayer(entry.casing);
  NS.activeRoutes.delete(routeId);
}

function clearAllRoutes() {
  NS.activeRoutes.forEach((_, rid) => deactivateRoute(rid));
}

// ── Neighbourhood highlight ────────────────────────────────────────────────────
// `neigh.boundary` is an official municipal polygon (Tel Aviv-Yafo neighbourhood
// layer, matched by ms_shchuna) — it exists for most, but not all, of
// these areas (some are informal/colloquial zones — a shopping-mall complex,
// "city center", a boulevard — with no official boundary to fetch; those fall
// back to the configured bbox rectangle, which stays only an approximate
// outline). Either way this is drawn in a dedicated pane below the
// speed/route layers (not just appended after them) so it always reads as a
// subtle background guide instead of an opaque layer sitting on top of the
// transit data. Returns Leaflet bounds to fit the map to, or null.
function drawNeighHighlight(neigh) {
  removeNeighHighlight();

  const style = {
    pane: 'neighHighlightPane',
    color: typeof palette === 'function' ? palette().focus : '#2dd4bf',
    weight: 1.5,
    opacity: 0.7,
    fill: false,
    dashArray: '4 4',
  };

  if (neigh.boundary) {
    NS.neighHighlight = L.geoJSON(neigh.boundary, { style });
    NS.neighHighlight.bindTooltip(neigh.name, { permanent: false });
  } else {
    const b = neigh.bbox;
    NS.neighHighlight = L.rectangle([[b.min_lat, b.min_lon], [b.max_lat, b.max_lon]], style);
    NS.neighHighlight.bindTooltip(neigh.name + ' (אזור משוער — אין גבול מדויק בנתונים)', { permanent: false });
  }
  NS.neighHighlight.addTo(map);
  return NS.neighHighlight.getBounds();
}

function removeNeighHighlight() {
  if (NS.neighHighlight) { map.removeLayer(NS.neighHighlight); NS.neighHighlight = null; }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function initNeighbourhood() {
  // Wait until map is ready (app.js may still be initialising)
  const waitForMap = () => new Promise(resolve => {
    if (typeof map !== 'undefined' && map) return resolve();
    const t = setInterval(() => {
      if (typeof map !== 'undefined' && map) { clearInterval(t); resolve(); }
    }, 100);
  });

  await waitForMap();
  NS.routeGroup.addTo(map);

  // Dedicated pane, permanently below the default overlayPane (z-index 400)
  // that speed segments / bus routes / the city border render in — so the
  // neighbourhood-highlight rectangle can never end up drawn on top of them,
  // regardless of the order things get added to the map.
  if (!map.getPane('neighHighlightPane')) {
    map.createPane('neighHighlightPane');
    map.getPane('neighHighlightPane').style.zIndex = 350;
  }

  // Every casing has to land below every route line, not just below its own —
  // two panes guarantee that, where draw order within one group would not.
  if (!map.getPane('routeCasingPane')) {
    map.createPane('routeCasingPane').style.zIndex = 405;
    map.createPane('routeLinePane').style.zIndex = 410;
  }

  injectSidebarBlock();
  await loadNeighbourhoods();
  // Opens city-wide: the KPI tiles then describe the whole network, and picking
  // an area from the select is the first deliberate narrowing.
}

// ── Boot ──────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNeighbourhood);
} else {
  initNeighbourhood();
}
