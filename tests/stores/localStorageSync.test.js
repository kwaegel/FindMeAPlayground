// Tests for localStorageSync — localStorage persistence of search state.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const STORAGE_KEY = 'findmeaplayground_state';

// Store mock — we control the subscribe callback and capture setOrigin calls.
let storeSub;
let currentState = {};

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      storeSub = cb;
      cb(currentState);
      return () => {};
    }),
  },
  setOrigin: vi.fn(),
  setRadius: vi.fn(),
  setFilters: vi.fn(),
}));

import { init } from '../../src/stores/localStorageSync.js';
import { setOrigin, setRadius, setFilters } from '../../src/stores/searchStore.js';

describe('localStorageSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    currentState = { origin: null, radiusMiles: 5, selectedAmenities: [] };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Restore on load ---

  it('restores origin from localStorage on init', async () => {
    const stored = {
      origin: { lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' },
      radiusMiles: 10,
      selectedAmenities: ['playground'],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    await init();

    expect(setOrigin).toHaveBeenCalledWith(38.895, -77.036, 'Arlington, VA');
  });

  it('restores radius on init even without origin', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ radiusMiles: 15, selectedAmenities: [] }));

    await init();

    expect(setRadius).toHaveBeenCalledWith(15);
  });

  it('restores selectedAmenities on init', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ radiusMiles: 5, selectedAmenities: ['restroom'] })
    );

    await init();

    expect(setFilters).toHaveBeenCalledWith(['restroom']);
  });

  it('does not call setOrigin when no stored origin', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ radiusMiles: 5, selectedAmenities: [] }));

    await init();

    expect(setOrigin).not.toHaveBeenCalled();
  });

  it('uses defaults silently when localStorage key is absent', async () => {
    // No localStorage entry.
    await expect(init()).resolves.not.toThrow();
    expect(setOrigin).not.toHaveBeenCalled();
  });

  it('uses defaults silently when localStorage contains corrupt JSON', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{');
    await expect(init()).resolves.not.toThrow();
  });

  it('strips unrecognized amenity keys from stored selectedAmenities', async () => {
    // A key from a previous app version (or manually edited storage) must not
    // persist into the store — it would show as a filter with no matching parks
    // and silently hide all results. Only VALID_AMENITY_KEYS pass through.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        radiusMiles: 5,
        selectedAmenities: ['playground', 'unknown-future-amenity', 'restroom'],
      })
    );

    await init();

    // Only the known keys should have been passed to setFilters.
    expect(setFilters).toHaveBeenCalledWith(['playground', 'restroom']);
  });

  // --- Persist on change ---

  it('writes state to localStorage after store changes (debounced at 500ms)', async () => {
    init();

    // Simulate a store state change.
    currentState = {
      origin: { lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' },
      radiusMiles: 10,
      selectedAmenities: ['playground'],
    };
    storeSub(currentState);

    // Before debounce fires — nothing written yet.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Advance past the 500ms debounce window.
    await vi.advanceTimersByTimeAsync(600);

    const written = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(written.origin.displayName).toBe('Arlington, VA');
    expect(written.radiusMiles).toBe(10);
    expect(written.selectedAmenities).toEqual(['playground']);
  });

  it('debounces rapid writes — only one localStorage write after multiple changes', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    init();

    // Fire multiple state changes rapidly. Start at 10 so the final value (14)
    // is unambiguous — using 1..5 would coincide with the default of 5 and
    // mask a bug where the debounce wrote the first value instead of the last.
    for (let i = 0; i < 5; i++) {
      currentState = { ...currentState, radiusMiles: 10 + i };
      storeSub(currentState);
    }

    await vi.advanceTimersByTimeAsync(600);

    // The debounce must collapse 5 rapid changes into exactly one write.
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    // The written value must reflect the last state (radiusMiles: 14), not
    // an intermediate one (e.g. 10 if the debounce wrote on the first change).
    const written = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(written.radiusMiles).toBe(14);
  });
});
