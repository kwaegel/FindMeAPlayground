// Overpass API park search service.
// Fetches parks and playgrounds within a radius from the Overpass public API
// and parses results into ParkResult objects with Haversine distances.

import { haversineDistance } from '../utils/haversine.js';
import { detectAmenities } from '../config/amenities.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Build an Overpass QL query that fetches all leisure=park and
 * leisure=playground elements within a radius of a coordinate.
 * Uses `out center tags` so ways/relations include centroid coordinates.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusMeters
 * @returns {string} Overpass QL query string.
 */
function buildQuery(lat, lon, radiusMeters) {
  const around = `(around:${radiusMeters},${lat},${lon})`;
  return `
[out:json][timeout:30];
(
  node["leisure"="park"]${around};
  way["leisure"="park"]${around};
  relation["leisure"="park"]${around};
  node["leisure"="playground"]${around};
  way["leisure"="playground"]${around};
);
out center tags;
  `.trim();
}

/**
 * Parse a single Overpass element into a ParkResult.
 *
 * @param {object} element - Raw Overpass API element.
 * @param {number} originLat
 * @param {number} originLon
 * @returns {ParkResult}
 */
function parseElement(element, originLat, originLon) {
  const { type, id, tags = {} } = element;

  // Ways and relations use centroid coordinates; nodes have lat/lon directly.
  const lat = element.center ? element.center.lat : element.lat;
  const lon = element.center ? element.center.lon : element.lon;

  return {
    id: `${type}/${id}`,
    name: tags.name ?? 'Unnamed Park',
    lat,
    lon,
    amenities: detectAmenities(tags),
    distanceMiles: haversineDistance(originLat, originLon, lat, lon),
    travelTimeSeconds: null,
    osmTags: tags,
  };
}

/**
 * Search for parks and playgrounds near a geographic point using Overpass.
 *
 * @param {number} lat - Search origin latitude.
 * @param {number} lon - Search origin longitude.
 * @param {number} radiusMeters - Search radius in meters.
 * @returns {Promise<ParkResult[]>} Results sorted by ascending distance.
 * @throws {Error} "Search failed, please try again." on HTTP error.
 * @throws {Error} "Park search service unavailable." on network failure.
 */
export async function searchParks(lat, lon, radiusMeters) {
  const query = buildQuery(lat, lon, radiusMeters);

  let data;
  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    data = await response.json();
  } catch (err) {
    if (err.message.startsWith('HTTP ')) {
      throw new Error('Search failed, please try again.');
    }
    throw new Error('Park search service unavailable.');
  }

  const results = (data.elements ?? []).map((el) => parseElement(el, lat, lon));

  // Sort ascending by straight-line distance from origin.
  results.sort((a, b) => a.distanceMiles - b.distanceMiles);

  return results;
}
