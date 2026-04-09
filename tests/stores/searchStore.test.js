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
    const state = get(searchStore);
    // Only parks with 'playground' amenity should be in filteredResults
    const filtered = state.allResults.filter((p) => p.amenities.includes('playground'));
    expect(filtered.length).toBe(2); // Park A and Park C
  });

  it('setFilters with empty array shows all results', async () => {
    searchParks.mockResolvedValue(PARKS);
    await setOrigin(ORIGIN.lat, ORIGIN.lon, ORIGIN.displayName);

    setFilters([]);

    expect(get(searchStore).selectedAmenities).toEqual([]);
  });

  it('setFilters applies AND logic for multiple amenities', () => {
    searchStore.update((s) => ({ ...s, allResults: PARKS }));
    setFilters(['playground', 'restroom']);

    const state = get(searchStore);
    // Only Park C has both playground AND restroom
    const matching = state.allResults.filter(
      (p) => ['playground', 'restroom'].every((a) => p.amenities.includes(a))
    );
    expect(matching.length).toBe(1);
    expect(matching[0].name).toBe('Park C');
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
});
