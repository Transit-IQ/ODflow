#!/usr/bin/env node
/**
 * GTFS Data Processor for Transit IQ
 * 
 * Downloads Israel MOT GTFS data and extracts bus route shapes
 * and stop coordinates for the HaTikva neighborhood.
 * 
 * Output: js/routes.js with ROUTES_DATA and ROUTES_META
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const readline = require('readline');

// ---- Configuration ----
const GTFS_URL = 'https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip';
const DOWNLOAD_DIR = path.join(__dirname, 'gtfs_data');
const ZIP_PATH = path.join(DOWNLOAD_DIR, 'israel-public-transportation.zip');
const EXTRACT_DIR = path.join(DOWNLOAD_DIR, 'extracted');
const OUTPUT_PATH = path.join(__dirname, '..', 'js', 'routes.js');

// HaTikva neighborhood bounding box (extended for routes that pass through)
const HATIKVA_BBOX = {
  minLat: 32.044,
  maxLat: 32.058,
  minLon: 34.785,
  maxLon: 34.802
};

// Extended bounding box for route shapes (routes extend beyond the neighborhood)
const EXTENDED_BBOX = {
  minLat: 32.02,
  maxLat: 32.12,
  minLon: 34.74,
  maxLon: 34.85
};

// Target bus line short names operating in HaTikva
const TARGET_LINES = ['2', '4', '7', '13', '16'];

// Dan agency name patterns
const DAN_PATTERNS = ['דן', 'Dan', 'dan'];

// ---- Utilities ----

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log(`Destination: ${dest}`);
    
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`Redirecting to: ${response.headers.location}`);
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status: ${response.statusCode}`));
        return;
      }
      
      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      let lastPercent = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes) {
          const percent = Math.floor((downloadedBytes / totalBytes) * 100);
          if (percent >= lastPercent + 10) {
            console.log(`  Progress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)`);
            lastPercent = percent;
          }
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Download complete: ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB`);
        resolve();
      });
    });
    
    request.on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
    
    request.setTimeout(120000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Stream-parse a CSV file line by line, calling the callback for each row
 */
async function parseCSV(filePath, callback) {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  
  let headers = null;
  let lineNum = 0;
  
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) {
      // Remove BOM if present
      const cleanLine = line.replace(/^\uFEFF/, '');
      headers = parseCSVLine(cleanLine);
      continue;
    }
    
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    
    const result = callback(row);
    if (result === false) break; // Allow early termination
  }
  
  return lineNum - 1;
}

// ---- Main Processing ----

async function extractZip() {
  console.log('\nExtracting ZIP file...');
  ensureDir(EXTRACT_DIR);
  
  // Use the unzip command available on macOS
  const { execSync } = require('child_process');
  
  // Only extract the files we need
  const neededFiles = [
    'agency.txt', 'routes.txt', 'trips.txt', 
    'shapes.txt', 'stops.txt', 'stop_times.txt'
  ];
  
  try {
    execSync(
      `unzip -o -j "${ZIP_PATH}" ${neededFiles.join(' ')} -d "${EXTRACT_DIR}"`,
      { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 }
    );
    console.log('Extraction complete.');
  } catch (err) {
    // unzip might warn about some files but still work
    console.log('Extraction completed (with warnings).');
  }
  
  // Verify files exist
  for (const f of neededFiles) {
    const p = path.join(EXTRACT_DIR, f);
    if (!fs.existsSync(p)) {
      throw new Error(`Required file not found after extraction: ${f}`);
    }
    const stat = fs.statSync(p);
    console.log(`  ${f}: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  }
}

async function findDanAgency() {
  console.log('\nFinding Dan agency...');
  const agencies = [];
  
  await parseCSV(path.join(EXTRACT_DIR, 'agency.txt'), (row) => {
    agencies.push({
      id: row.agency_id,
      name: row.agency_name,
      url: row.agency_url
    });
  });
  
  console.log(`  Found ${agencies.length} agencies total`);
  
  // Find Dan
  const dan = agencies.find(a => 
    DAN_PATTERNS.some(p => a.name && a.name.includes(p))
  );
  
  if (dan) {
    console.log(`  Dan agency found: ID=${dan.id}, Name="${dan.name}"`);
    return dan.id;
  }
  
  // If not found by name, list all and let user see
  console.log('  All agencies:');
  agencies.forEach(a => console.log(`    ID=${a.id}, Name="${a.name}"`));
  
  // Try common Dan agency IDs for Israel
  const knownDanIds = ['5', '3'];
  for (const id of knownDanIds) {
    if (agencies.find(a => a.id === id)) {
      console.log(`  Using known Dan agency ID: ${id}`);
      return id;
    }
  }
  
  throw new Error('Could not identify Dan agency');
}

async function findRoutes(danAgencyId) {
  console.log('\nFinding target routes...');
  const routes = [];
  
  await parseCSV(path.join(EXTRACT_DIR, 'routes.txt'), (row) => {
    if (row.agency_id === danAgencyId && TARGET_LINES.includes(row.route_short_name)) {
      routes.push({
        routeId: row.route_id,
        shortName: row.route_short_name,
        longName: row.route_long_name || '',
        color: row.route_color || '',
        textColor: row.route_text_color || '',
        type: row.route_type || '3'
      });
    }
  });
  
  console.log(`  Found ${routes.length} matching routes:`);
  
  // Group by line number for display
  const byLine = {};
  routes.forEach(r => {
    if (!byLine[r.shortName]) byLine[r.shortName] = [];
    byLine[r.shortName].push(r);
  });
  
  for (const [line, rts] of Object.entries(byLine)) {
    console.log(`  Line ${line}: ${rts.length} route variants`);
    rts.slice(0, 2).forEach(r => {
      console.log(`    route_id=${r.routeId}, "${r.longName}"`);
    });
  }
  
  return routes;
}

async function findShapeIds(routes) {
  console.log('\nFinding shape IDs from trips...');
  const routeIds = new Set(routes.map(r => r.routeId));
  const shapeMap = {}; // routeId -> Set of shapeIds
  const tripRouteMap = {}; // tripId -> routeId (for later stop_times lookup)
  const tripShapeMap = {}; // tripId -> shapeId
  
  await parseCSV(path.join(EXTRACT_DIR, 'trips.txt'), (row) => {
    if (routeIds.has(row.route_id) && row.shape_id) {
      if (!shapeMap[row.route_id]) shapeMap[row.route_id] = new Set();
      shapeMap[row.route_id].add(row.shape_id);
      tripRouteMap[row.trip_id] = row.route_id;
      tripShapeMap[row.trip_id] = row.shape_id;
    }
  });
  
  console.log('  Shape IDs per route:');
  for (const [routeId, shapes] of Object.entries(shapeMap)) {
    const route = routes.find(r => r.routeId === routeId);
    console.log(`    Route ${route?.shortName} (${routeId}): ${shapes.size} shapes`);
  }
  
  return { shapeMap, tripRouteMap, tripShapeMap };
}

async function loadShapes(shapeMap) {
  console.log('\nLoading shape coordinates...');
  
  // Collect all shape IDs we need
  const allShapeIds = new Set();
  for (const shapes of Object.values(shapeMap)) {
    for (const s of shapes) allShapeIds.add(s);
  }
  console.log(`  Need ${allShapeIds.size} unique shapes`);
  
  // Parse shapes.txt (this is the largest file)
  const shapePoints = {}; // shapeId -> [{lat, lon, seq}]
  let totalPoints = 0;
  
  await parseCSV(path.join(EXTRACT_DIR, 'shapes.txt'), (row) => {
    if (allShapeIds.has(row.shape_id)) {
      if (!shapePoints[row.shape_id]) shapePoints[row.shape_id] = [];
      shapePoints[row.shape_id].push({
        lat: parseFloat(row.shape_pt_lat),
        lon: parseFloat(row.shape_pt_lon),
        seq: parseInt(row.shape_pt_sequence, 10)
      });
      totalPoints++;
    }
  });
  
  // Sort points by sequence
  for (const [id, pts] of Object.entries(shapePoints)) {
    pts.sort((a, b) => a.seq - b.seq);
  }
  
  console.log(`  Loaded ${totalPoints} shape points across ${Object.keys(shapePoints).length} shapes`);
  
  return shapePoints;
}

async function loadStopsForRoutes(tripRouteMap, routes) {
  console.log('\nLoading stops for routes...');
  
  // First pass: find stop IDs for each route from stop_times.txt
  const routeStopIds = {}; // routeId -> Set of stopIds
  const tripIds = new Set(Object.keys(tripRouteMap));
  
  // We only need one trip per route to get stops
  const routeTrips = {}; // routeId -> first tripId
  for (const [tripId, routeId] of Object.entries(tripRouteMap)) {
    if (!routeTrips[routeId]) routeTrips[routeId] = tripId;
  }
  
  const targetTripIds = new Set(Object.values(routeTrips));
  const tripStopSequence = {}; // tripId -> [{stopId, seq}]
  
  await parseCSV(path.join(EXTRACT_DIR, 'stop_times.txt'), (row) => {
    if (targetTripIds.has(row.trip_id)) {
      const routeId = tripRouteMap[row.trip_id];
      if (!routeStopIds[routeId]) routeStopIds[routeId] = new Set();
      routeStopIds[routeId].add(row.stop_id);
      
      if (!tripStopSequence[row.trip_id]) tripStopSequence[row.trip_id] = [];
      tripStopSequence[row.trip_id].push({
        stopId: row.stop_id,
        seq: parseInt(row.stop_sequence, 10)
      });
    }
  });
  
  // Sort stops by sequence for each trip
  for (const stops of Object.values(tripStopSequence)) {
    stops.sort((a, b) => a.seq - b.seq);
  }
  
  // Collect all stop IDs we need
  const allStopIds = new Set();
  for (const stops of Object.values(routeStopIds)) {
    for (const s of stops) allStopIds.add(s);
  }
  console.log(`  Need ${allStopIds.size} unique stops`);
  
  // Load stop details from stops.txt
  const stopDetails = {}; // stopId -> {name, lat, lon}
  
  await parseCSV(path.join(EXTRACT_DIR, 'stops.txt'), (row) => {
    if (allStopIds.has(row.stop_id)) {
      stopDetails[row.stop_id] = {
        id: row.stop_id,
        name: row.stop_name || '',
        lat: parseFloat(row.stop_lat),
        lon: parseFloat(row.stop_lon),
        code: row.stop_code || ''
      };
    }
  });
  
  console.log(`  Loaded ${Object.keys(stopDetails).length} stop details`);
  
  return { routeStopIds, stopDetails, routeTrips, tripStopSequence };
}

function selectBestShape(routeId, shapeIds, shapePoints) {
  // For each route, pick the shape that has the most points within the HaTikva bbox
  // This helps us pick the variant that actually passes through the neighborhood
  let bestShape = null;
  let bestScore = -1;
  
  for (const shapeId of shapeIds) {
    const pts = shapePoints[shapeId];
    if (!pts || pts.length === 0) continue;
    
    let score = 0;
    for (const pt of pts) {
      if (pt.lat >= HATIKVA_BBOX.minLat && pt.lat <= HATIKVA_BBOX.maxLat &&
          pt.lon >= HATIKVA_BBOX.minLon && pt.lon <= HATIKVA_BBOX.maxLon) {
        score++;
      }
    }
    
    // Prefer shapes that pass through HaTikva AND have reasonable length
    if (score > bestScore || (score === bestScore && pts.length > (shapePoints[bestShape]?.length || 0))) {
      bestScore = score;
      bestShape = shapeId;
    }
  }
  
  return bestShape;
}

function generateOutput(routes, shapeMap, shapePoints, routeStopIds, stopDetails, routeTrips, tripStopSequence) {
  console.log('\nGenerating output...');
  
  // Group routes by line number
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
    if (!lineRts || lineRts.length === 0) {
      console.log(`  WARNING: No routes found for line ${lineNumber}`);
      continue;
    }
    
    // Find the best shape across all route variants for this line
    let bestShape = null;
    let bestRouteId = null;
    let bestScore = -1;
    
    for (const rt of lineRts) {
      const shapes = shapeMap[rt.routeId];
      if (!shapes) continue;
      
      for (const shapeId of shapes) {
        const pts = shapePoints[shapeId];
        if (!pts) continue;
        
        let score = 0;
        for (const pt of pts) {
          if (pt.lat >= HATIKVA_BBOX.minLat && pt.lat <= HATIKVA_BBOX.maxLat &&
              pt.lon >= HATIKVA_BBOX.minLon && pt.lon <= HATIKVA_BBOX.maxLon) {
            score++;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestShape = shapeId;
          bestRouteId = rt.routeId;
        }
      }
    }
    
    if (!bestShape || !shapePoints[bestShape]) {
      console.log(`  WARNING: No valid shape for line ${lineNumber}`);
      continue;
    }
    
    const pts = shapePoints[bestShape];
    
    // Convert to [lat, lon] array, trimming to extended bbox
    const coords = pts
      .filter(pt => 
        pt.lat >= EXTENDED_BBOX.minLat && pt.lat <= EXTENDED_BBOX.maxLat &&
        pt.lon >= EXTENDED_BBOX.minLon && pt.lon <= EXTENDED_BBOX.maxLon
      )
      .map(pt => [
        Math.round(pt.lat * 1000000) / 1000000,
        Math.round(pt.lon * 1000000) / 1000000
      ]);
    
    routesData[lineNumber] = coords;
    
    // Metadata
    const bestRoute = lineRts.find(r => r.routeId === bestRouteId) || lineRts[0];
    routesMeta[lineNumber] = {
      name: bestRoute.longName,
      shortName: bestRoute.shortName,
      color: bestRoute.color || '',
      routeId: bestRoute.routeId
    };
    
    // Stops along this route
    const tripId = routeTrips[bestRouteId];
    const stopSeq = tripStopSequence[tripId] || [];
    const stops = stopSeq
      .map(s => stopDetails[s.stopId])
      .filter(s => s && !isNaN(s.lat) && !isNaN(s.lon))
      .filter(s => 
        s.lat >= EXTENDED_BBOX.minLat && s.lat <= EXTENDED_BBOX.maxLat &&
        s.lon >= EXTENDED_BBOX.minLon && s.lon <= EXTENDED_BBOX.maxLon
      )
      .map(s => ({
        id: s.id,
        name: s.name,
        lat: Math.round(s.lat * 1000000) / 1000000,
        lon: Math.round(s.lon * 1000000) / 1000000
      }));
    
    routesStops[lineNumber] = stops;
    
    console.log(`  Line ${lineNumber}: ${coords.length} shape points, ${stops.length} stops, "${bestRoute.longName}"`);
  }
  
  // Generate JavaScript output
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
  console.log(`\nOutput written to: ${OUTPUT_PATH}`);
  console.log(`  File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);
}

// ---- Entry Point ----

async function main() {
  console.log('=== GTFS Data Processor for Transit IQ ===\n');
  
  ensureDir(DOWNLOAD_DIR);
  
  // Step 1: Download GTFS ZIP
  if (fs.existsSync(ZIP_PATH)) {
    const stat = fs.statSync(ZIP_PATH);
    const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      console.log(`Using existing ZIP (${ageDays.toFixed(1)} days old, ${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
    } else {
      console.log('ZIP is older than 7 days, re-downloading...');
      await downloadFile(GTFS_URL, ZIP_PATH);
    }
  } else {
    await downloadFile(GTFS_URL, ZIP_PATH);
  }
  
  // Step 2: Extract needed files
  await extractZip();
  
  // Step 3: Find Dan agency
  const danAgencyId = await findDanAgency();
  
  // Step 4: Find target routes
  const routes = await findRoutes(danAgencyId);
  
  if (routes.length === 0) {
    // If no Dan routes found, try without agency filter
    console.log('\nNo Dan routes found. Trying all agencies...');
    const allRoutes = [];
    await parseCSV(path.join(EXTRACT_DIR, 'routes.txt'), (row) => {
      if (TARGET_LINES.includes(row.route_short_name)) {
        allRoutes.push({
          routeId: row.route_id,
          shortName: row.route_short_name,
          longName: row.route_long_name || '',
          color: row.route_color || '',
          textColor: row.route_text_color || '',
          type: row.route_type || '3',
          agencyId: row.agency_id
        });
      }
    });
    
    console.log(`  Found ${allRoutes.length} routes across all agencies for lines ${TARGET_LINES.join(', ')}`);
    
    // Group by line and show agency distribution
    const byLineAgency = {};
    allRoutes.forEach(r => {
      const key = `${r.shortName}:${r.agencyId}`;
      if (!byLineAgency[key]) byLineAgency[key] = { count: 0, sample: r };
      byLineAgency[key].count++;
    });
    
    for (const [key, info] of Object.entries(byLineAgency)) {
      console.log(`    ${key}: ${info.count} variants, "${info.sample.longName}"`);
    }
    
    // Use all matching routes
    routes.push(...allRoutes);
  }
  
  // Step 5: Find shape IDs
  const { shapeMap, tripRouteMap, tripShapeMap } = await findShapeIds(routes);
  
  // Step 6: Load shapes
  const shapePoints = await loadShapes(shapeMap);
  
  // Step 7: Load stops
  const { routeStopIds, stopDetails, routeTrips, tripStopSequence } = 
    await loadStopsForRoutes(tripRouteMap, routes);
  
  // Step 8: Generate output
  generateOutput(routes, shapeMap, shapePoints, routeStopIds, stopDetails, routeTrips, tripStopSequence);
  
  console.log('\n=== Done! ===');
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
