import './StopPanel.css';
import { html } from '../../core/dom.js';
import { state } from '../../core/store.js';
import { data } from '../../core/data.js';
import { fmtNum, escHtml } from '../../core/format.js';
import { stopRamp } from '../../core/palette.js';
import { map } from '../../core/map.js';
import * as stops from '../../layers/stops.js';

// Display labels for the survey's own rider-type column names. The ids come
// from the data; only their Hebrew wording lives here, and an id with no label
// falls through to the raw column name rather than being dropped.
const RIDER_LABELS = {
  ADULT: 'בוגר', YOUTH: 'נוער', ELDERLY: 'קשיש',
  STUDENT: 'סטודנט', DISABLED: 'נכה', OTHER: 'אחר',
};

function tile(value, label, accent) {
  return `<div class="stop-tile">
            <div class="stop-tile-val"${accent ? ` style="color:${accent}"` : ''}>${value}</div>
            <div class="stop-tile-lbl">${label}</div>
          </div>`;
}

/**
 * Share of a whole, as a percentage of the parts actually reported — the
 * rider-type columns sum to slightly less than ONDAY (the survey's own daily
 * total), so dividing by ONDAY would quietly lose a few percent off every stop.
 */
function shares(values) {
  const total = values.reduce((a, b) => a + b, 0);
  return total > 0 ? values.map(v => (v / total) * 100) : values.map(() => 0);
}

function bandChart(bands, values, unit) {
  const max = Math.max(...values);
  const peak = values.indexOf(max);
  const ramp = stopRamp();
  const total = values.reduce((a, b) => a + b, 0);

  // Seven bars share ~300px, so a city-wide figure like 134,933 would collide
  // with its neighbours. Above five digits the labels switch to compact form;
  // the exact value stays one hover away.
  const label = max >= 10000
    ? v => (+v).toLocaleString('he-IL', { notation: 'compact', maximumFractionDigits: 1 })
    : v => fmtNum(v);

  const cells = values.map((v, i) => {
    const h = max > 0 ? Math.max(2, Math.round((v / max) * 46)) : 2;
    const share = total > 0 ? (v / total) * 100 : 0;
    return `
      <div class="band ${i === peak ? 'peak' : ''}" title="${bands[i]} · ${fmtNum(v, 1)} ${unit} (${share.toFixed(0)}%)">
        <div class="band-val">${label(v)}</div>
        <div class="band-bar" style="height:${h}px;background:${i === peak ? ramp[ramp.length - 1] : ramp[2]}"></div>
        <div class="band-lbl">${bands[i]}</div>
      </div>`;
  }).join('');

  return `<div class="bands">${cells}</div>`;
}

function riderChart(types, values) {
  const pct = shares(values);
  const rows = types
    .map((t, i) => ({ label: RIDER_LABELS[t] || t, pct: pct[i], value: values[i] }))
    .sort((a, b) => b.pct - a.pct)
    .map(r => `
      <div class="rider" title="${r.label} · ${fmtNum(r.value, 1)} עליות ביום">
        <span class="rider-lbl">${r.label}</span>
        <span class="rider-track"><span class="rider-fill" style="width:${r.pct.toFixed(1)}%"></span></span>
        <span class="rider-pct">${r.pct.toFixed(0)}%</span>
      </div>`).join('');

  return `<div class="riders">${rows}</div>`;
}

/** Detail for one stop, or the roll-up across everything currently visible. */
export function StopPanel() {
  const el = html`<div id="stopPanel" dir="rtl"></div>`;

  function close() {
    stops.clearSelection();
    el.style.display = 'none';
  }

  function stopHtml(s) {
    const bands = data.stops.bands;
    const surveyed = s.boardings_day != null;
    const peakBand = surveyed
      ? bands[s.boardings_by_band.indexOf(Math.max(...s.boardings_by_band))]
      : null;
    const address = [s.street, s.house || ''].filter(Boolean).join(' ');

    return `
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">${escHtml(s.name)}</div>
        <div class="stop-sub">מק״ט ${escHtml(s.code)} · ${s.routes.length || s.routes_reported || 0} קווים${address ? ' · ' + escHtml(address) : ''}</div>
      </div>

      <div class="stop-tiles">
        ${tile(fmtNum(s.departures_day), 'עצירות מתוזמנות ביום')}
        ${tile(surveyed ? fmtNum(s.boardings_day) : '—', 'עליות ביום', 'var(--primary)')}
        ${tile(s.transfer_pct != null ? s.transfer_pct.toFixed(0) + '%' : '—', '% נסיעות מעבר')}
        ${tile(fmtNum(s.routes.length || s.routes_reported), 'קווים')}
      </div>

      ${s.routes.length ? `
        <div class="stop-sec">קווים בתחנה</div>
        <div class="stop-chips">${s.routes.map(r => `<span class="chip">${escHtml(r)}</span>`).join('')}</div>` : ''}

      ${surveyed ? `
        <div class="stop-sec">עליות לתחנה לפי שעה</div>
        ${bandChart(bands, s.boardings_by_band, 'עליות')}

        <div class="stop-sec">פילוח נוסעים</div>
        ${riderChart(data.stops.rider_types, s.riders)}

        <div class="stop-tiles">
          ${tile(s.trips_to_dest != null ? s.trips_to_dest.toFixed(2) : '—', 'נסיעות ממוצע ליעד')}
          ${tile(peakBand, 'שעת שיא', 'var(--primary)')}
        </div>` : `
        <div class="stop-empty">התחנה לא נכללה בסקר העליות — מוצגות רק העצירות המתוזמנות והקווים מתוך ה-GTFS.</div>`}

      <div class="stop-foot"><button class="stop-link" data-view="city">↩ סקירת כל התחנות</button></div>
      <div class="stop-src">${escHtml(data.stops.source)}</div>`;
  }

  /**
   * Area-wide roll-up, summed from the same station records the map is drawing,
   * so the headline and the dots can't disagree — and it follows the area filter
   * for free.
   */
  function cityHtml() {
    const surveyed = stops.stopsState.visible.filter(s => s.boardings_day != null);
    const bandTotals = data.stops.bands.map((_, i) =>
      surveyed.reduce((a, s) => a + (s.boardings_by_band ? s.boardings_by_band[i] : 0), 0));
    const riderTotals = data.stops.rider_types.map((_, i) =>
      surveyed.reduce((a, s) => a + (s.riders ? s.riders[i] : 0), 0));
    const boardings = surveyed.reduce((a, s) => a + s.boardings_day, 0);
    const top = [...surveyed].sort((a, b) => b.boardings_day - a.boardings_day).slice(0, 5);

    return `
      <div class="stop-head">
        <button class="stop-close" title="סגירה">✕</button>
        <div class="stop-title">סקירת תחנות · ${state.area ? 'בשכונה הנבחרת' : 'ברחבי העיר'}</div>
        <div class="stop-sub">${fmtNum(stops.stopsState.visible.length)} תחנות · ${fmtNum(surveyed.length)} עם נתוני סקר</div>
      </div>

      <div class="stop-tiles">
        ${tile(fmtNum(boardings), 'עליות ביום', 'var(--primary)')}
        ${tile(fmtNum(surveyed.reduce((a, s) => a + (s.departures_day || 0), 0)), 'עצירות ביום')}
      </div>

      <div class="stop-sec">עליות לפי שעה</div>
      ${bandChart(data.stops.bands, bandTotals, 'עליות')}

      <div class="stop-sec">פילוח נוסעים</div>
      ${riderChart(data.stops.rider_types, riderTotals)}

      <div class="stop-sec">התחנות העמוסות ביותר</div>
      <div class="stop-top">
        ${top.map(s => `
          <button class="stop-top-row" data-key="${escHtml(stops.stopKey(s))}">
            <span class="stop-top-name">${escHtml(s.name)}</span>
            <span class="stop-top-val">${fmtNum(s.boardings_day)}</span>
          </button>`).join('')}
      </div>
      <div class="stop-src">${escHtml(data.stops.source)}</div>`;
  }

  function render() {
    if (!data.stops) return;
    el.style.display = 'block';
    el.scrollTop = 0;
    el.innerHTML = stops.stopsState.selected ? stopHtml(stops.stopsState.selected) : cityHtml();

    el.querySelector('.stop-close').addEventListener('click', close);

    el.querySelector('.stop-link')?.addEventListener('click', () => {
      stops.clearSelection();
      render();
    });

    el.querySelectorAll('.stop-top-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = stops.stopsState.visible.find(x => stops.stopKey(x) === btn.dataset.key);
        if (!s) return;
        stops.select(s);
        map.setView([s.lat, s.lon], Math.max(map.getZoom(), 16));
      });
    });
  }

  return {
    el,
    render,
    close,
    /** Re-render only if the panel is currently on screen. */
    refresh() { if (el.style.display === 'block') render(); },
  };
}
