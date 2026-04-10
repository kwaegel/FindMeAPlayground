// Tests for the central search store.
// searchParks is mocked so store tests don't depend on real network calls.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock overpass before importing the store, so the store picks up the mock.
vi.mock('../../src/services/overpass.js', () => ({
  searchParks: vi.fn(),
}));

import { searchParks } from '../../src/services/overpass.js';
import {
  searchStore,
  setOrigin,
  setRadius,
  setFilters,
  incrementVisibleCount,
  selectPark,
  clearSelectedPark,
  mergeTravelTimes,
  getFilteredResults,
  _resetStore,
} from '../../src/stores/searchStore.js';

// --- Fixtures ---

const ORIGIN = { lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' };

const PARKS = [
  { id: 'way/1', name: 'Park A', lat: 38.9, lon: -77.04, amenities: ['playground'], distanceMiles: 0.5, travelTimeSeconds: null, osmTags: {} },
  { id: 'way/2', name: 'Park B', lat: 38.88, lon: -77.02, amenities: ['restroom'], distanceMiles: 1.2, travelTimeSeconds: null, osmTags: {} },
  { id: 'way/3', name: 'Park C', lat: 38.87, lon: -77.01, amenities: ['playground', 'restroom'], distanceMiles: 2.0, travelTimeSeconds: null, osmTags: {} },
];

describe('searchStore', () => {
  beforeEach(() => {
    _resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Initial state ---

  it('has correct default state', () => {
    const state = get(searchStore);
    expect(state.origin).toBeNull();
    expect(state.radiusMiles).toBe(5);
    expect(state.selectedAmenities).toEqual([]);
    expect(state.allResults).toEqual([]);
    expect(state.visibleCount).toBe(20);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedPark).toBeNull();
    // travelTimes must be a Map (not {}) so .get() is safe without guards.
    expect(state.travelTimes).toBeInstanceOf(Map);
    expect(state.travelTimes.size).toBe(0);
  });

  // --- setOrigin ---

  it('setOrigin triggers searchParks with radius in meters', async () => {
    searchParks.mockResolvedValue(PARKS);

    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    expect(searchParks).toHaveBeenCalledWith(
      ORIGIN.lat,
      ORIGIN.lon,
      5 * 1609.34 // 5 miles in meters
    );
  });

  it('setOrigin sets loading=true during fetch and false after', async () => {
    let resolveSearch;
    searchParks.mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve; })
    );

    const promise = setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);
    expect(get(searchStore).loading).toBe(true);

    resolveSearch(PARKS);
    await promise;
    expect(get(searchStore).loading).toBe(false);
  });

  it('setOrigin populates allResults on success', async () => {
    searchParks.mockResolvedValue(PARKS);

    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    expect(get(searchStore).allResults).toEqual(PARKS);
  });

  it('setOrigin sets error on searchParks failure', async () => {
    searchParks.mockRejectedValue(new Error('Search failed, please try again.'));

    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    const state = get(searchStore);
    expect(state.error).toBe('Search failed, please try again.');
    expect(state.loading).toBe(false);
  });

  it('setOrigin resets error on success', async () => {
    searchParks.mockRejectedValue(new Error('oops'));
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    expect(get(searchStore).error).toBeNull();
  });

  // --- setRadius ---

  it('setRadius with origin triggers searchParks', async () => {
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);
    searchParks.mockClear();

    await setRadius(10);

    expect(searchParks).toHaveBeenCalledWith(
      ORIGIN.lat,
      ORIGIN.lon,
      10 * 1609.34
    );
  });

  it('setRadius without origin does NOT call searchParks', async () => {
    await setRadius(10);
    expect(searchParks).not.toHaveBeenCalled();
  });

  it('setRadius updates radiusMiles in state', async () => {
    await setRadius(15);
    expect(get(searchStore).radiusMiles).toBe(15);
  });

  // --- setFilters ---

  it('setFilters filters results by amenity without calling searchParks', async () => {
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);
    searchParks.mockClear();

    setFilters(['playground']);

    expect(searchParks).not.toHaveBeenCalled();
    // Assert via getFilteredResults — the function the UI actually uses.
    const state = get(searchStore);
    const filtered = getFilteredResults(state);
    expect(filtered.length).toBe(2); // Park A and Park C
    expect(filtered.every((p) => p.amenities.includes('playground'))).toBe(true);
  });

  it('setFilters with empty array shows all results', async () => {
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    setFilters([]);

    const state = get(searchStore);
    expect(state.selectedAmenities).toEqual([]);
    expect(getFilteredResults(state).length).toBe(PARKS.length);
  });

  it('setFilters applies AND logic for multiple amenities', async () => {
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    setFilters(['playground', 'restroom']);

    const state = get(searchStore);
    // Only Park C has both playground AND restroom
    const filtered = getFilteredResults(state);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Park C');
  });

  it('setFilters resets visibleCount to 20', async () => {
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);
    incrementVisibleCount(); // bump to 40
    expect(get(searchStore).visibleCount).toBe(40);

    setFilters(['playground']);

    // visibleCount must reset so the user sees from page 1 of the filtered set.
    expect(get(searchStore).visibleCount).toBe(20);
  });

  it('setOrigin resets visibleCount to 20 on new search', async () => {
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);
    incrementVisibleCount(); // bump to 40
    expect(get(searchStore).visibleCount).toBe(40);

    // New search must reset visibleCount so the user sees from page 1.
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(40.71, -74.01, 'New York, NY');

    expect(get(searchStore).visibleCount).toBe(20);
  });

  // --- visibleCount ---

  it('incrementVisibleCount increases visibleCount by 20', () => {
    expect(get(searchStore).visibleCount).toBe(20);
    incrementVisibleCount();
    expect(get(searchStore).visibleCount).toBe(40);
  });

  // --- selectPark / clearSelectedPark ---

  it('selectPark sets selectedPark', () => {
    selectPark(PARKS[0]);
    expect(get(searchStore).selectedPark).toEqual(PARKS[0]);
  });

  it('clearSelectedPark sets selectedPark to null', () => {
    selectPark(PARKS[0]);
    clearSelectedPark();
    expect(get(searchStore).selectedPark).toBeNull();
  });

  // --- mergeTravelTimes ---

  it('mergeTravelTimes merges times into the travelTimes map', () => {
    mergeTravelTimes(new Map([['way/1', 300], ['way/2', 600]]));

    const state = get(searchStore);
    expect(state.travelTimes.get('way/1')).toBe(300);
    expect(state.travelTimes.get('way/2')).toBe(600);
  });

  it('mergeTravelTimes preserves existing entries', () => {
    mergeTravelTimes(new Map([['way/1', 300]]));
    mergeTravelTimes(new Map([['way/2', 600]]));

    const state = get(searchStore);
    expect(state.travelTimes.get('way/1')).toBe(300);
    expect(state.travelTimes.get('way/2')).toBe(600);
  });

  // --- Stale-search guard ---

  it('discards results from a superseded search', async () => {
    // Simulate two overlapping searches where the first resolves after the second.
    // The guard increments a search ID on each call; results whose ID no longer
    // matches the current ID are silently dropped.
    let resolveFirst;
    const FIRST_PARKS = [{ id: 'way/old', name: 'Old Park', lat: 38.9, lon: -77.04, amenities: [], distanceMiles: 1, travelTimeSeconds: null, osmTags: {} }];
    const SECOND_PARKS = [{ id: 'way/new', name: 'New Park', lat: 40.71, lon: -74.01, amenities: [], distanceMiles: 2, travelTimeSeconds: null, osmTags: {} }];

    searchParks.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; })
    );
    searchParks.mockResolvedValueOnce(SECOND_PARKS);

    // Fire first search (stays pending).
    const p1 = setOrigin(38.9, -77.04, 'Location A');
    // Fire second search while first is still in flight.
    const p2 = setOrigin(40.71, -74.01, 'Location B');

    // Resolve second (already resolved), then first (stale).
    await p2;
    resolveFirst(FIRST_PARKS);
    await p1;

    // Only the second search's results should be in the store.
    const { allResults } = get(searchStore);
    expect(allResults.every((p) => p.id !== 'way/old')).toBe(true);
    expect(allResults.some((p) => p.id === 'way/new')).toBe(true);
  });

  it('clears travelTimes when new search results arrive', async () => {
    // Travel-time park IDs are location-specific; stale IDs from a previous
    // search must not persist after a new search fires.
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);
    mergeTravelTimes(new Map([['way/1', 300], ['way/2', 600]]));
    expect(get(searchStore).travelTimes.size).toBe(2);

    // Trigger a new search — travelTimes must be reset.
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(40.71, -74.01, 'New York, NY');

    expect(get(searchStore).travelTimes.size).toBe(0);
  });
});
