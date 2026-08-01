/**
 * User-imported GeoJSON / KML / zipped-Shapefile layers.
 *
 * Parsing lives here; the sidebar list and the drop target are the
 * ImportPanel component.
 */

import { map } from '../core/map.js';
import { mapColors } from '../core/palette.js';
import { escHtml } from '../core/format.js';
import { loadVendors } from '../core/vendor.js';

export const IMPORT_EXT_RE = /\.(geojson|json|kml|zip)$/i;

/** [{ layer, name, visible }] in import order. */
export const imported = [];

let onChange = () => {};

/** Register the callback fired whenever the imported list changes. */
export function setChangeHandler(fn) {
  onChange = fn;
}

function styleFor(color) {
  return { color, weight: 2, opacity: 0.9, fillOpacity: 0.15 };
}

function add(geojson, name) {
  const color = mapColors().imported;

  const layer = L.geoJSON(geojson, {
    style: styleFor(color),
    pointToLayer: (_f, latlng) => L.circleMarker(latlng, {
      radius: 6, color, weight: 2, fillColor: color, fillOpacity: 0.8,
    }),
    onEachFeature: (f, l) => {
      if (!f.properties) return;
      const rows = Object.entries(f.properties)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `<tr><td style="color:var(--ink3);padding-left:8px">${escHtml(k)}</td><td>${escHtml(v)}</td></tr>`)
        .join('');
      if (rows) l.bindPopup(`<table style="font-size:12px;direction:ltr;border-collapse:collapse">${rows}</table>`);
    },
  }).addTo(map);

  try { map.fitBounds(layer.getBounds(), { padding: [30, 30] }); } catch { /* empty geometry */ }

  imported.push({ layer, name, visible: true });
  onChange();
}

const readAs = (file, how) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = () => reject(reader.error);
  reader[how](file);
});

export async function importFile(file) {
  const name = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop().toLowerCase();

  try {
    if (ext === 'kml') {
      const [text] = await Promise.all([readAs(file, 'readAsText'), loadVendors('togeojson')]);
      add(toGeoJSON.kml(new DOMParser().parseFromString(text, 'text/xml')), name);

    } else if (ext === 'zip') {
      const [buf] = await Promise.all([readAs(file, 'readAsArrayBuffer'), loadVendors('jszip', 'shp')]);
      const zip = await JSZip.loadAsync(buf);
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
        prjEntry ? prjEntry.async('string') : Promise.resolve(null),
      ]);

      add(shp.combine([shp.parseShp(shpBuf, prjText), shp.parseDbf(dbfBuf)]), name);

    } else if (ext === 'geojson' || ext === 'json') {
      add(JSON.parse(await readAs(file, 'readAsText')), name);

    } else {
      alert(`סוג קובץ לא נתמך: .${ext}\nניתן לייבא GeoJSON, KML או Shapefile בקובץ ZIP.`);
    }
  } catch (err) {
    console.error('[Import] failed:', err);
    alert(`שגיאה בייבוא ${file.name}: ${err.message}`);
  }
}

export function toggleVisible(index) {
  const item = imported[index];
  if (!item) return;
  item.visible = !item.visible;
  if (item.visible) map.addLayer(item.layer);
  else map.removeLayer(item.layer);
  onChange();
}

export function remove(index) {
  const item = imported[index];
  if (!item) return;
  map.removeLayer(item.layer);
  imported.splice(index, 1);
  onChange();
}

/** Imported layers are styled at import time, so a theme flip has to restyle them. */
export function refresh() {
  const color = mapColors().imported;
  for (const { layer } of imported) {
    layer.setStyle(l => l instanceof L.CircleMarker
      ? { color, weight: 2, fillColor: color, fillOpacity: 0.8 }
      : styleFor(color));
  }
}
