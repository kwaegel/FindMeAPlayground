// Nominatim geocoding service.
// Converts an address string to {lat, lon, displayName} using the public
// Nominatim API. Enforces the 1 request/second rate limit required by the
// Nominatim usage policy.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

// Minimum milliseconds between Nominatim requests (usage policy: 1 req/sec).
const RATE_LIMIT_MS = 1000;

// Timestamp of the last request sent. Used to enforce the cooldown.
let lastRequestTime = 0;

/**
 * Reset the rate-limit state. Exported for test isolation only — do not call
 * in production code.
 */
export function _resetRateLimit() {
  lastRequestTime = 0;
}

/**
 * Wait until the rate-limit cooldown has elapsed since the last request.
 * Updates `lastRequestTime` to the moment the next request is allowed.
 *
 * @returns {Promise<void>}
 */
async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Geocode a US address using Nominatim.
 *
 * @param {string} query - The address string to look up.
 * @returns {Promise<{lat: number, lon: number, displayName: string}>}
 * @throws {Error} "Address not found" if Nominatim returns no results.
 * @throws {Error} "Geocoding service unavailable" on network failure.
 */
export async function geocode(query) {
  // Respect the 1 req/sec rate limit before making the request.
  await waitForRateLimit();

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'us');
  url.searchParams.set('limit', '1');

  let data;
  try {
    const response = await fetch(url.toString());
    data = await response.json();
  } catch {
    throw new Error('Geocoding service unavailable');
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Address not found');
  }

  const [result] = data;
  return {
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
    displayName: result.display_name,
  };
}
