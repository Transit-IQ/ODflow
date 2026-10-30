import './JunctionPanel.css';
import { html } from '../../core/dom.js';
import { state } from '../../core/store.js';
import { data } from '../../core/data.js';
import { fmtNum, escHtml } from '../../core/format.js';
import { bandIndex } from '../../core/periods.js';
import { juncRamp } from '../../core/palette.js';
import * as junctions from '../../layers/junctions.js';

/**
 * The turning-movement panel for one signalized junction.
 *
 * **Every count in here is synthetic** — see `layers/junctions.js`. The demo badge
 * is rendered first, before any figure, and is not conditional: a reader who opens
 * this panel learns what the numbers are before they read one.
 *
 * The three movements are shown twice on purpose. The diagram answers "what shape
 * is this junction, and where does the traffic go" at a glance; the table answers
 * "how many, exactly". Neither substitutes for the other, and both read from one
 * array, so they cannot disagree.
 */

const MOVES = [
  { key: 'left', label: 'שמאלה' },
  { key: 'through', label: 'ישר' },
  { key: 'right', label: 'ימינה' },
];

/** One movement's count for the selected cut — daily total, or the period's band. */
function moveValue(approach, key) {
  const values = approach[key] || [];
  if (state.period === 'all' || state.period == null) {
    return values.reduce((a, v) => a + v, 0);
  }
  const band = bandIndex(state.period);
  return band == null ? 0 : (values[band] || 0);
}

/**
 * The junction drawn as its real legs, each carrying its three turn arrows.
 *
 * Legs sit at their true bearings rather than on a tidy cross: a skewed junction
 * looks skewed, which is the only way the diagram can be checked against the map.
 * Arrow thickness is the movement's share of that approach, so a leg where almost
 * everyone goes straight looks different from one that mostly turns.
 */
function diagram(junction) {
  const R = 86;           // leg length from centre, in SVG units
  const cx = 100, cy = 100;
  const ramp = juncRamp();
  const stroke = ramp[ramp.length - 2];

  const legs = junction.approaches.map((a, i) => {
    // Bearing is compass (0 = north, clockwise); SVG y grows downward, so north
    // is -y. Converting here rather than in the data keeps the payload in the
    // convention the rest of the world uses for bearings.
    const rad = (a.bearing * Math.PI) / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const ex = cx + dx * R, ey = cy + dy * R;

    const total = MOVES.reduce((sum, m) => sum + moveValue(a, m.key), 0);
    // Perpendicular offset, so the three arrowheads on one leg do not stack.
    const px = -dy, py = dx;

    const arrows = MOVES.map((m, k) => {
      const v = moveValue(a, m.key);
      const share = total > 0 ? v / total : 0;
      const off = (k - 1) * 7;
      const w = 1 + share * 6;
      const tipR = R - 16;
      return `<line x1="${(cx + dx * 26 + px * off).toFixed(1)}" y1="${(cy + dy * 26 + py * off).toFixed(1)}"
                    x2="${(cx + dx * tipR + px * off).toFixed(1)}" y2="${(cy + dy * tipR + py * off).toFixed(1)}"
                    stroke="${stroke}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"
                    opacity="${(0.35 + share * 0.65).toFixed(2)}">
                <title>${escHtml(a.dir)} · ${m.label} · ${fmtNum(v)}</title>
              </line>`;
    }).join('');

    return `
      <line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"
            class="junc-leg" stroke-width="13" stroke-linecap="round"/>
      ${arrows}
      <text x="${(cx + dx * (R + 9)).toFixed(1)}" y="${(cy + dy * (R + 9)).toFixed(1)}"
            class="junc-leg-lbl" text-anchor="middle" dominant-baseline="middle">${i + 1}</text>`;
  }).join('');

  return `<svg class="junc-diagram" viewBox="0 0 200 200" role="img"
               aria-label="תרשים פניות בצומת ${escHtml(junction.name)}">
            ${legs}
            <circle cx="${cx}" cy="${cy}" r="9" class="junc-hub"/>
          </svg>`;
}

/**
 * One row per approach.
 *
 * The street name sits beside the compass direction because the direction alone is
 * not always unique — a skewed four-way can present two arms in the same compass
 * sector, and six of the hundred junctions in the generated set do. Naming the
 * street is what makes each row identifiable.
 */
function approachTable(junction) {
  const rows = junction.approaches.map((a, i) => {
    const vals = MOVES.map(m => moveValue(a, m.key));
    const total = vals.reduce((x, y) => x + y, 0);
    return `
      <tr>
        <td class="junc-leg-n">${i + 1}</td>
        <td class="junc-approach">
          <span class="junc-dir">${escHtml(a.dir)}</span>
          <span class="junc-street">${escHtml(a.street)}</span>
        </td>
        ${vals.map(v => `<td class="junc-num">${fmtNum(v)}</td>`).join('')}
        <td class="junc-num junc-total">${fmtNum(total)}</td>
      </tr>`;
  }).join('');

  return `
    <table class="junc-table">
      <thead>
        <tr>
          <th></th><th>גישה</th>
          ${MOVES.map(m => `<th>${m.label}</th>`).join('')}
          <th>סה״כ</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function JunctionPanel() {
  const el = html`<div id="juncPanel"></div>`;

  function close() {
    el.style.display = 'none';
    junctions.clearSelection();
  }

  function junctionHtml(j) {
    const total = junctions.totalVolume(j);
    const busiest = j.approaches
      .map((a, i) => ({ i, a, v: junctions.approachVolume(a) }))
      .sort((x, y) => y.v - x.v)[0];

    return `
      <div class="junc-head">
        <button class="junc-close" title="סגירה">✕</button>
        <div class="junc-title">${escHtml(j.name)}</div>
        <div class="junc-sub">צומת מרומזר · ${j.approaches.length} גישות</div>
      </div>

      <div class="junc-demo">נתוני דמו — הנפחים סינתטיים, הצומת והרחובות אמיתיים</div>

      <div class="junc-tiles">
        <div class="junc-tile">
          <div class="junc-tile-val">${fmtNum(total)}</div>
          <div class="junc-tile-lbl">${escHtml(junctions.valueLabel())}</div>
        </div>
        <div class="junc-tile">
          <div class="junc-tile-val">${escHtml(busiest.a.dir)}</div>
          <div class="junc-tile-lbl">גישה עמוסה · ${fmtNum(busiest.v)}</div>
        </div>
      </div>

      <div class="junc-sec">תרשים פניות</div>
      ${diagram(j)}

      <div class="junc-sec">נפחים לפי גישה</div>
      ${approachTable(j)}

      <div class="junc-src">${escHtml(data.junctions.source)}</div>`;
  }

  function render() {
    const j = junctions.junctionsState.selected;
    if (!j || !data.junctions) { el.style.display = 'none'; return; }

    el.style.display = 'block';
    el.scrollTop = 0;
    el.innerHTML = junctionHtml(j);
    el.querySelector('.junc-close').addEventListener('click', close);
  }

  /** Re-render only if the panel is currently on screen. */
  function refresh() {
    if (el.style.display === 'block') render();
  }

  return { el, render, close, refresh };
}
