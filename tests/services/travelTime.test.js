// Tests for the travelTime client service.
// Mocks fetch so no real proxy is called.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/stores/searchStore.js', () => ({
  mergeTravelTimes: vi.fn(),
}));

import { getTravelTimes } from '../../src/services/travelTime.js';
import { mergeTravelTimes } from '../../src/stores/searchStore.js';

// --- Fixtures ---

const ORIGIN = { lat: 38.895, lon: -77.036 };

function makePark(id, lat, lon) {
  return { id, lat, lon, name: id, amenities: [], distanceMiles: 1, travelTimeSeconds: null, osmTags: {} };
}

function mockFetch(times, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
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
    mockFetch([300]);

    await getTravelTimes(ORIGIN, parks);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/travel-times',
      expect.objectContaining({ method: 'POST' })
    );

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.origin).toEqual([ORIGIN.lon, ORIGIN.lat]);
    expect(callBody.destinations).toEqual([[-77.04, 38.9]]);
  });

  it('calls mergeTravelTimes with a Map of parkId → seconds', async () => {
    const parks = [makePark('way/1', 38.9, -77.04), makePark('way/2', 38.88, -77.02)];
    mockFetch([300, 600]);

    await getTravelTimes(ORIGIN, parks);

    expect(mergeTravelTimes).toHaveBeenCalledWith(
      new Map([['way/1', 300], ['way/2', 600]])
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
    // 51 parks → 2 batches (50 + 1)
    const parks = Array.from({ length: 51 }, (_, i) => makePark(`way/${i}`, 38.9 + i * 0.001, -77.0));
    mockFetch(Array(50).fill(300));

    await getTravelTimes(ORIGIN, parks);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not throw on fetch failure — silently skips', async () => {
    const parks = [makePark('way/1', 38.9, -77.04)];
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    // Should not throw
    await expect(getTravelTimes(ORIGIN, parks)).resolves.toBeUndefined();
  });
});
