import './ImportPanel.css';
import { html, $ } from '../../core/dom.js';
import { escHtml } from '../../core/format.js';
import * as imports from '../../layers/imported.js';

/**
 * Bring your own layer: a file picker, the list of what's loaded, and the
 * drop target over the map.
 */
export function ImportPanel({ dropTarget } = {}) {
  const el = html`
    <div class="block" style="--tint:var(--c-net)">
      <h3>ייבוא שכבות</h3>
      <label class="btn ghost import-btn">
        + GeoJSON · KML · SHP(zip)
        <input type="file" accept=".geojson,.json,.kml,.zip" multiple hidden>
      </label>
      <ul class="imported-list"></ul>
    </div>`;

  const input = $(el, 'input[type=file]');
  const listEl = $(el, '.imported-list');

  input.addEventListener('change', () => {
    [...input.files].forEach(imports.importFile);
    input.value = '';
  });

  function renderList() {
    listEl.replaceChildren();

    imports.imported.forEach((item, i) => {
      const li = html`
        <li class="imported-item${item.visible ? ' on' : ''}">
          <span class="sw" role="button" tabindex="0" title="הצג / הסתר"></span>
          <span class="imported-name" title="${escHtml(item.name)}">${escHtml(item.name)}</span>
          <button class="imported-remove" title="הסר שכבה">✕</button>
        </li>`;

      $(li, '.sw').addEventListener('click', () => imports.toggleVisible(i));
      $(li, '.imported-remove').addEventListener('click', () => imports.remove(i));
      listEl.appendChild(li);
    });
  }

  imports.setChangeHandler(renderList);

  // Drag-and-drop onto the map. dragenter/dragleave bubble from child elements
  // (map tiles, controls), so track depth instead of toggling on every event.
  if (dropTarget) {
    let depth = 0;

    dropTarget.addEventListener('dragenter', e => {
      e.preventDefault();
      if (++depth === 1) dropTarget.classList.add('drop-active');
    });
    dropTarget.addEventListener('dragover', e => e.preventDefault());
    dropTarget.addEventListener('dragleave', () => {
      if (--depth <= 0) { depth = 0; dropTarget.classList.remove('drop-active'); }
    });
    dropTarget.addEventListener('drop', e => {
      e.preventDefault();
      depth = 0;
      dropTarget.classList.remove('drop-active');
      [...e.dataTransfer.files]
        .filter(f => imports.IMPORT_EXT_RE.test(f.name))
        .forEach(imports.importFile);
    });
  }

  return { el, renderList };
}
