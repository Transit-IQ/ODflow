/**
 * Point-in-area tests used by every layer that honours the neighbourhood
 * selection. Pure functions — no Leaflet, no DOM.
 */

// Standard ray-casting point-in-ring test. `ring` is a GeoJSON-style array
// of [lon, lat] pairs.
function rayCastInRing(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(lat, lon, rings) {
  if (!rayCastInRing(lat, lon, rings[0])) return false;   // outside exterior ring
  for (let i = 1; i < rings.length; i++) {
    if (rayCastInRing(lat, lon, rings[i])) return false;  // inside a hole
  }
  return true;
}

function geometryContains(lat, lon, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') return pointInPolygonRings(lat, lon, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(poly => pointInPolygonRings(lat, lon, poly));
  }
  return false;
}

/**
 * area = { bbox: {min_lat,max_lat,min_lon,max_lon}, boundary: GeoJSON|null }
 * bbox is always checked first (cheap pre-filter); when a real boundary polygon
 * exists it's the precise test, otherwise the bbox itself is the area.
 */
export function pointInArea(lat, lon, area) {
  const b = area.bbox;
  if (lat < b.min_lat || lat > b.max_lat || lon < b.min_lon || lon > b.max_lon) return false;
  return area.boundary ? geometryContains(lat, lon, area.boundary) : true;
}

/** True when any vertex of a Leaflet polyline falls inside the area. */
export function polylineInArea(polyline, area) {
  for (const ll of polyline.getLatLngs()) {
    if (pointInArea(ll.lat, ll.lng, area)) return true;
  }
  return false;
}

/** A bbox as a closed [lon, lat] ring, for areas with no polygon of their own. */
function bboxRing(b) {
  return [[
    [b.min_lon, b.min_lat], [b.max_lon, b.min_lat],
    [b.max_lon, b.max_lat], [b.min_lon, b.max_lat], [b.min_lon, b.min_lat],
  ]];
}

/**
 * Fold any number of selected neighbourhoods into the single `area` object the
 * layers filter by — one MultiPolygon and one enclosing bbox, so a selection of
 * five costs a layer exactly what a selection of one does.
 *
 * The *analysis* geometry is what goes in: every layer then shows the same
 * catchment (border + `analysis_buffer_m`) the pipeline computed the routes and
 * ridership figures from, instead of the map and the KPIs disagreeing about
 * where a neighbourhood ends.
 *
 * The parts are unioned only in the loose sense of being collected into one
 * MultiPolygon — adjacent catchments overlap and their rings are left crossing
 * each other. That is harmless for the only question ever asked of the result
 * ("is this point inside any of them?"), and doing it properly would mean
 * shipping a polygon-clipping library to answer a question nobody asks.
 */
export function combineAreas(records) {
  if (!records?.length) return null;

  const coordinates = [];
  let bbox = null;

  for (const r of records) {
    const b = r.analysis_bbox || r.bbox;
    bbox = bbox ? {
      min_lat: Math.min(bbox.min_lat, b.min_lat), max_lat: Math.max(bbox.max_lat, b.max_lat),
      min_lon: Math.min(bbox.min_lon, b.min_lon), max_lon: Math.max(bbox.max_lon, b.max_lon),
    } : { ...b };

    const geom = r.analysis_boundary || r.boundary;
    if (geom?.type === 'Polygon') coordinates.push(geom.coordinates);
    else if (geom?.type === 'MultiPolygon') coordinates.push(...geom.coordinates);
    else coordinates.push(bboxRing(b));   // no polygon in the data — the bbox is the area
  }

  return { bbox, boundary: { type: 'MultiPolygon', coordinates } };
}
