// Tests for the Nominatim geocoding service.
// All network calls are mocked — no real API calls are made.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geocode, _resetRateLimit } from '../../src/services/nominatim.js';

// --- Fixtures ---

const VALID_RESPONSE = [
  {
    lat: '38.8950368',
    lon: '-77.0365427',
    display_name: 'Arlington, Arlington County, Virginia, United States',
  },
];

// --- Helpers ---

/** Build a mock fetch that resolves with the given JSON body. */
function mockFetch(body, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

/** Build a mock fetch that rejects with a network error. */
function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
}

describe('geocode()', () => {
  beforeEach(() => {
    // Reset the rate-limit cooldown before each test so tests are independent.
    _resetRateLimit();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns { lat, lon, displayName } for a valid address', async () => {
    global.fetch = mockFetch(VALID_RESPONSE);

    const result = await geocode('Arlington, VA');

    expect(result.lat).toBeCloseTo(38.895);
    expect(result.lon).toBeCloseTo(-77.036);
    expect(result.displayName).toBe(
      'Arlington, Arlington County, Virginia, United States'
    );
  });

  it('returns numeric lat and lon (not strings)', async () => {
    global.fetch = mockFetch(VALID_RESPONSE);

    const result = await geocode('Arlington, VA');

    expect(typeof result.lat).toBe('number');
    expect(typeof result.lon).toBe('number');
  });

  it('includes countrycodes=us in the request URL', async () => {
    global.fetch = mockFetch(VALID_RESPONSE);

    await geocode('Arlington, VA');

    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('countrycodes=us');
  });

  it('throws "Address not found" when Nominatim returns an empty array', async () => {
    global.fetch = mockFetch([]);

    await expect(geocode('zzznotaplacexyz')).rejects.toThrow('Address not found');
  });

  it('throws "Geocoding service unavailable" on network error', async () => {
    global.fetch = mockFetchNetworkError();

    await expect(geocode('Arlington, VA')).rejects.toThrow(
      'Geocoding service unavailable'
    );
  });

  it('does not send a second request within 1 second of the first', async () => {
    global.fetch = mockFetch(VALID_RESPONSE);

    // First call — should fire immediately.
    const p1 = geocode('Arlington, VA');
    await vi.runAllTimersAsync();
    await p1;

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call immediately after — should be held until the 1s window expires.
    // We only advance 500ms, so it should NOT have fired yet.
    global.fetch = mockFetch(VALID_RESPONSE);
    const p2 = geocode('Reston, VA');
    await vi.advanceTimersByTimeAsync(500);

    // The second fetch hasn't been called yet — still in cooldown.
    expect(global.fetch).toHaveBeenCalledTimes(0);

    // Advance past the 1-second mark — now it should fire.
    await vi.advanceTimersByTimeAsync(600);
    await p2;

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
