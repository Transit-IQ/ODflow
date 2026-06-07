#!/usr/bin/env node
/**
 * GTFS Data Processor for Transit IQ — Regenerate routes.js
 * Uses already-extracted GTFS data to add line 17 as replacement for line 13.
 */

const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const readline = require('readline');

const EXTRACT_DIR = path.join(__dirname, 'gtfs_data', 'extracted');
const OUTPUT_PATH = path.join(__dirname, '..', 'js', 'routes.js');

const HATIKVA_BBOX = {
  minLat: 32.044, maxLat: 32.058, minLon: 34.785, maxLon: 34.802
};
const EXTENDED_BBOX = {
  minLat: 32.02, maxLat: 32.12, minLon: 34.74, maxLon: 34.85
};

const TARGET_ROUTES = {
  '2': '5',    // Dan
  '4': '5',    // Dan
  '13': '15',  // Metropolin
  '16': '5',   // Dan
  '35': '15'   // Metropolin
};
const TARGET_LINES = Object.keys(TARGET_ROUTES);

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'; i++;
      } else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim()); current = '';
    } else { current += ch; }
  }
  fields.push(current.trim());
  return fields;
}

async function parseCSV(filePath, callback) {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;
  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) {
      headers = parseCSVLine(line.replace(/^\uFEFF/, ''));
      continue;
    }
    if (!line.trim()) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    callback(row);
  }
}

async function main() {
  console.log('=== Regenerating routes.js for lines 4, 13, 16, 35 ===\n');

  // Step 1: Find routes
  const routes = [];
  await parseCSV(path.join(EXTRACT_DIR, 'routes.txt'), (row) => {
    const targetAgency = TARGET_ROUTES[row.route_short_name];
    if (targetAgency && row.agency_id === targetAgency) {
      routes.push({
        routeId: row.route_id, shortName: row.route_short_name,
        longName: row.route_long_name || '', color: row.route_color || '',
        agencyId: row.agency_id
      });
    }
  });
  console.log(`Found ${routes.length} routes`);

  // Step 2: Find shapes
  const routeIds = new Set(routes.map(r => r.routeId));
  const shapeMap = {};
  const tripRouteMap = {};
  await parseCSV(path.join(EXTRACT_DIR, 'trips.txt'), (row) => {
    if (routeIds.has(row.route_id) && row.shape_id) {
      if (!shapeMap[row.route_id]) shapeMap[row.route_id] = new Set();
      shapeMap[row.route_id].add(row.shape_id);
      tripRouteMap[row.trip_id] = row.route_id;
    }
  });

  const allShapeIds = new Set();
  for (const shapes of Object.values(shapeMap))
    for (const s of shapes) allShapeIds.add(s);
  console.log(`Need ${allShapeIds.size} shapes`);

  // Step 3: Load shapes
  const shapePoints = {};
  await parseCSV(path.join(EXTRACT_DIR, 'shapes.txt'), (row) => {
    if (allShapeIds.has(row.shape_id)) {
      if (!shapePoints[row.shape_id]) shapePoints[row.shape_id] = [];
      shapePoints[row.shape_id].push({
        lat: parseFloat(row.shape_pt_lat),
        lon: parseFloat(row.shape_pt_lon),
        seq: parseInt(row.shape_pt_sequence, 10)
      });
    }
  });
  for (const pts of Object.values(shapePoints)) pts.sort((a, b) => a.seq - b.seq);
  console.log(`Loaded ${Object.keys(shapePoints).length} shapes`);

  // Step 4: Load stops
  const routeTrips = {};
  for (const [tripId, routeId] of Object.entries(tripRouteMap))
    if (!routeTrips[routeId]) routeTrips[routeId] = tripId;

  const targetTripIds = new Set(Object.values(routeTrips));
  const routeStopIds = {};
  const tripStopSequence = {};
  await parseCSV(path.join(EXTRACT_DIR, 'stop_times.txt'), (row) => {
    if (targetTripIds.has(row.trip_id)) {
      const routeId = tripRouteMap[row.trip_id];
      if (!routeStopIds[routeId]) routeStopIds[routeId] = new Set();
      routeStopIds[routeId].add(row.stop_id);
      if (!tripStopSequence[row.trip_id]) tripStopSequence[row.trip_id] = [];
      tripStopSequence[row.trip_id].push({
        stopId: row.stop_id, seq: parseInt(row.stop_sequence, 10)
      });
    }
  });
  for (const stops of Object.values(tripStopSequence)) stops.sort((a, b) => a.seq - b.seq);

  const allStopIds = new Set();
  for (const stops of Object.values(routeStopIds))
    for (const s of stops) allStopIds.add(s);

  const stopDetails = {};
  await parseCSV(path.join(EXTRACT_DIR, 'stops.txt'), (row) => {
    if (allStopIds.has(row.stop_id)) {
      stopDetails[row.stop_id] = {
        id: row.stop_id, name: row.stop_name || '',
        lat: parseFloat(row.stop_lat), lon: parseFloat(row.stop_lon),
      };
    }
  });
  console.log(`Loaded ${Object.keys(stopDetails).length} stops`);

  // Step 5: Generate output
  const lineRoutes = {};
  routes.forEach(r => {
    if (!lineRoutes[r.shortName]) lineRoutes[r.shortName] = [];
    lineRoutes[r.shortName].push(r);
  });

  const routesData = {};
  const routesMeta = {};
  const routesStops = {};

  for (const lineNumber of TARGET_LINES) {
    const lineRts = lineRoutes[lineNumber];
    if (!lineRts) { console.log(`  WARNING: No routes for line ${lineNumber}`); continue; }

    let bestShape = null, bestRouteId = null, bestScore = -1;
    for (const rt of lineRts) {
      const shapes = shapeMap[rt.routeId];
      if (!shapes) continue;
      for (const shapeId of shapes) {
        const pts = shapePoints[shapeId];
        if (!pts) continue;
        let score = 0;
        for (const pt of pts) {
          if (pt.lat >= HATIKVA_BBOX.minLat && pt.lat <= HATIKVA_BBOX.maxLat &&
              pt.lon >= HATIKVA_BBOX.minLon && pt.lon <= HATIKVA_BBOX.maxLon) score++;
        }
        if (score > bestScore) { bestScore = score; bestShape = shapeId; bestRouteId = rt.routeId; }
      }
    }

    if (!bestShape || !shapePoints[bestShape]) {
      console.log(`  WARNING: No shape for line ${lineNumber}`); continue;
    }

    const pts = shapePoints[bestShape];
    const coords = pts
      .filter(pt => pt.lat >= EXTENDED_BBOX.minLat && pt.lat <= EXTENDED_BBOX.maxLat &&
                    pt.lon >= EXTENDED_BBOX.minLon && pt.lon <= EXTENDED_BBOX.maxLon)
      .map(pt => [Math.round(pt.lat * 1000000) / 1000000, Math.round(pt.lon * 1000000) / 1000000]);

    routesData[lineNumber] = coords;

    const bestRoute = lineRts.find(r => r.routeId === bestRouteId) || lineRts[0];
    routesMeta[lineNumber] = {
      name: bestRoute.longName, shortName: bestRoute.shortName,
      color: bestRoute.color || '', routeId: bestRoute.routeId
    };

    const tripId = routeTrips[bestRouteId];
    const stopSeq = tripStopSequence[tripId] || [];
    const stops = stopSeq
      .map(s => stopDetails[s.stopId])
      .filter(s => s && !isNaN(s.lat) && !isNaN(s.lon))
      .filter(s => s.lat >= EXTENDED_BBOX.minLat && s.lat <= EXTENDED_BBOX.maxLat &&
                   s.lon >= EXTENDED_BBOX.minLon && s.lon <= EXTENDED_BBOX.maxLon)
      .map(s => ({ id: s.id, name: s.name, lat: Math.round(s.lat * 1000000) / 1000000, lon: Math.round(s.lon * 1000000) / 1000000 }));

    routesStops[lineNumber] = stops;
    console.log(`  Line ${lineNumber}: ${coords.length} pts, ${stops.length} stops, "${bestRoute.longName}"`);
  }

  const output = `// TRANSIT IQ — GTFS-Sourced Bus Routes Dataset
// Generated from Israel MOT GTFS data (${new Date().toISOString().split('T')[0]})
// Source: https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip

// Route polyline coordinates [lat, lon]
const ROUTES_DATA = ${JSON.stringify(routesData, null, 2)};

// Route metadata
const ROUTES_META = ${JSON.stringify(routesMeta, null, 2)};

// Stops along each route [{id, name, lat, lon}]
const ROUTES_STOPS = ${JSON.stringify(routesStops, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  console.log(`\nOutput: ${OUTPUT_PATH} (${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB)`);
  console.log('=== Done! ===');
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
