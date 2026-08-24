import './KpiBar.css';
import { html, $ } from '../../core/dom.js';
import { fmtNum, periodLabel } from '../../core/format.js';
import { hasSpeed } from '../../core/periods.js';

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

    /**
     * Figures straight off the speed layer's recolor pass.
     *
     * The survey and the speed file do not cover the same day: the survey reports
     * boardings for the 00-04 night band, the speed file has no window there. On
     * that period the tile says so instead of showing a dash the reader would
     * take for "no congestion" — the boardings tile beside it stays populated.
     */
    setSpeedStats({ avgSpeed, congestedPct, segmentCount }, period) {
      const covered = period === 'all' || hasSpeed(period);
      value('avg').textContent = avgSpeed == null ? '—' : avgSpeed.toFixed(1);
      value('cong').textContent = congestedPct == null ? '—' : congestedPct;
      if (segmentCount) value('seg').textContent = fmtNum(segmentCount);
      note('avg').textContent = covered
        ? periodLabel(period)
        : `${periodLabel(period)} · אין נתוני מהירות`;
    },

    /** Caption under the segment count: which area the totals are scoped to. */
    setScope(areaName) {
      note('seg').textContent = areaName ? `בגבולות ${areaName}` : 'ברחבי העיר';
    },

    setSegmentError(text) {
      value('seg').textContent = text;
    },

    /**
     * Daily boardings for the current selection, or for the whole city when
     * nothing is selected.
     *
     * `stations` is the list the map is drawing under the same area filter, and
     * it is the preferred source: neighbourhood catchments overlap (a station a
     * short walk from two borders serves both), so adding up the neighbourhoods'
     * pre-computed `transit` blocks would count those stations once per
     * neighbourhood. Summing the stations themselves counts each exactly once.
     *
     * The pre-computed block is used only as the immediate figure for a single
     * neighbourhood, where it is identical to the station sum, so the tile shows
     * a real number before the (lazily fetched) stop file has landed.
     */
    setRidership(neighs, cityTotals, stations = null) {
      const picked = neighs || [];

      if (!picked.length) {
        if (cityTotals) {
          value('board').textContent = fmtNum(cityTotals.boardings_day);
          note('board').textContent = `${fmtNum(cityTotals.surveyed)} תחנות מסוקרות · כל העיר`;
        }
        return;
      }

      const scope = picked.length === 1 ? picked[0].name : `${fmtNum(picked.length)} שכונות`;

      if (stations) {
        const surveyed = stations.filter(s => s.boardings_day != null);
        if (!surveyed.length) {
          value('board').textContent = '—';
          note('board').textContent = `אין תחנות מסוקרות ב${scope}`;
          return;
        }
        value('board').textContent = fmtNum(surveyed.reduce((a, s) => a + s.boardings_day, 0));
        note('board').textContent = `${fmtNum(surveyed.length)} תחנות · ${scope}`;
        return;
      }

      if (picked.length === 1 && picked[0].transit) {
        value('board').textContent = fmtNum(picked[0].transit.boardings_day);
        note('board').textContent = `${fmtNum(picked[0].transit.surveyed)} תחנות · ${scope}`;
      } else if (picked.length === 1) {
        value('board').textContent = '—';
        note('board').textContent = `אין תחנות מסוקרות ב${scope}`;
      } else {
        // Several neighbourhoods and no station file yet: any figure printed here
        // would be the over-count described above, so the tile waits instead.
        value('board').textContent = '…';
        note('board').textContent = scope;
      }
    },
  };
}
