// localStorage persistence for search state.
// Persists origin, radiusMiles, and selectedAmenities under the key
// `findmeaplayground_state`. Debounces writes at 500ms to avoid thrashing.
// On init(), reads stored state and hydrates the store; auto-triggers a
// search if a stored origin is present.

import { searchStore, setOrigin, setRadius, setFilters } from './searchStore.js';

const STORAGE_KEY = 'findmeaplayground_state';
const DEBOUNCE_MS = 500;

let debounceTimer = null;

/**
 * Write the relevant subset of store state to localStorage.
 * Only persists fields that are meaningful to restore across sessions.
 *
 * @param {{ origin: object|null, radiusMiles: number, selectedAmenities: string[] }} state
 */
function persist(state) {
  const payload = {
    origin: state.origin,
    radiusMiles: state.radiusMiles,
    selectedAmenities: state.selectedAmenities,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may throw in private/incognito mode or when storage quota
    // is exceeded. Silently ignore — persistence is a UX enhancement only.
  }
}

/**
 * Read and parse stored state. Returns null if the key is absent or the
 * stored value is not valid JSON.
 *
 * @returns {object|null}
 */
function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Initialize localStorage sync.
 *
 * 1. Reads stored state and applies it to the store (radius, amenities).
 * 2. If a stored origin is present, calls setOrigin() which triggers a search.
 * 3. Subscribes to the store and debounce-writes changes to localStorage.
 *
 * Call this from main.js before mounting the app.
 */
export function init() {
  const stored = readStored();

  if (stored) {
    // Restore radius and amenity filters synchronously (no side effects).
    if (typeof stored.radiusMiles === 'number') {
      setRadius(stored.radiusMiles);
    }
    if (Array.isArray(stored.selectedAmenities)) {
      setFilters(stored.selectedAmenities);
    }

    // Restoring the origin triggers a full Overpass search — do this last.
    if (stored.origin?.lat != null && stored.origin?.lon != null) {
      setOrigin(stored.origin.lat, stored.origin.lon, stored.origin.displayName ?? '');
    }
  }

  // Subscribe to store and debounce-write changes.
  searchStore.subscribe((state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => persist(state), DEBOUNCE_MS);
  });
}
