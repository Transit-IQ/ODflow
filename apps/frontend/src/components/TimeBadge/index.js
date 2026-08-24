import './TimeBadge.css';
import { html, $ } from '../../core/dom.js';
import { DAYAB, dayLabel, periodLabel } from '../../core/format.js';
import { periodName } from '../../core/periods.js';

/** What the map is currently showing, in words, over the map. */
export function TimeBadge() {
  const el = html`
    <div class="timebadge">
      <div class="now">—</div>
      <div class="lbl">בחר יום ושעה מהתפריט</div>
    </div>`;

  const nowEl = $(el, '.now');
  const subEl = $(el, '.lbl');

  return {
    el,
    update({ day, period }) {
      const dayPart = day === 'avg' ? 'ממוצע' : DAYAB[day];
      const periodPart = period === 'all' ? 'כל היום' : periodName(period);
      nowEl.textContent = `${dayPart} · ${periodPart}`;
      subEl.textContent = `${dayLabel(day)} · ${periodLabel(period)}`;
    },
  };
}
