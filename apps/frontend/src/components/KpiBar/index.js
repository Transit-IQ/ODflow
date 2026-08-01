import './KpiBar.css';
import { html, $ } from '../../core/dom.js';
import { fmtNum, periodLabel } from '../../core/format.js';

/**
 * The four headline figures.
 *
 * `tint` is the cap colour and `tone` the figure colour, both keyed to the layer
 * the tile describes — speed to the band ramp, congestion to rose, the network
 * to blue, ridership to teal.
 */
const TILES = [
  { id: 'avg',   label: 'מהירות אוטובוס ממוצעת', unit: 'קמ״ש',    tint: 'var(--ramp)',    note: 'ממוצע כל היום' },
  { id: 'cong',  label: 'מקטעים בגודש',          unit: '% מהרשת', tint: 'var(--c-cong)',  tone: 'var(--c-cong)', note: 'מתחת ל־15 קמ״ש' },
  { id: 'seg',   label: 'מקטעי כביש בניתוח',     unit: '',        tint: 'var(--c-net)',   note: 'ברחבי העיר' },
  { id: 'board', label: 'עליות לאוטובוס ביום',   unit: '',        tint: 'var(--c-ride)',  tone: 'var(--c-ride)', note: 'סקר תחנות' },
];

export function KpiBar() {
  const el = html`
    <div class="kpis">
      ${TILES.map(t => `
        <div class="kpi" style="--tint:${t.tint}${t.tone ? `;--tone:${t.tone}` : ''}">
          <div class="k">${t.label}</div>
          <div class="row">
            <span class="v" data-v="${t.id}">—</span>
            ${t.unit ? `<span class="u">${t.unit}</span>` : ''}
          </div>
          <div class="d" data-d="${t.id}">${t.note}</div>
        </div>`).join('')}
    </div>`;

  const value = id => $(el, `[data-v="${id}"]`);
  const note = id => $(el, `[data-d="${id}"]`);

  return {
    el,

    /** Show a placeholder in the two tiles that depend on the speed file. */
    setLoading(text = 'טוען…') {
      value('avg').textContent = text;
      value('seg').textContent = text;
    },

    /** Figures straight off the speed layer's recolor pass. */
    setSpeedStats({ avgSpeed, congestedPct, segmentCount }, period) {
      value('avg').textContent = avgSpeed == null ? '—' : avgSpeed.toFixed(1);
      value('cong').textContent = congestedPct == null ? '—' : congestedPct;
      if (segmentCount) value('seg').textContent = fmtNum(segmentCount);
      note('avg').textContent = periodLabel(period);
    },

    /** Caption under the segment count: which area the totals are scoped to. */
    setScope(areaName) {
      note('seg').textContent = areaName ? `בגבולות ${areaName}` : 'ברחבי העיר';
    },

    setSegmentError(text) {
      value('seg').textContent = text;
    },

    /**
     * Daily boardings. Reads the area's own pre-computed `transit` block when
     * one is selected and the city total otherwise — both produced by the same
     * pipeline summary function, so the tile matches the stop panel's roll-up.
     */
    setRidership(neigh, cityTotals) {
      if (neigh?.transit) {
        value('board').textContent = fmtNum(neigh.transit.boardings_day);
        note('board').textContent = `${fmtNum(neigh.transit.surveyed)} תחנות · ${neigh.name}`;
      } else if (neigh) {
        value('board').textContent = '—';
        note('board').textContent = `אין תחנות מסוקרות ב${neigh.name}`;
      } else if (cityTotals) {
        value('board').textContent = fmtNum(cityTotals.boardings_day);
        note('board').textContent = `${fmtNum(cityTotals.surveyed)} תחנות מסוקרות · כל העיר`;
      }
    },
  };
}
