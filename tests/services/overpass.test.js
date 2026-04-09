// Tests for the Overpass API park search service.
// All network calls are mocked — no real API calls are made.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchParks } from '../../src/services/overpass.js';

// --- Fixtures ---

/** A minimal valid Overpass JSON response with one named park (way) and one unnamed node. */
const MOCK_RESPONSE = {
  elements: [
    {
      type: 'way',
      id: 12345,
      center: { lat: 38.9, lon: -77.04 },
      tags: { name: 'Oak Hill Park', leisure: 'park' },
    },
    {
      type: 'node',
      id: 67890,
      lat: 38.88,
      lon: -77.02,
      // No name tag — should get fallback "Unnamed Park"
      tags: { leisure: 'playground' },
    },
  ],
};

function mockFetch(body, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
}

// Search origin near the mock parks.
const ORIGIN_LAT = 38.895;
const ORIGIN_LON = -77.036;
const RADIUS_M = 8047; // ~5 miles

describe('searchParks()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an array of ParkResult objects with all required fields', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);

    const [first] = results;
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('lat');
    expect(first).toHaveProperty('lon');
    expect(first).toHaveProperty('amenities');
    expect(first).toHaveProperty('distanceMiles');
    expect(first).toHaveProperty('travelTimeSeconds');
    expect(first).toHaveProperty('osmTags');
  });

  it('uses centroid coordinates for way elements', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    // Oak Hill Park is a way — must use center.lat / center.lon
    const park = results.find((r) => r.name === 'Oak Hill Park');
    expect(park.lat).toBe(38.9);
    expect(park.lon).toBe(-77.04);
  });

  it('assigns "Unnamed Park" when name tag is absent', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    const unnamed = results.find((r) => r.id === 'node/67890');
    expect(unnamed.name).toBe('Unnamed Park');
  });

  it('formats id as "type/id"', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    expect(results.find((r) => r.name === 'Oak Hill Park').id).toBe('way/12345');
  });

  it('initializes travelTimeSeconds to null', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    expect(results.every((r) => r.travelTimeSeconds === null)).toBe(true);
  });

  it('calculates distanceMiles as a positive number for each result', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    expect(results.every((r) => typeof r.distanceMiles === 'number' && r.distanceMiles > 0)).toBe(
      true
    );
  });

  it('sorts results by ascending distance', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distanceMiles).toBeGreaterThanOrEqual(results[i - 1].distanceMiles);
    }
  });

  it('includes the playground amenity for elements tagged leisure=playground', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    const playground = results.find((r) => r.id === 'node/67890');
    expect(playground.amenities).toContain('playground');
  });

  it('includes the restroom amenity for elements tagged amenity=toilets', async () => {
    const response = {
      elements: [
        {
          type: 'node',
          id: 1,
          lat: 38.89,
          lon: -77.03,
          tags: { leisure: 'park', name: 'Test Park', 'amenity': 'toilets' },
        },
      ],
    };
    global.fetch = mockFetch(response);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    expect(results[0].amenities).toContain('restroom');
  });

  it('preserves raw OSM tags in osmTags field', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    const results = await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);
    const park = results.find((r) => r.name === 'Oak Hill Park');
    expect(park.osmTags).toEqual({ name: 'Oak Hill Park', leisure: 'park' });
  });

  it('uses Overpass API with POST method', async () => {
    global.fetch = mockFetch(MOCK_RESPONSE);

    await searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('overpass'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws "Search failed, please try again." on HTTP error', async () => {
    global.fetch = mockFetch({}, 429);

    await expect(searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M)).rejects.toThrow(
      'Search failed, please try again.'
    );
  });

  it('throws "Park search service unavailable." on network error', async () => {
    global.fetch = mockFetchNetworkError();

    await expect(searchParks(ORIGIN_LAT, ORIGIN_LON, RADIUS_M)).rejects.toThrow(
      'Park search service unavailable.'
    );
  });
});
