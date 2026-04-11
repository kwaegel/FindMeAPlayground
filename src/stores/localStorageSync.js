// localStorage persistence for search state.
// Persists origin, radiusMiles, and selectedAmenities under the key
// `findmeaplayground_state`. Debounces writes at 500ms to avoid thrashing.
// On init(), reads stored state and hydrates the store; auto-triggers a
// search if a stored origin is present.

import { searchStore, setOrigin, setRadius, setFilters } from './searchStore.js';
// Static import — no circular dep (amenities.js has no imports).
import { AMENITIES } from '../config/amenities.js';

// Allowed radius values — must match the options in RadiusDropdown.
const VALID_RADII = [5, 10, 15];
// Valid amenity keys derived from config so validation stays in sync automatically.
const VALID_AMENITY_KEYS = new Set(AMENITIES.map((a) => a.key));

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
export async function init() {
  const stored = readStored();

  if (stored) {
    // Restore radius — await so the store is in the correct state before
    // setOrigin fires a search. Validate against the allowed set to reject
    // corrupted or manually-edited localStorage values.
    if (VALID_RADII.includes(stored.radiusMiles)) {
      await setRadius(stored.radiusMiles);
    }

    // Restore amenity filters — filter to known keys only so stale amenity
    // names from a previous version don't linger in the store.
    if (Array.isArray(stored.selectedAmenities)) {
      const sanitized = stored.selectedAmenities.filter((k) => VALID_AMENITY_KEYS.has(k));
      setFilters(sanitized);
    }

    // Restoring the origin triggers a full Overpass search — do this last so
    // radius and filters are already in place when the search fires.
    // Not awaited intentionally: the search runs concurrently with app mount.
    // The .catch() prevents an unhandled promise rejection if the Overpass
    // fetch fails — the error is already written to store.error by runSearch.
    if (stored.origin?.lat != null && stored.origin?.lon != null) {
      // Promise.resolve() wraps the return value so .catch() works regardless
      // of whether setOrigin returns a Promise or undefined (e.g. in test mocks).
      Promise.resolve(
        setOrigin(stored.origin.lat, stored.origin.lon, stored.origin.displayName ?? '')
      ).catch((err) => {
        console.warn('[localStorageSync] Auto-search on restore failed:', err.message);
      });
    }
  }

  // Subscribe to store and debounce-write changes.
  searchStore.subscribe((state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => persist(state), DEBOUNCE_MS);
  });
}
