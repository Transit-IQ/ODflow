import './SpeedLegend.css';
import { html } from '../../core/dom.js';
import { SPEED_BREAKS, CONGESTION_KMH } from '../../core/palette.js';

/**
 * The speed ramp, generated from the same break points the map classifies with —
 * change SPEED_BREAKS in core/palette.js and this legend follows.
 */
const BAND_NOTES = ['גודש קשה', 'גודש', 'איטי', 'זורם', 'מהיר / נתיב מהיר'];

export function SpeedLegend() {
  const bands = BAND_NOTES.map((note, i) => {
    const lo = i === 0 ? 0 : SPEED_BREAKS[i - 1];
    const hi = i < SPEED_BREAKS.length ? SPEED_BREAKS[i] : null;
    const range = hi == null ? `${lo}+` : `${lo}–${hi}`;
    return `<span style="background:var(--sp${i + 1})" title="${range} קמ״ש · ${note}"></span>`;
  }).join('');

  const ticks = ['0', ...SPEED_BREAKS.map(String), '+']
    .map(t => `<i>${t}</i>`).join('');

  const el = html`
    <div class="block" style="--tint:var(--ramp)">
      <h3>מקרא מהירות</h3>
      <div class="ramp-bar">${bands}</div>
      <div class="ramp-ticks">${ticks}</div>
      <div class="ramp-note">
        קמ״ש · קו עבה = איטי יותר. סף הגודש בדוח הוא <b>${CONGESTION_KMH} קמ״ש</b>.
      </div>
    </div>`;

  return { el };
}
