/**
 * On-demand loader for the import parsers.
 *
 * togeojson + shpjs + jszip are ~600 KB between them and most sessions never
 * import a file, so they are fetched the first time they're actually needed
 * rather than blocking the dashboard's first paint. Each exposes a global
 * (`toGeoJSON`, `shp`, `JSZip`), which is why they are script tags and not
 * bundled imports.
 */

const URLS = {
  togeojson: 'https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js',
  shp: 'https://unpkg.com/shpjs@6.2.0/dist/shp.js',
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
};

const loaded = new Map();

function loadScript(url) {
  if (!loaded.has(url)) {
    loaded.set(url, new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = url;
      el.onload = resolve;
      el.onerror = () => { loaded.delete(url); reject(new Error(`failed to load ${url}`)); };
      document.head.appendChild(el);
    }));
  }
  return loaded.get(url);
}

/** Load one or more vendors by name; resolves once they're all on the page. */
export function loadVendors(...names) {
  return Promise.all(names.map(n => loadScript(URLS[n])));
}
