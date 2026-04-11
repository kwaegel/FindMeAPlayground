// Tests for the travelTime client service.
// Mocks fetch so no real proxy is called.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/stores/searchStore.js', () => ({
  mergeTravelTimes: vi.fn(),
  // getTravelTimes captures this at call time and passes it through to
  // mergeTravelTimes so stale batches can be discarded. Return a fixed value
  // so assertions can verify the ID is forwarded correctly.
  getSearchId: vi.fn(() => 1),
}));

import { getTravelTimes } from '../../src/services/travelTime.js';
import { mergeTravelTimes } from '../../src/stores/searchStore.js';

// --- Fixtures ---

const ORIGIN = { lat: 38.895, lon: -77.036 };

function makePark(id, lat, lon) {
  return { id, lat, lon, name: id, amenities: [], distanceMiles: 1, travelTimeSeconds: null, osmTags: {} };
}

function mockFetch(times, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ times }),
  });
}

describe('getTravelTimes()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to /api/travel-times with correct body', async () => {
    const parks = [makePark('way/1', 38.9, -77.04)];
    const fetchSpy = mockFetch([300]);

    await getTravelTimes(ORIGIN, parks);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/travel-times',
      expect.objectContaining({ method: 'POST' })
    );

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(callBody.origin).toEqual([ORIGIN.lon, ORIGIN.lat]);
    expect(callBody.destinations).toEqual([[-77.04, 38.9]]);
  });

  it('calls mergeTravelTimes with a Map of parkId → seconds', async () => {
    const parks = [makePark('way/1', 38.9, -77.04), makePark('way/2', 38.88, -77.02)];
    mockFetch([300, 600]);

    await getTravelTimes(ORIGIN, parks);

    // Second argument is the search-generation ID forwarded from getSearchId().
    expect(mergeTravelTimes).toHaveBeenCalledWith(
      new Map([['way/1', 300], ['way/2', 600]]),
      1
    );
  });

  it('omits null travel times from the merged map', async () => {
    const parks = [makePark('way/1', 38.9, -77.04), makePark('way/2', 38.88, -77.02)];
    mockFetch([300, null]);

    await getTravelTimes(ORIGIN, parks);

    const mergedMap = mergeTravelTimes.mock.calls[0][0];
    expect(mergedMap.has('way/2')).toBe(false);
    expect(mergedMap.get('way/1')).toBe(300);
  });

  it('batches requests when parks.length > 50', async () => {
    // 51 parks → 2 batches (50 + 1). Each batch gets its own response so we
    // can verify the second batch's single result is mapped correctly and not
    // silently overwritten by the first batch's 50-element response.
    const parks = Array.from({ length: 51 }, (_, i) => makePark(`way/${i}`, 38.9 + i * 0.001, -77.0));
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ times: Array(50).fill(300) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ times: [600] }),
      });

    await getTravelTimes(ORIGIN, parks);

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    // The 51st park (way/50) should get the 600s value from the second batch.
    const mergedMap = mergeTravelTimes.mock.calls.reduce((acc, [map]) => {
      for (const [k, v] of map) acc.set(k, v);
      return acc;
    }, new Map());
    expect(mergedMap.get('way/50')).toBe(600);
    expect(mergedMap.get('way/0')).toBe(300);
  });

  it('does not throw on HTTP error — silently skips', async () => {
    const parks = [makePark('way/1', 38.9, -77.04)];
    mockFetch([], 500);

    // A non-2xx response should be handled gracefully, not throw.
    await expect(getTravelTimes(ORIGIN, parks)).resolves.toBeUndefined();
    // No travel times should be merged for a failed request.
    expect(mergeTravelTimes).not.toHaveBeenCalled();
  });

  it('does not throw on fetch failure — silently skips', async () => {
    const parks = [makePark('way/1', 38.9, -77.04)];
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    // Should not throw
    await expect(getTravelTimes(ORIGIN, parks)).resolves.toBeUndefined();
  });
});
