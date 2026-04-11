// Central search store — the single source of truth for all app state.
// Orchestrates data fetching when search inputs change and exposes
// action functions that components call to drive state transitions.
//
// State is a Svelte writable store. Components subscribe via $searchStore.

import { writable, get } from 'svelte/store';
import { searchParks } from '../services/overpass.js';

// Miles to meters conversion factor.
const MILES_TO_METERS = 1609.34;

// Default number of results to show before "Show more" is clicked.
const DEFAULT_VISIBLE_COUNT = 20;

// Monotonically-increasing counter used to discard stale search results.
// If the user triggers a new search while a previous one is in flight, only
// the most recent search's results are written to the store. Without this
// guard, a slow first request can overwrite faster, newer results.
let currentSearchId = 0;

/**
 * @typedef {Object} SearchState
 * @property {{ lat: number, lon: number, displayName: string } | null} origin
 * @property {5 | 10 | 15} radiusMiles
 * @property {string[]} selectedAmenities
 * @property {ParkResult[]} allResults
 * @property {number} visibleCount
 * @property {Map<string, number>} travelTimes
 * @property {ParkResult | null} selectedPark
 * @property {boolean} loading
 * @property {string | null} error
 */

/** @returns {SearchState} */
function defaultState() {
  return {
    origin: null,
    radiusMiles: 5,
    selectedAmenities: [],
    allResults: [],
    visibleCount: DEFAULT_VISIBLE_COUNT,
    travelTimes: new Map(),
    selectedPark: null,
    loading: false,
    error: null,
  };
}

export const searchStore = writable(defaultState());

/**
 * Reset store to defaults. Also resets the search ID counter so stale-result
 * guards from a previous test don't bleed into the next. Exported for test
 * isolation only.
 */
export function _resetStore() {
  currentSearchId = 0;
  searchStore.set(defaultState());
}

/**
 * Return the current search generation ID. Used by the travel-time service to
 * detect whether a batch that finished in-flight belongs to the current search
 * or a superseded one.
 *
 * @returns {number}
 */
export function getSearchId() {
  return currentSearchId;
}

// --- Internal helpers ---

/**
 * Run a park search using the current store's origin and given radius.
 * Manages loading/error state around the async call.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusMiles
 */
async function runSearch(lat, lon, radiusMiles) {
  // Capture this search's ID before the await so we can detect if a newer
  // search was started while this one was in flight.
  const searchId = ++currentSearchId;
  searchStore.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const results = await searchParks(lat, lon, radiusMiles * MILES_TO_METERS);
    // A newer search was triggered while this one was in flight — discard
    // stale results to avoid overwriting the most recent state.
    if (searchId !== currentSearchId) return;
    searchStore.update((s) => ({
      ...s,
      allResults: results,
      visibleCount: DEFAULT_VISIBLE_COUNT,
      // Clear travel times from the previous search — park IDs are
      // location-specific, so stale entries must not bleed into new results.
      travelTimes: new Map(),
      // Clear the selected park — its distanceMiles was calculated from the
      // old origin and would be wrong in the new result set. The user can
      // re-select from the updated list.
      selectedPark: null,
      loading: false,
    }));
  } catch (err) {
    if (searchId !== currentSearchId) return;
    searchStore.update((s) => ({
      ...s,
      loading: false,
      error: err.message,
      // Clear the selected park on error for the same reason as on success —
      // its distanceMiles is anchored to the old origin and would mislead the
      // user if the modal stayed open after a failed re-search.
      selectedPark: null,
    }));
  }
}

// --- Public action functions ---

/**
 * Set the search origin and trigger a new park search.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} displayName
 */
export async function setOrigin(lat, lon, displayName) {
  const { radiusMiles } = get(searchStore);
  searchStore.update((s) => ({ ...s, origin: { lat, lon, displayName } }));
  await runSearch(lat, lon, radiusMiles);
}

/**
 * Update the search radius. Triggers a new search if an origin is set.
 *
 * @param {5 | 10 | 15} miles
 */
export async function setRadius(miles) {
  searchStore.update((s) => ({ ...s, radiusMiles: miles }));
  const { origin } = get(searchStore);
  if (origin) {
    await runSearch(origin.lat, origin.lon, miles);
  }
}

/**
 * Update the selected amenity filters. Filters allResults client-side;
 * does NOT trigger a new Overpass query.
 *
 * @param {string[]} amenities
 */
export function setFilters(amenities) {
  // Reset visibleCount so the first page of filtered results is shown,
  // rather than preserving a previously expanded count from a different filter.
  searchStore.update((s) => ({
    ...s,
    selectedAmenities: amenities,
    visibleCount: DEFAULT_VISIBLE_COUNT,
  }));
}

/**
 * Expand the visible result count by 20 (pagination).
 */
export function incrementVisibleCount() {
  searchStore.update((s) => ({ ...s, visibleCount: s.visibleCount + 20 }));
}

/**
 * Set the currently selected park (opens the detail modal).
 *
 * @param {ParkResult} park
 */
export function selectPark(park) {
  searchStore.update((s) => ({ ...s, selectedPark: park }));
}

/**
 * Clear the selected park (closes the detail modal).
 */
export function clearSelectedPark() {
  searchStore.update((s) => ({ ...s, selectedPark: null }));
}

/**
 * Merge asynchronously-arrived travel times into the store.
 * Entries from the incoming map are merged into the existing travelTimes map.
 *
 * Accepts an optional `expectedSearchId` so callers (travelTime.js batches) can
 * discard results that belong to a superseded search. Without this guard, an
 * in-flight batch that outlives a new search would pollute the new search's map
 * with stale park IDs from the old location.
 *
 * @param {Map<string, number>} timesMap - Map of parkId → seconds.
 * @param {number} [expectedSearchId] - If provided, skip the merge if the search
 *   has moved on since this batch was dispatched.
 */
export function mergeTravelTimes(timesMap, expectedSearchId) {
  // Discard stale batch: a newer search started while this one was in flight.
  if (expectedSearchId !== undefined && expectedSearchId !== currentSearchId) return;
  searchStore.update((s) => {
    const merged = new Map(s.travelTimes);
    for (const [id, seconds] of timesMap) {
      merged.set(id, seconds);
    }
    return { ...s, travelTimes: merged };
  });
}

/**
 * Derive filtered results from allResults given the current selectedAmenities.
 * Uses AND logic: a park must have ALL selected amenities.
 *
 * @param {SearchState} state
 * @returns {ParkResult[]}
 */
export function getFilteredResults(state) {
  const { allResults, selectedAmenities } = state;
  if (selectedAmenities.length === 0) return allResults;
  return allResults.filter((park) =>
    selectedAmenities.every((amenity) => park.amenities.includes(amenity))
  );
}
