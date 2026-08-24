import './TimeFilter.css';
import { html, $ } from '../../core/dom.js';
import { state, setState } from '../../core/store.js';
import { DAYAB } from '../../core/format.js';
import { periods, periodName, hoursLabel, speedIndices, hasSpeed } from '../../core/periods.js';
import { speedColor } from '../../core/palette.js';
import { data } from '../../core/data.js';

const PLAY_LABEL = '▶ הרצת יום';
const STOP_LABEL = '⏸ עצור';
const STEP_MS = 1100;

/**
 * The day / time-of-day cut, plus the speed-by-period sparkline that doubles as
 * a period picker and the day animation.
 *
 * `onReset` is supplied by main.js because a reset clears selections this
 * component doesn't own (active routes, the map view).
 */
export function TimeFilter({ onReset } = {}) {
  const el = html`
    <div class="block" style="--tint:var(--c-time)">
      <h3>חתך זמן</h3>
      <div class="days"></div>
      <div class="periods"></div>
      <div class="allp on">כל שעות היום (ממוצע)</div>
      <div class="spark"></div>
      <div class="spark-cap">מהירות ממוצעת לפי חלון זמן · לחיצה מסננת</div>
      <div class="playrow">
        <button class="btn" data-play>${PLAY_LABEL}</button>
        <button class="btn ghost" data-reset title="איפוס כל הבחירות">איפוס</button>
      </div>
    </div>`;

  const daysEl = $(el, '.days');
  const periodsEl = $(el, '.periods');
  const allEl = $(el, '.allp');
  const sparkEl = $(el, '.spark');
  const playBtn = $(el, '[data-play]');

  let playing = null;

  // ── Day pills: א׳..ה׳ then the weekday average ──────────────────────────
  DAYAB.forEach((label, i) => {
    const b = html`<div class="day">${label}</div>`;
    b.addEventListener('click', () => setState({ day: i }));
    daysEl.appendChild(b);
  });
  const avgBtn = html`<div class="day avg">ממוצע</div>`;
  avgBtn.addEventListener('click', () => setState({ day: 'avg' }));
  daysEl.appendChild(avgBtn);

  // ── Time-of-day rows ────────────────────────────────────────────────────
  // Built from the axis kpis.json ships rather than at construction time: the
  // hour ranges are the survey's, so they do not exist until the file has landed.
  function buildPeriods() {
    periodsEl.replaceChildren();
    periods.forEach((_, i) => {
      const speedless = !hasSpeed(i);
      const row = html`
        <div class="prow${speedless ? ' no-speed' : ''}"
             title="${speedless ? 'הסקר מדווח עליות בחלון זה; קובץ המהירויות אינו מכסה אותו' : ''}">
          <span class="pn">P${i + 1}</span>
          <span class="pl">${periodName(i)}</span>
          <span class="pt">${hoursLabel(i)}</span>
        </div>`;
      row.addEventListener('click', () => setState({ period: i }));
      periodsEl.appendChild(row);
    });
    sync();
  }
  allEl.addEventListener('click', () => setState({ period: 'all' }));

  // ── Day animation ───────────────────────────────────────────────────────
  function stopPlaying() {
    if (!playing) return;
    clearInterval(playing);
    playing = null;
    playBtn.textContent = PLAY_LABEL;
  }

  playBtn.addEventListener('click', () => {
    if (playing) { stopPlaying(); return; }
    playBtn.textContent = STOP_LABEL;
    setState({ period: 0 });
    let p = 0;
    playing = setInterval(() => {
      p = (p + 1) % (periods.length || 1);
      setState({ period: p });
    }, STEP_MS);
  });

  $(el, '[data-reset]').addEventListener('click', () => {
    stopPlaying();
    setState({ day: 'avg', period: 'all' });
    onReset?.();
  });

  // ── Sparkline ───────────────────────────────────────────────────────────
  /**
   * One bar per period, so the sparkline and the pills are the same axis.
   *
   * speed_profile is indexed by speed WINDOW, and a period can hold two of them
   * (04-06) or none (the 00-04 night the speed file does not cover), so a bar's
   * value is the mean of whatever windows its period holds. The night bar is
   * drawn empty and captioned rather than dropped: the survey has real boardings
   * there, and a missing bar would read as a period that does not exist.
   */
  function periodSpeed(i) {
    const idx = speedIndices(i);
    const vals = idx.map(w => data.speedProfile?.[w]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function buildSpark() {
    sparkEl.replaceChildren();
    if (!data.speedProfile || !periods.length) return;

    const vals = periods.map((_, i) => periodSpeed(i));
    const known = vals.filter(v => v != null);
    const max = known.length ? Math.max(...known) : 1;

    vals.forEach((v, i) => {
      const h = v == null ? 0 : (v / max) * 100;
      const cap = `${periodName(i)} ${hoursLabel(i)}`;
      const bar = html`
        <div class="spk${v == null ? ' no-speed' : ''}" title="${cap}${v == null ? ' · אין נתוני מהירות בחלון זה' : ` · ${v.toFixed(1)} קמ״ש`}">
          <span class="val">${v == null ? '—' : v.toFixed(0)}</span>
          <span class="bar-wrap"><span class="bar" style="height:${h}%;background:${speedColor(v)}"></span></span>
          <span class="lab">P${i + 1}</span>
        </div>`;
      bar.addEventListener('click', () => setState({ period: i }));
      sparkEl.appendChild(bar);
    });
    sync();
  }

  function sync() {
    [...daysEl.children].forEach((c, i) => {
      c.classList.toggle('on', (i < DAYAB.length && state.day === i) ||
                               (i === DAYAB.length && state.day === 'avg'));
    });
    [...periodsEl.children].forEach((c, i) => c.classList.toggle('on', state.period === i));
    allEl.classList.toggle('on', state.period === 'all');
    [...sparkEl.children].forEach((c, i) => c.classList.toggle('on', state.period === i));
  }

  sync();

  return { el, sync, buildPeriods, buildSpark, stopPlaying };
}
