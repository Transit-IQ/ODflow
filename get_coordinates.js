/**
 * TRANSIT IQ — Google Maps Geocoding Script
 * 
 * Usage:
 *   1. Set your API Key in the .env file or your terminal:
 *      export GOOGLE_MAPS_API_KEY="AIzaSyYourKeyHere..."
 *   
 *   2. Run the script with an input JSON file containing station names:
 *      node get_coordinates.js input_stations.json
 */

const fs = require('fs');
const https = require('https');

// Load .env file manually if it exists to avoid external dependencies
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

// Retrieve API key from environment variable
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

/**
 * Fetch coordinates for a given query from Google Geocoding API
 * @param {string} station - The station name, ID, or address
 * @returns {Promise<{station: string, lat: number, lng: number, formatted_address: string}|null>}
 */
function getCoordinates(station) {
  return new Promise((resolve, reject) => {
    if (API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.error('Error: Please set the GOOGLE_MAPS_API_KEY environment variable.');
      console.error('Run: export GOOGLE_MAPS_API_KEY="AIzaSy..."');
      resolve(null);
      return;
    }

    // Bias search to Tel Aviv, Israel to ensure transit stations map accurately
    const biasedQuery = station.includes('תל אביב') || station.includes('Tel Aviv') 
      ? station 
      : `${station}, תל אביב, ישראל`;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(biasedQuery)}&key=${API_KEY}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results.length > 0) {
            const location = json.results[0].geometry.location;
            resolve({
              station: station,
              lat: location.lat,
              lng: location.lng,
              formatted_address: json.results[0].formatted_address
            });
          } else {
            console.error(`✗ Geocoding failed for "${station}":`, json.status, json.error_message || '');
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Main runner execution
async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Error: Input JSON file path is required.");
    console.error("Usage: node get_coordinates.js <path_to_json_file>");
    console.error("Example: node get_coordinates.js input_stations.json");
    process.exit(1);
  }

  const inputFilePath = args[0];
  if (!fs.existsSync(inputFilePath)) {
    console.error(`Error: File not found: ${inputFilePath}`);
    process.exit(1);
  }

  let stationsToQuery = [];
  try {
    const fileContent = fs.readFileSync(inputFilePath, 'utf8');
    const parsedData = JSON.parse(fileContent);
    
    if (Array.isArray(parsedData)) {
      stationsToQuery = parsedData;
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      if (Array.isArray(parsedData.stations)) {
        stationsToQuery = parsedData.stations;
      } else if (Array.isArray(parsedData.stops)) {
        stationsToQuery = parsedData.stops;
      } else {
        // Fallback to object keys
        stationsToQuery = Object.keys(parsedData);
      }
    } else {
      console.error("Error: JSON file must contain an array of station names or a standard stations key.");
      process.exit(1);
    }
  } catch (e) {
    console.error(`Error: Failed to parse input JSON file "${inputFilePath}":`, e.message);
    process.exit(1);
  }

  console.log(`Resolving ${stationsToQuery.length} stations using Google Maps...\n`);

  const results = [];
  for (const station of stationsToQuery) {
    try {
      const coords = await getCoordinates(station);
      if (coords) {
        console.log(`✓ Resolved: "${station}"`);
        console.log(`  Coordinates: [${coords.lat}, ${coords.lng}]`);
        console.log(`  Address: ${coords.formatted_address}\n`);
        results.push(coords);
      }
      // Small delay to respect rate limit guidelines
      await new Promise(r => setTimeout(r, 150));
    } catch (error) {
      console.error(`✗ Error geocoding "${station}":`, error.message);
    }
  }

  if (results.length > 0) {
    const outputFilename = 'resolved_coordinates.json';
    fs.writeFileSync(outputFilename, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} resolved records to: ${outputFilename}`);
  } else {
    console.log('No coordinates resolved.');
  }
}

run();
