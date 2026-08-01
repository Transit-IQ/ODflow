/**
 * Every fetch of the static JSON the backend pipeline generates, and the cache
 * of what came back. Nothing here computes — it only loads.
 *
 * The three heavy files (destinations, stops, the route index) are fetched on
 * first use rather than at boot, which is what keeps the initial load small.
 */

import { DEFAULT_CENTER } from './map.js';

const url = name => `${import.meta.env.BASE_URL}data/${name}`;

/** Everything loaded so far. Read-only from a component's point of view. */
export const data = {
  center: DEFAULT_CENTER,
  border: null,          // city-limits GeoJSON
  segments: [],          // speed network: [{ coordinates, speeds[35] }]
  speedProfile: null,    // average speed per period, P1..P7
  stopTotals: null,      // city-wide ridership roll-up from kpis.json
  destinations: null,    // { categories, points } — lazy
  stops: null,           // { stations, bands, rider_types, source } — lazy
  neighbourhoods: [],    // selectable areas
  routesById: null,      // route_id → route record — lazy
};

async function getJson(name) {
  const res = await fetch(url(name));
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

/**
 * The three files the dashboard cannot render without. Resolves once all three
 * have settled; a failure of any one is reported rather than thrown, so a
 * missing optional file never blanks the whole dashboard.
 */
export async function loadCore() {
  const [border, segments, kpis] = await Promise.allSettled([
    getJson('border.json'),
    getJson('speeds.json'),
    getJson('kpis.json'),
  ]);

  if (border.status === 'fulfilled') {
    data.border = border.value;
    const ring = border.value?.geometry?.coordinates?.[0];
    if (ring?.length) {
      const lats = ring.map(c => c[1]);
      const lons = ring.map(c => c[0]);
      data.center = [(Math.min(...lats) + Math.max(...lats)) / 2,
                     (Math.min(...lons) + Math.max(...lons)) / 2];
    }
  }

  if (segments.status === 'fulfilled') data.segments = segments.value;

  if (kpis.status === 'fulfilled') {
    data.speedProfile = kpis.value.speed_profile || null;
    // City-wide ridership totals ride along in kpis.json so the boardings tile
    // has a real figure before anyone opens the (lazily fetched) stop layer.
    data.stopTotals = kpis.value.stops || null;
  }

  return { segmentsFailed: segments.status === 'rejected' };
}

export async function loadNeighbourhoods() {
  if (data.neighbourhoods.length) return data.neighbourhoods;
  data.neighbourhoods = await getJson('neighbourhoods.json');
  return data.neighbourhoods;
}

// Each lazy loader is memoised on its promise, so two callers racing on the
// first toggle share one request instead of firing two.
const pending = new Map();

function once(key, load) {
  if (!pending.has(key)) {
    pending.set(key, load().catch(e => { pending.delete(key); throw e; }));
  }
  return pending.get(key);
}

export function loadDestinations() {
  return once('destinations', async () => {
    data.destinations = await getJson('destinations.json');
    return data.destinations;
  });
}

export function loadStops() {
  return once('stops', async () => {
    data.stops = await getJson('stops.json');
    return data.stops;
  });
}

export function loadRoutesIndex() {
  return once('routes', async () => {
    data.routesById = await getJson('neighbourhood_routes.json');
    return data.routesById;
  });
}
