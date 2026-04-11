// Travel time client service.
// Calls the /api/travel-times Cloudflare Worker proxy (which holds the ORS key)
// and merges the returned times into the search store reactively.
//
// Travel times are a UX enhancement — failures are silently swallowed so
// the UI always displays results even if ORS is unavailable.

import { mergeTravelTimes, getSearchId } from '../stores/searchStore.js';

const PROXY_URL = '/api/travel-times';

// ORS matrix endpoint accepts max 50 destinations per request.
const BATCH_SIZE = 50;

/**
 * Fetch travel times from the proxy for a set of parks and merge into the store.
 * Batches requests if parks.length > 50. Null times (unreachable) are omitted.
 *
 * @param {{ lat: number, lon: number }} origin - Search origin.
 * @param {ParkResult[]} parks - Parks to fetch travel times for.
 * @returns {Promise<void>}
 */
export async function getTravelTimes(origin, parks) {
  if (parks.length === 0) return;

  // Capture the search generation ID before any awaits. If the user triggers
  // a new search while batches are in-flight, the batches will see a stale ID
  // and skip the mergeTravelTimes call, preventing old results from polluting
  // the new search's travel-time map.
  const searchId = getSearchId();

  // Split parks into batches to stay within the ORS 50-destination limit.
  // All batches are fired in parallel so results arrive as quickly as possible.
  // fetchBatch is individually error-tolerant, so one batch failure does not
  // cancel the others.
  const batches = [];
  for (let i = 0; i < parks.length; i += BATCH_SIZE) {
    batches.push(parks.slice(i, i + BATCH_SIZE));
  }
  await Promise.all(batches.map((batch) => fetchBatch(origin, batch, searchId)));
}

/**
 * Fetch travel times for a single batch of parks (max 50).
 *
 * @param {{ lat: number, lon: number }} origin
 * @param {ParkResult[]} batch
 * @param {number} searchId - Generation ID captured when the search started.
 */
async function fetchBatch(origin, batch, searchId) {
  // ORS uses [longitude, latitude] order (GeoJSON convention).
  const body = {
    origin: [origin.lon, origin.lat],
    destinations: batch.map((p) => [p.lon, p.lat]),
  };

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) return;

    const data = await response.json();
    const times = data.times ?? [];

    // Build a map of parkId → seconds, skipping null entries (unreachable).
    const timesMap = new Map();
    for (let i = 0; i < batch.length; i++) {
      if (times[i] !== null && times[i] !== undefined) {
        timesMap.set(batch[i].id, times[i]);
      }
    }

    if (timesMap.size > 0) {
      mergeTravelTimes(timesMap, searchId);
    }
  } catch {
    // Travel time failures are non-fatal — UI handles null travel times gracefully.
  }
}
