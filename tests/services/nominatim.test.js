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

// A distinct second fixture used in the rate-limit test to confirm that the
// second call resolves with its own result and not a stale reference from the
// first call. Using a different displayName makes a stale-reference bug fail.
const VALID_RESPONSE_2 = [
  {
    lat: '38.9686',
    lon: '-77.3411',
    display_name: 'Reston, Fairfax County, Virginia, United States',
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
    vi.useFakeTimers();
    // Pin the fake clock to a time > RATE_LIMIT_MS (1000ms) past epoch so
    // the very first geocode() call in each test sees elapsed >> limit and
    // fires immediately (takes the else branch, no sleep). Must be called
    // after vi.useFakeTimers() — setSystemTime only affects the fake clock.
    vi.setSystemTime(2000);
    // Reset the rate-limit cursor after pinning time. With lastRequestTime=0
    // and Date.now()=2000, elapsed=2000 >= 1000 for the first call per test,
    // giving us deterministic immediate execution.
    _resetRateLimit();
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

  it('uses format=jsonv2 and limit=1 in the request URL', async () => {
    // Nominatim response shape differs between format=json and format=jsonv2;
    // regressing this would silently break coordinate parsing.
    const fetchSpy = mockFetch(VALID_RESPONSE);

    await geocode('Arlington, VA');

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('format=jsonv2');
    expect(calledUrl).toContain('limit=1');
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
    // Use a distinct response fixture so that a stale-reference bug (p2 resolving
    // with p1's result) causes this test to fail rather than pass vacuously.
    const fetchSpy2 = mockFetch(VALID_RESPONSE_2);
    const p2 = geocode('Reston, VA');
    await vi.advanceTimersByTimeAsync(500);

    // The second fetch hasn't been called yet — still in cooldown.
    expect(fetchSpy2).toHaveBeenCalledTimes(0);

    // Advance past the 1-second mark — now it should fire.
    await vi.advanceTimersByTimeAsync(600);
    const result2 = await p2;

    expect(fetchSpy2).toHaveBeenCalledTimes(1);
    // Verify p2 resolves with its own result, not a stale reference from p1.
    expect(result2.displayName).toBe('Reston, Fairfax County, Virginia, United States');
    fetchSpy2.mockRestore();
  });
});
