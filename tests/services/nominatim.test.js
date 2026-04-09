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

/** Spy on globalThis.fetch and make it resolve with the given JSON body. */
function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

/** Spy on globalThis.fetch and make it reject with a network error. */
function mockFetchNetworkError() {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
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
    const fetchSpy = mockFetch(VALID_RESPONSE);

    const result = await geocode('Arlington, VA');

    expect(result.lat).toBeCloseTo(38.895);
    expect(result.lon).toBeCloseTo(-77.036);
    expect(result.displayName).toBe(
      'Arlington, Arlington County, Virginia, United States'
    );
    fetchSpy.mockRestore();
  });

  it('returns numeric lat and lon (not strings)', async () => {
    const fetchSpy = mockFetch(VALID_RESPONSE);

    const result = await geocode('Arlington, VA');

    expect(typeof result.lat).toBe('number');
    expect(typeof result.lon).toBe('number');
    fetchSpy.mockRestore();
  });

  it('includes countrycodes=us in the request URL', async () => {
    const fetchSpy = mockFetch(VALID_RESPONSE);

    await geocode('Arlington, VA');

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('countrycodes=us');
    fetchSpy.mockRestore();
  });

  it('throws "Address not found" when Nominatim returns an empty array', async () => {
    const fetchSpy = mockFetch([]);

    await expect(geocode('zzznotaplacexyz')).rejects.toThrow('Address not found');
    fetchSpy.mockRestore();
  });

  it('throws "Geocoding service unavailable" on network error', async () => {
    const fetchSpy = mockFetchNetworkError();

    await expect(geocode('Arlington, VA')).rejects.toThrow(
      'Geocoding service unavailable'
    );
    fetchSpy.mockRestore();
  });

  it('throws "Geocoding service unavailable" on non-200 HTTP response', async () => {
    const fetchSpy = mockFetch({}, 429);

    await expect(geocode('Arlington, VA')).rejects.toThrow(
      'Geocoding service unavailable'
    );
    fetchSpy.mockRestore();
  });

  it('does not send a second request within 1 second of the first', async () => {
    const fetchSpy1 = mockFetch(VALID_RESPONSE);

    // First call — should fire immediately.
    const p1 = geocode('Arlington, VA');
    await vi.runAllTimersAsync();
    await p1;

    expect(fetchSpy1).toHaveBeenCalledTimes(1);
    fetchSpy1.mockRestore();

    // Second call immediately after — should be held until the 1s window expires.
    // We only advance 500ms, so it should NOT have fired yet.
    const fetchSpy2 = mockFetch(VALID_RESPONSE);
    const p2 = geocode('Reston, VA');
    await vi.advanceTimersByTimeAsync(500);

    // The second fetch hasn't been called yet — still in cooldown.
    expect(fetchSpy2).toHaveBeenCalledTimes(0);

    // Advance past the 1-second mark — now it should fire.
    await vi.advanceTimersByTimeAsync(600);
    await p2;

    expect(fetchSpy2).toHaveBeenCalledTimes(1);
    fetchSpy2.mockRestore();
  });
});
