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
