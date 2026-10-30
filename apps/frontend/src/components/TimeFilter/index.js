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
 * The day / time-of-day cut, and the day animation.
 *
 * Each period is ONE row carrying everything known about that window: its name,
 * its hours, and its average bus speed — the speed as a bar filling the row
 * behind the text, the figure at the end.
 *
 * It used to be two controls. A list of seven period rows, then a sparkline of
 * seven bars for the same seven periods, each clickable, each filtering to the
 * same thing. Two ways to press the same button, and a reader comparing a
 * period's name to its speed had to look in two places and match them up by
 * position.
 *
 * The merge buys less height than it looks like it should — the sparkline and
 * its caption were about 80px, and the roomier rows give most of that back, so
 * the block went from 508px to 477px. The gain is that there is now one control
 * instead of two and the speed sits on the same line as the label it belongs to.
 *
 * The bar is the row's background rather than a column of its own: Hebrew period
 * names run long ("שעת שיא אחר הצהריים") and a dedicated bar column would have
 * taken the width they need.
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
      <div class="spark-cap">מהירות אוטובוס ממוצעת לפי חלון זמן · לחיצה מסננת</div>
      <div class="playrow">
        <button class="btn" data-play>${PLAY_LABEL}</button>
        <button class="btn ghost" data-reset title="איפוס כל הבחירות">איפוס</button>
      </div>
    </div>`;

  const daysEl = $(el, '.days');
  const periodsEl = $(el, '.periods');
  const allEl = $(el, '.allp');
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

    // Bars are scaled to the fastest period on screen, not to an absolute ceiling:
    // the spread between a city's windows is what the reader is comparing, and
    // against a fixed 0–60 scale seven urban speeds all look identically slow.
    const speeds = periods.map((_, i) => periodSpeed(i));
    const known = speeds.filter(v => v != null);
    const max = known.length ? Math.max(...known) : 0;

    periods.forEach((_, i) => {
      const speedless = !hasSpeed(i);
      const v = speeds[i];
      // A floor of 6%, so the slowest window still shows a bar. A zero-width fill
      // would read as "no data", which is a different statement and already has
      // its own treatment below.
      const fill = v == null || !max ? 0 : Math.max(6, (v / max) * 100);

      const row = html`
        <div class="prow${speedless ? ' no-speed' : ''}"
             style="--fill:${fill.toFixed(1)}%;--band:${v == null ? 'transparent' : speedColor(v)}"
             title="${periodName(i)} ${hoursLabel(i)}${speedless
               ? ' · הסקר מדווח עליות בחלון זה; קובץ המהירויות אינו מכסה אותו'
               : ` · ${v.toFixed(1)} קמ״ש`}">
          <span class="pn">P${i + 1}</span>
          <span class="pl">${periodName(i)}</span>
          <span class="pt" dir="ltr">${hoursLabel(i)}</span>
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

  // ── Speed per period ────────────────────────────────────────────────────
  /**
   * speed_profile is indexed by speed WINDOW, and a period can hold two of them
   * (04-06) or none (the 00-04 night the speed file does not cover), so a
   * period's speed is the mean of whatever windows it holds. A period with no
   * window stays null and is drawn as "no reading" rather than dropped: the
   * survey has real boardings there, and a missing row would read as a period
   * that does not exist.
   */
  function periodSpeed(i) {
    const idx = speedIndices(i);
    const vals = idx.map(w => data.speedProfile?.[w]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function sync() {
    [...daysEl.children].forEach((c, i) => {
      c.classList.toggle('on', (i < DAYAB.length && state.day === i) ||
                               (i === DAYAB.length && state.day === 'avg'));
    });
    [...periodsEl.children].forEach((c, i) => c.classList.toggle('on', state.period === i));
    allEl.classList.toggle('on', state.period === 'all');
  }

  sync();

  return { el, sync, buildPeriods, stopPlaying };
}
