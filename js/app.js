// TRANSIT IQ — Dashboard Application Logic

const PNAMES = ['בוקר מוקדם', 'שעות הבוקר', 'לפני הצהריים', 'צהריים', 'אחר הצהריים', 'שעת שיא ערב', 'ערב / לילה'];
const PTIMES = ['≈05–07', '≈07–09', '≈09–12', '≈12–15', '≈15–17', '≈17–19', '≈19–24'];
const DAYNAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
const DAYAB = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳'];
const LINES = [
  ['2', 'דן', ROUTES_META['2']?.name?.split('<->')[0]?.split('-')[0] || 'בת ים / חולון ↔ ת״א'],
  ['4', 'דן', ROUTES_META['4']?.name?.split('<->')[0]?.split('-')[0] || 'מסוף הטייסים ↔ רידינג'],
  ['13', 'מטרופולין', ROUTES_META['13']?.name?.split('<->')[0]?.split('-')[0] || 'שוק התקווה ↔ וולפסון'],
  ['16', 'דן', ROUTES_META['16']?.name?.split('<->')[0]?.split('-')[0] || 'כרמלית ↔ רמת גן'],
  ['35', 'מטרופולין', ROUTES_META['35']?.name?.split('<->')[0]?.split('-')[0] || 'חולון ↔ קניון איילון']
];
const HL = ['04-06', '06-09', '09-12', '12-15', '15-19', '19-24', '24-04'];

// ---- State ----
let state = {
  day: 'avg',
  period: 'all',
  layers: { speed: true, cong: false, dest: false, flow: false, st: true }
};

// ---- Dynamic Color Scales (Theme Aware) ----
const themeColors = {
  dark: {
    s1: '#7a0c2e', s2: '#c0142d', s3: '#e8472b', s4: '#f59e0b', s5: '#facc15', s6: '#4ade80', s7: '#22d3ee', line: '#2b3346'
  },
  light: {
    s1: '#991b1b', s2: '#dc2626', s3: '#ef4444', s4: '#f97316', s5: '#d97706', s6: '#16a34a', s7: '#2563eb', line: '#cbd5e1'
  }
};

function col(v) {
  const isLight = document.body.classList.contains('light-theme');
  const colors = isLight ? themeColors.light : themeColors.dark;
  if (v == null || v <= 0) return colors.line;
  if (v < 8) return colors.s1;
  if (v < 12) return colors.s2;
  if (v < 16) return colors.s3;
  if (v < 22) return colors.s4;
  if (v < 30) return colors.s5;
  if (v < 45) return colors.s6;
  return colors.s7;
}

function segSpeed(m) { // m = 35 ints (d*7+h)
  const d = state.day;
  const p = state.period;
  let vals = [];
  const days = d === 'avg' ? [0, 1, 2, 3, 4] : [d];
  const pers = p === 'all' ? [0, 1, 2, 3, 4, 5, 6] : [p];
  for (const dd of days) {
    for (const pp of pers) {
      const x = m[dd * 7 + pp];
      if (x > 0) vals.push(x);
    }
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---- Map Setup ----
const tiles = {
  dark: {
    base: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    labels: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
  },
  light: {
    base: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    labels: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'
  }
};

// Check local storage for saved theme
const initialTheme = localStorage.getItem('theme') || 'dark';
if (initialTheme === 'light') {
  document.body.classList.add('light-theme');
}

const map = L.map('map', { zoomControl: false, attributionControl: false, preferCanvas: true })
  .setView(D.center, 15);
L.control.zoom({ position: 'topleft' }).addTo(map);

const activeMapTheme = initialTheme === 'light' ? 'light' : 'dark';
let baseTileLayer = L.tileLayer(tiles[activeMapTheme].base, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
let labelTileLayer = L.tileLayer(tiles[activeMapTheme].labels, { maxZoom: 19, subdomains: 'abcd', opacity: initialTheme === 'light' ? 0.8 : 0.7 }).addTo(map);

const speedLayer = L.layerGroup().addTo(map);
const congLayer = L.layerGroup();
const destLayer = L.layerGroup();
const flowLayer = L.layerGroup();
const stLayer = L.layerGroup();
const routeLayer = L.layerGroup().addTo(map); // Layer group for drawing active bus routes
const routeStopsLayer = L.layerGroup().addTo(map); // Layer group for stops along a selected route
const selectedStationLayer = L.layerGroup().addTo(map); // Layer group for station highlight
const borderLayer = L.layerGroup().addTo(map); // Layer group for drawing neighborhood border
let stMetric = 'tik';

let activeRouteLines = new Set(); // Store active route numbers

function drawBusRoute(lineNumber) {
  // Toggle selection
  if (activeRouteLines.has(lineNumber)) {
    activeRouteLines.delete(lineNumber);
  } else {
    activeRouteLines.add(lineNumber);
  }

  renderActiveRoutes();
}

function renderActiveRoutes() {
  routeLayer.clearLayers();
  routeStopsLayer.clearLayers();
  
  // Highlight clicked lines in sidebar
  document.querySelectorAll('#lines li').forEach(r => {
    const numSpan = r.querySelector('.num');
    if (numSpan && activeRouteLines.has(numSpan.textContent.trim())) {
      r.classList.add('active');
    } else {
      r.classList.remove('active');
    }
  });

  if (activeRouteLines.size === 0) {
    map.fitBounds([[D.bbox.minlat, D.bbox.minlon], [D.bbox.maxlat, D.bbox.maxlon]], { padding: [30, 30] });
    return;
  }
  
  const isLight = document.body.classList.contains('light-theme');
  // Render path with glowing outline and sharp inner route line
  const outerColor = isLight ? 'rgba(99, 102, 241, 0.4)' : 'rgba(34, 211, 238, 0.4)';
  const innerColor = isLight ? '#4f46e5' : '#22d3ee';
  
  let allBounds = null;

  activeRouteLines.forEach(lineNum => {
    const routeCoords = ROUTES_DATA[lineNum];
    if (!routeCoords) return;

    const outerLine = L.polyline(routeCoords, {
      color: outerColor,
      weight: 8,
      opacity: 0.8
    });
    
    const innerLine = L.polyline(routeCoords, {
      color: innerColor,
      weight: 4,
      opacity: 1
    });
    
    routeLayer.addLayer(outerLine);
    routeLayer.addLayer(innerLine);
    
    if (!allBounds) {
      allBounds = innerLine.getBounds();
    } else {
      allBounds.extend(innerLine.getBounds());
    }

    // Draw stop markers along the route
    const routeStops = ROUTES_STOPS[lineNum];
    if (routeStops && routeStops.length > 0) {
      const stopFillColor = isLight ? '#4f46e5' : '#22d3ee';
      const stopBorderColor = isLight ? '#ffffff' : '#0a0d14';
      
      routeStops.forEach((stop, idx) => {
        const isTerminal = (idx === 0 || idx === routeStops.length - 1);
        const m = L.circleMarker([stop.lat, stop.lon], {
          radius: isTerminal ? 7 : 4,
          color: stopBorderColor,
          weight: isTerminal ? 2.5 : 1.5,
          fillColor: stopFillColor,
          fillOpacity: isTerminal ? 1 : 0.85,
          className: 'route-stop-marker'
        });
        
        const label = isTerminal ? '🚏 ' : '';
        m.bindTooltip(
          '<div class="pp">' + label + '<b>' + stop.name + '</b>' +
          (isTerminal ? '<br><span style="color:var(--ink3);font-size:11px">תחנת ' + (idx === 0 ? 'מוצא' : 'יעד') + '</span>' : '') +
          '</div>',
          { className: '', direction: 'top', offset: [0, -6] }
        );
        
        routeStopsLayer.addLayer(m);
      });
    }
  });

  if (allBounds) {
    map.fitBounds(allBounds, { padding: [50, 50] });
  }
}

const NEIGHBORHOOD_BORDER = [
  [32.0550, 34.7850], // North-West (HaHagana / Ayalon)
  [32.0545, 34.7965], // North-East (HaHagana / Givati)
  [32.0460, 34.7975], // South-East (Matzuba / Lehi)
  [32.0455, 34.7885], // South-West (Lehi / Ayalon)
  [32.0550, 34.7850]  // Close loop
];

function drawNeighborhoodBorder() {
  borderLayer.clearLayers();
  // Border removed per user request
}

const ST_LABELS = { tik: 'תיקופים ביום', atz: 'עצירות ביום', kav: 'קווים עוצרים' };
function stVal(s) { return stMetric === 'tik' ? s.tik : stMetric === 'atz' ? s.atz : s.kav; }
function stCol(r) { return r > .66 ? '#ffd089' : r > .4 ? '#ffab4d' : r > .2 ? '#f97316' : '#c2701f'; }

function buildStations() {
  stLayer.clearLayers();
  const vs = STATIONS.map(stVal);
  const mx = Math.max(...vs);
  const mn = Math.min(...vs);
  const rng = (mx - mn) || 1;
  const isLight = document.body.classList.contains('light-theme');

  STATIONS.forEach(s => {
    const v = stVal(s);
    const r = (v - mn) / rng;
    const rad = 6 + r * 15;
    const hv = [s.h04, s.h06, s.h09, s.h12, s.h15, s.h19, s.h24];
    const pi = hv.indexOf(Math.max(...hv));
    const m = L.circleMarker([s.lat, s.lon], {
      radius: rad,
      className: 'st-ico',
      color: isLight ? '#475569' : '#fff',
      weight: 1.5,
      fillColor: stCol(r),
      fillOpacity: 0.9
    });
    m.bindTooltip('<div class="pp">📍 ' + s.n + '<br><b>' + Math.round(v) + '</b> ' + ST_LABELS[stMetric] + ' · שיא ' + HL[pi] + '</div>', { className: '', direction: 'top' });
    m.on('click', () => showStationDetail(s));
    stLayer.addLayer(m);
  });
}

function hhCells(arr) {
  const mx = Math.max(...arr) || 1;
  return arr.map((v, i) => {
    const a = (0.12 + (v / mx) * 0.78).toFixed(2);
    return '<div class="hhcell" style="background:rgba(255,138,61,' + a + ')"><span class="hv">' + Math.round(v) + '</span><span class="hl">' + HL[i] + '</span></div>';
  }).join('');
}

function demoBars(s) {
  const dem = [
    ['בוגר', s.adult, '#22d3ee'],
    ['קשיש', s.elder, '#4ade80'],
    ['נוער', s.youth, '#ff8a3d'],
    ['נכה', s.dis, '#facc15'],
    ['סטודנט', s.student, '#a78bfa'],
    ['אחר', s.other, '#93a0b8']
  ];
  const tot = dem.reduce((a, d) => a + d[1], 0) || 1;
  return dem.map(([l, v, c]) => {
    const p = Math.round(v / tot * 100);
    return '<div class="demo"><div class="dl"><span>' + l + '</span><span style="color:' + c + '">' + p + '%</span></div><div class="db"><div class="df" style="width:' + p + '%;background:' + c + '"></div></div></div>';
  }).join('');
}

function showStationDetail(s) {
  // Center map on clicked station
  map.setView([s.lat, s.lon], 16, { animate: true });
  
  // Highlight the selected station with a square-like marker
  selectedStationLayer.clearLayers();
  const isLight = document.body.classList.contains('light-theme');
  const highlightColor = isLight ? '#f97316' : '#ff8a3d';
  const highlight = L.circleMarker([s.lat, s.lon], {
    radius: 14,
    color: highlightColor,
    weight: 3,
    fillColor: 'transparent',
    dashArray: '4 4'
  });
  selectedStationLayer.addLayer(highlight);

  const hv = [s.h04, s.h06, s.h09, s.h12, s.h15, s.h19, s.h24];
  const pi = hv.indexOf(Math.max(...hv));
  document.getElementById('stpanelBody').innerHTML =
    '<div class="stp-name">' + s.n + '</div><div class="stp-sub">' + s.nb + ' · ' + s.kav + ' קווים</div>'
    + '<div class="stkg"><div class="stk a"><div class="v">' + Math.round(s.tik) + '</div><div class="l">תיקופים ביום</div></div>'
    + '<div class="stk c"><div class="v">' + s.atz + '</div><div class="l">עצירות ביום</div></div>'
    + '<div class="stk g"><div class="v">' + s.kav + '</div><div class="l">קווים</div></div>'
    + '<div class="stk"><div class="v">' + s.mav + '%</div><div class="l">% נסיעות מעבר</div></div></div>'
    + '<div class="sth">עליות לאוטובוס לפי שעה</div><div class="hhgrid">' + hhCells(hv) + '</div>'
    + '<div class="sth">פילוח נוסעים</div>' + demoBars(s)
    + '<div class="stkg" style="margin-top:6px"><div class="stk a"><div class="v" style="font-size:15px">' + HL[pi] + '</div><div class="l">שעת שיא</div></div><div class="stk"><div class="v" style="font-size:15px">' + s.dest + '</div><div class="l">נסיעות ממוצע ליעד</div></div></div>'
    + '<div class="rankrow" style="border:0;justify-content:center;color:var(--ink3);cursor:pointer" onclick="showStOverview()">↩ סקירת כל התחנות</div>';
  document.getElementById('stpanel').classList.add('show');
}

function showStOverview() {
  const tik = Math.round(STATIONS.reduce((a, s) => a + s.tik, 0));
  const atz = STATIONS.reduce((a, s) => a + s.atz, 0);
  const hk = ['h04', 'h06', 'h09', 'h12', 'h15', 'h19', 'h24'];
  const hs = hk.map(k => STATIONS.reduce((a, s) => a + s[k], 0));
  const pi = hs.indexOf(Math.max(...hs));
  const agg = { adult: 0, elder: 0, youth: 0, dis: 0, student: 0, other: 0 };
  STATIONS.forEach(s => { for (const k in agg) agg[k] += s[k]; });
  const top = [...STATIONS].sort((a, b) => b.tik - a.tik).slice(0, 6);
  const rank = top.map((s, i) => {
    const idx = STATIONS.indexOf(s);
    return '<div class="rankrow" onclick="showStationDetail(STATIONS[' + idx + '])"><span class="rn">' + (i + 1) + '</span><span>' + s.n + '</span><span class="rv">' + Math.round(s.tik) + '</span></div>';
  }).join('');
  document.getElementById('stpanelBody').innerHTML =
    '<div class="stp-name">סקירת נסועה — שכונת התקווה</div><div class="stp-sub">' + STATIONS.length + ' תחנות · תיקופי רב-קו</div>'
    + '<div class="stkg"><div class="stk a"><div class="v">' + tik.toLocaleString('en') + '</div><div class="l">תיקופים ביום</div></div>'
    + '<div class="stk c"><div class="v">' + atz.toLocaleString('en') + '</div><div class="l">עצירות ביום</div></div>'
    + '<div class="stk g"><div class="v">' + STATIONS.length + '</div><div class="l">תחנות</div></div>'
    + '<div class="stk"><div class="v">' + Math.round(tik / STATIONS.length) + '</div><div class="l">תיקופים/תחנה</div></div></div>'
    + '<div class="sth">עליות לפי שעה — כלל התחנות</div><div class="hhgrid">' + hhCells(hs) + '</div>'
    + '<div class="sth">פילוח נוסעים — כל השכונה</div>' + demoBars(agg)
    + '<div class="sth" style="margin-top:6px">התחנות העמוסות ביותר</div>' + rank;
  document.getElementById('stpanel').classList.add('show');
}

function hideStPanel() {
  document.getElementById('stpanel').classList.remove('show');
  selectedStationLayer.clearLayers();
}

function renderStOverview() {
  const tik = Math.round(STATIONS.reduce((a, s) => a + s.tik, 0));
  const hk = ['h04', 'h06', 'h09', 'h12', 'h15', 'h19', 'h24'];
  const hs = hk.map(k => STATIONS.reduce((a, s) => a + s[k], 0));
  const pi = hs.indexOf(Math.max(...hs));
  let eld = 0, tot = 0;
  STATIONS.forEach(s => {
    eld += s.elder;
    tot += s.adult + s.elder + s.youth + s.dis + s.student + s.other;
  });
  const top = [...STATIONS].sort((a, b) => b.tik - a.tik)[0];
  document.getElementById('stSum').innerHTML =
    '<div class="big">' + tik.toLocaleString('en') + '</div><div class="biglbl">תיקופים ביום · 21 תחנות</div>'
    + '<div class="row"><span>שעת שיא</span><b>' + HL[pi] + '</b></div>'
    + '<div class="row"><span>נוסעים קשישים</span><b>' + Math.round(eld / tot * 100) + '%</b></div>'
    + '<div class="row"><span>תחנה עמוסה</span><b style="font-family:Heebo">' + top.n.split('/')[0] + '</b></div>'
    + '<div class="row" style="cursor:pointer;color:var(--amber);justify-content:center;margin-top:6px" onclick="showStOverview()">פתח סקירה מלאה ›</div>';
}

// ---- Build Polylines Once, Recolor on Update ----
const polys = [];
function buildSpeed() {
  speedLayer.clearLayers();
  polys.length = 0;
  const isLight = document.body.classList.contains('light-theme');
  const colors = isLight ? themeColors.light : themeColors.dark;

  D.segments.forEach(s => {
    const latlngs = s.c.map(c => [c[1], c[0]]);
    const pl = L.polyline(latlngs, { color: colors.line, weight: 3, opacity: .9 });
    pl._m = s.m;
    pl.on('mouseover', function () { this.setStyle({ weight: 6 }) });
    pl.on('mouseout', function () { this.setStyle({ weight: this._w || 3 }) });
    pl.on('click', function () {
      const v = segSpeed(this._m);
      L.popup().setLatLng(this.getLatLngs()[Math.floor(this.getLatLngs().length / 2)])
        .setContent('<div class="pp">מהירות אוטובוס במקטע<br><b>' + (v ? v.toFixed(1) : '—') + ' קמ״ש</b></div>').openOn(map);
    });
    polys.push(pl);
    speedLayer.addLayer(pl);
  });
}

function recolor() {
  let sum = 0, n = 0, below = 0, tot = 0;
  congLayer.clearLayers();
  
  const isLight = document.body.classList.contains('light-theme');
  const emptyColor = isLight ? '#cbd5e1' : '#222a3a';
  
  polys.forEach(pl => {
    const v = segSpeed(pl._m);
    const c = v == null ? emptyColor : col(v);
    let w = v == null ? 3 : v < 16 ? 4 : 3;
    pl._w = w;
    
    // Draw all segments with high opacity to fill the dashboard map
    pl.setStyle({ color: c, opacity: 0.9, weight: w });
    
    if (v != null) {
      sum += v;
      n++;
      tot++;
      if (v < 15) {
        below++;
        const cl = L.polyline(pl.getLatLngs(), { color: '#ff2d55', weight: 6, opacity: .85 });
        congLayer.addLayer(cl);
      }
    }
  });
  document.getElementById('kAvg').textContent = n ? (sum / n).toFixed(1) : '—';
  document.getElementById('kCong').textContent = tot ? Math.round(100 * below / tot) : '—';
  document.getElementById('kSeg').textContent = D.segments.length.toLocaleString('en');

  // Labels
  const dl = state.day === 'avg' ? 'ממוצע ימי חול (א׳–ה׳)' : 'יום ' + DAYNAMES[state.day];
  const pl = state.period === 'all' ? 'כל שעות היום' : PNAMES[state.period] + ' ' + PTIMES[state.period];
  document.getElementById('nowLbl').textContent = (state.day === 'avg' ? 'ממוצע' : DAYAB[state.day]) + ' · ' + (state.period === 'all' ? 'כל היום' : PNAMES[state.period]);
  document.getElementById('nowSub').textContent = dl + ' · ' + pl;
  document.getElementById('kAvgD').textContent = pl;
}

// Destinations
function buildDest() {
  destLayer.clearLayers();
  const isLight = document.body.classList.contains('light-theme');

  D.dests.forEach(d => {
    const m = L.circleMarker([d.lat, d.lon], {
      radius: 6,
      color: isLight ? '#ffffff' : '#0a0d14',
      weight: 2,
      fillColor: isLight ? '#0891b2' : '#22d3ee',
      fillOpacity: .95
    });
    m.bindPopup('<div class="pp"><b style="color:' + (isLight ? '#0891b2' : '#22d3ee') + '">' + d.he + '</b><br>' + d.en + '<br><span style="color:var(--ink3);font-size:11px">' + d.note + '</span></div>');
    destLayer.addLayer(m);
  });
}

// Flow / Desire Lines
function buildFlow() {
  flowLayer.clearLayers();
  const c = D.center;
  const isLight = document.body.classList.contains('light-theme');
  const accentColor = isLight ? '#ea580c' : '#ff8a3d';

  // Pick employment-type destinations as primary attractors
  const hubs = D.dests.filter(d => /תעסוקה|עסקים|פיננס|היי|ממשלת/.test(d.cat + d.he)).slice(0, 12);
  (hubs.length ? hubs : D.dests.slice(0, 10)).forEach(d => {
    const ln = L.polyline([c, [d.lat, d.lon]], {
      color: accentColor,
      weight: 1.6,
      opacity: .5,
      dashArray: '2 6'
    });
    flowLayer.addLayer(ln);
  });
  L.circleMarker(c, {
    radius: 9,
    color: accentColor,
    weight: 3,
    fillColor: isLight ? '#ffffff' : '#0a0d14',
    fillOpacity: 1
  }).bindPopup('<div class="pp"><b>מרכז שכונת התקווה</b><br>נקודת מוצא · ~13,000 תושבים</div>').addTo(flowLayer);
}

// ---- UI Bindings ----
const daysEl = document.getElementById('days');
DAYAB.forEach((d, i) => {
  const b = document.createElement('div');
  b.className = 'day';
  b.textContent = d;
  b.onclick = () => { state.day = i; syncDays(); recolor(); };
  daysEl.appendChild(b);
});
const avgBtn = document.createElement('div');
avgBtn.className = 'day avg on';
avgBtn.textContent = 'ממוצע';
avgBtn.onclick = () => { state.day = 'avg'; syncDays(); recolor(); };
daysEl.appendChild(avgBtn);

function syncDays() {
  [...daysEl.children].forEach((c, i) => {
    c.classList.toggle('on', (i < 5 && state.day === i) || (i === 5 && state.day === 'avg'));
  });
}

const perEl = document.getElementById('periods');
PNAMES.forEach((nm, i) => {
  const r = document.createElement('div');
  r.className = 'prow';
  r.innerHTML = '<span class="pn">P' + (i + 1) + '</span><span class="pl">' + nm + '</span><span class="pt">' + PTIMES[i] + '</span>';
  r.onclick = () => { state.period = i; syncPer(); recolor(); };
  perEl.appendChild(r);
});
const allp = document.getElementById('allp');
allp.onclick = () => { state.period = 'all'; syncPer(); recolor(); };

function syncPer() {
  [...perEl.children].forEach((c, i) => c.classList.toggle('on', state.period === i));
  allp.classList.toggle('on', state.period === 'all');
}

// Lines List
const linesEl = document.getElementById('lines');
LINES.forEach(l => {
  const li = document.createElement('li');
  li.innerHTML = '<span class="num">' + l[0] + '</span><span>' + l[2] + ' <span style="color:var(--ink3)">· ' + l[1] + '</span></span>';
  li.onclick = () => drawBusRoute(l[0]);
  linesEl.appendChild(li);
});

// Station Metric Selector
document.querySelectorAll('.metric').forEach(mt => {
  mt.onclick = () => {
    stMetric = mt.dataset.m;
    document.querySelectorAll('.metric').forEach(x => x.classList.toggle('on', x === mt));
    document.querySelector('.toggle[data-layer=st] .tl').textContent = 'תחנות אוטובוס (' + ST_LABELS[stMetric] + ')';
    buildStations();
    applyLayers();
  };
});

// Layer Toggles
document.querySelectorAll('.toggle').forEach(t => {
  t.onclick = () => {
    const k = t.dataset.layer;
    state.layers[k] = !state.layers[k];
    t.classList.toggle('on', state.layers[k]);
    applyLayers();
  };
});

function applyLayers() {
  toggleL(speedLayer, state.layers.speed);
  toggleL(congLayer, state.layers.cong);
  toggleL(destLayer, state.layers.dest);
  toggleL(flowLayer, state.layers.flow);
  toggleL(stLayer, state.layers.st);
}

function toggleL(layer, on) {
  if (on) {
    if (!map.hasLayer(layer)) map.addLayer(layer);
  } else {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  }
}

// Profile Sparkline
const sparkEl = document.getElementById('spark');
function buildSpark() {
  sparkEl.innerHTML = '';
  const max = Math.max(...D.profile);
  D.profile.forEach((v, i) => {
    const s = document.createElement('div');
    s.className = 'spk';
    s.innerHTML = '<span class="val">' + v.toFixed(0) + '</span><div class="bar" style="height:' + (v / max * 100) + '%;background:' + col(v) + '"></div><span class="lab">P' + (i + 1) + '</span>';
    s.onclick = () => {
      state.period = i;
      syncPer();
      recolor();
      updateSpark();
    };
    sparkEl.appendChild(s);
  });
}

function updateSpark() {
  [...sparkEl.children].forEach((c, i) => c.classList.toggle('on', state.period === i));
}

// Play Animation
let playing = null;
document.getElementById('play').onclick = function () {
  if (playing) {
    clearInterval(playing);
    playing = null;
    this.textContent = '▶ הרצת יום';
    return;
  }
  this.textContent = '⏸ עצור';
  let p = 0;
  state.period = 0;
  syncPer();
  recolor();
  updateSpark();
  playing = setInterval(() => {
    p = (p + 1) % 7;
    state.period = p;
    syncPer();
    recolor();
    updateSpark();
  }, 1100);
};

document.getElementById('reset').onclick = () => {
  if (playing) {
    clearInterval(playing);
    playing = null;
    document.getElementById('play').textContent = '▶ הרצת יום';
  }
  state.day = 'avg';
  state.period = 'all';
  activeRouteLines.clear();
  routeLayer.clearLayers();
  routeStopsLayer.clearLayers();
  selectedStationLayer.clearLayers();
  document.querySelectorAll('#lines li').forEach(li => li.classList.remove('active'));
  syncDays();
  syncPer();
  recolor();
  updateSpark();
  map.setView(D.center, 15);
};

// ---- Theme Toggle Logic ----
const themeToggleBtn = document.getElementById('themeToggle');
function updateMapTheme() {
  const isLight = document.body.classList.contains('light-theme');
  const currentTheme = isLight ? 'light' : 'dark';
  
  // Set leafet base tile layer url
  baseTileLayer.setUrl(tiles[currentTheme].base);
  labelTileLayer.setUrl(tiles[currentTheme].labels);
  labelTileLayer.setOpacity(isLight ? 0.8 : 0.7);
  
  // Rebuild/recolor features with theme-aware colors
  buildSpeed();
  recolor();
  buildDest();
  buildFlow();
  buildStations();
  buildSpark();
  renderStOverview();
  drawNeighborhoodBorder(); // Redraw border to update outline contrast
  
  // Redraw the active routes with new theme colors if it is displayed
  if (activeRouteLines.size > 0) {
    renderActiveRoutes();
  }
  
  // Update state panel detail if open
  const stpanel = document.getElementById('stpanel');
  if (stpanel.classList.contains('show')) {
    // If details panel is open, we refresh it (either overview or individual station detail)
    // To make it simple, we just close and reopen overview
    showStOverview();
  }
}

themeToggleBtn.onclick = () => {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  updateMapTheme();
};

// ---- Init ----
buildSpeed();
buildDest();
buildFlow();
buildStations();
buildSpark();
renderStOverview();
drawNeighborhoodBorder();
recolor();
updateSpark();
applyLayers();

// Fit to Bounding Box
map.fitBounds([[D.bbox.minlat, D.bbox.minlon], [D.bbox.maxlat, D.bbox.maxlon]], { padding: [30, 30] });

// ---- Import Layer ----
const importedLayers = [];

document.getElementById('importFile').addEventListener('change', function (e) {
  Array.from(e.target.files).forEach(importFile);
  this.value = '';
});

// Drag-and-drop onto the map
const mapWrap = document.getElementById('mapwrap');
mapWrap.addEventListener('dragover', e => { e.preventDefault(); mapWrap.classList.add('drop-active'); });
mapWrap.addEventListener('dragleave', () => mapWrap.classList.remove('drop-active'));
mapWrap.addEventListener('drop', e => {
  e.preventDefault();
  mapWrap.classList.remove('drop-active');
  Array.from(e.dataTransfer.files).forEach(file => {
    if (/\.(geojson|json|kml|zip)$/i.test(file.name)) importFile(file);
  });
});

function importFile(file) {
  const name = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'kml') {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const doc = new DOMParser().parseFromString(ev.target.result, 'text/xml');
        addImportedLayer(toGeoJSON.kml(doc), name);
      } catch {
        alert('קובץ KML לא תקין');
      }
    };
    reader.readAsText(file);

  } else if (ext === 'zip') {
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const zip = await JSZip.loadAsync(ev.target.result);
        const entries = Object.values(zip.files).filter(f => !f.dir);

        const shpEntry = entries.find(f => /\.shp$/i.test(f.name));
        const dbfEntry = entries.find(f => /\.dbf$/i.test(f.name));
        const prjEntry = entries.find(f => /\.prj$/i.test(f.name));

        if (!shpEntry || !dbfEntry) {
          alert('קובץ ZIP לא מכיל קבצי Shapefile (.shp + .dbf)');
          return;
        }

        const [shpBuf, dbfBuf, prjText] = await Promise.all([
          shpEntry.async('arraybuffer'),
          dbfEntry.async('arraybuffer'),
          prjEntry ? prjEntry.async('string') : Promise.resolve(null)
        ]);

        const geojson = shp.combine([shp.parseShp(shpBuf, prjText), shp.parseDbf(dbfBuf)]);
        addImportedLayer(geojson, name);
      } catch (err) {
        console.error('Shapefile import error:', err);
        alert('שגיאה בייבוא Shapefile: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);

  } else if (ext === 'geojson' || ext === 'json') {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        addImportedLayer(JSON.parse(ev.target.result), name);
      } catch {
        alert('קובץ GeoJSON לא תקין');
      }
    };
    reader.readAsText(file);
  }
}

function addImportedLayer(geojson, name) {
  const isLight = document.body.classList.contains('light-theme');
  const color = isLight ? '#0891b2' : '#22d3ee';

  const layer = L.geoJSON(geojson, {
    style: { color, weight: 2, opacity: 0.9, fillOpacity: 0.15 },
    pointToLayer: (f, latlng) => L.circleMarker(latlng, {
      radius: 6, color, weight: 2, fillColor: color, fillOpacity: 0.8
    }),
    onEachFeature: (f, l) => {
      if (!f.properties) return;
      const rows = Object.entries(f.properties)
        .filter(([, v]) => v != null)
        .map(([k, v]) => '<tr><td style="color:var(--ink3);padding-left:8px">' + k + '</td><td>' + v + '</td></tr>')
        .join('');
      if (rows) l.bindPopup('<table style="font-size:12px;direction:ltr;border-collapse:collapse">' + rows + '</table>');
    }
  }).addTo(map);

  try { map.fitBounds(layer.getBounds(), { padding: [30, 30] }); } catch {}

  importedLayers.push({ layer, name, visible: true });
  renderImportedList();
}

function renderImportedList() {
  const el = document.getElementById('importedList');
  el.innerHTML = importedLayers.map((item, i) =>
    '<li class="imported-item' + (item.visible ? ' on' : '') + '">' +
    '<div class="sw" onclick="toggleImportedLayer(' + i + ')"></div>' +
    '<span class="imported-name" title="' + item.name + '">' + item.name + '</span>' +
    '<button class="imported-remove" onclick="removeImportedLayer(' + i + ')" title="הסר שכבה">✕</button>' +
    '</li>'
  ).join('');
}

function toggleImportedLayer(idx) {
  const item = importedLayers[idx];
  item.visible = !item.visible;
  if (item.visible) map.addLayer(item.layer);
  else map.removeLayer(item.layer);
  renderImportedList();
}

function removeImportedLayer(idx) {
  map.removeLayer(importedLayers[idx].layer);
  importedLayers.splice(idx, 1);
  renderImportedList();
}

// Expose necessary functions globally for onclick attributes in dynamically rendered elements
window.hideStPanel = hideStPanel;
window.showStOverview = showStOverview;
window.showStationDetail = showStationDetail;
window.toggleImportedLayer = toggleImportedLayer;
window.removeImportedLayer = removeImportedLayer;
window.STATIONS = STATIONS;
