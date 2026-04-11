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
  relation["leisure"="playground"]${around};
);
out center tags;
  `.trim();
}

/**
 * Parse a single Overpass element into a ParkResult.
 * Returns null for elements where coordinates cannot be resolved (e.g. a
 * relation element returned without a center property by Overpass).
 *
 * @param {object} element - Raw Overpass API element.
 * @param {number} originLat
 * @param {number} originLon
 * @returns {ParkResult | null}
 */
function parseElement(element, originLat, originLon) {
  const { type, id, tags = {} } = element;

  // Ways and relations use centroid coordinates; nodes have lat/lon directly.
  const lat = element.center ? element.center.lat : element.lat;
  const lon = element.center ? element.center.lon : element.lon;

  // Guard: skip elements where Overpass didn't provide resolvable coordinates.
  // Number.isFinite() is used deliberately — unlike the global isFinite(), it
  // does NOT coerce its argument. isFinite(null) returns true (null → 0) but
  // Number.isFinite(null) returns false. This correctly rejects null, undefined,
  // NaN, Infinity, and non-numeric strings without any type coercion surprises.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

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

  // Parse elements, filter out any that couldn't be resolved (null returns),
  // then deduplicate by id. An element can match both query arms (e.g. a node
  // tagged both leisure=park and leisure=playground) and appear twice.
  const seen = new Set();
  // Optional chaining guards against a null/primitive JSON body from a
  // misbehaving Overpass instance (valid JSON but not an object with .elements).
  const results = (data?.elements ?? [])
    .map((el) => parseElement(el, lat, lon))
    .filter((r) => {
      if (r === null) return false;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

  // Sort ascending by straight-line distance from origin.
  results.sort((a, b) => a.distanceMiles - b.distanceMiles);

  return results;
}
