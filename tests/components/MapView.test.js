// Component tests for MapView.svelte.
// Leaflet requires a real DOM with sizing, so the map instance itself is
// mocked. Tests verify the component's integration with the store and that
// it calls the correct Leaflet APIs with the right arguments.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';

// --- Leaflet mock ---
// Keep track of calls so we can assert on them.
const mockMap = {
  setView: vi.fn().mockReturnThis(),
  addLayer: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  on: vi.fn(),
};
const mockMarker = {
  addTo: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  remove: vi.fn(),
};
const mockCircle = {
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
};
const mockTileLayer = { addTo: vi.fn().mockReturnThis() };

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => mockTileLayer),
    marker: vi.fn(() => ({ ...mockMarker })),
    circle: vi.fn(() => ({ ...mockCircle })),
  },
}));

// --- Store mock ---
let mockState = {};
// Capture the subscribe callback so tests can push new state after render.
let storeSub;

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      storeSub = cb;
      cb(mockState);
      return () => {};
    }),
  },
  selectPark: vi.fn(),
  setOrigin: vi.fn(),
  getFilteredResults: vi.fn((state) => state.allResults ?? []),
}));

import MapView from '../../src/components/MapView.svelte';
import L from 'leaflet';
import { selectPark } from '../../src/stores/searchStore.js';

const PARKS = [
  { id: 'way/1', name: 'Oak Hill Park', lat: 38.9, lon: -77.04, amenities: [], distanceMiles: 0.5, travelTimeSeconds: null, osmTags: {} },
  { id: 'way/2', name: 'Riverside Park', lat: 38.88, lon: -77.02, amenities: [], distanceMiles: 1.8, travelTimeSeconds: null, osmTags: {} },
];

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      origin: { lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' },
      radiusMiles: 5,
      allResults: PARKS,
      selectedAmenities: [],
      visibleCount: 20,
      travelTimes: new Map(),
    };
  });

  it('initializes a Leaflet map on mount', async () => {
    render(MapView);
    await waitFor(() => expect(L.map).toHaveBeenCalled());
  });

  it('adds an OSM tile layer', async () => {
    render(MapView);
    await waitFor(() =>
      expect(L.tileLayer).toHaveBeenCalledWith(
        expect.stringContaining('openstreetmap.org'),
        expect.any(Object)
      )
    );
  });

  it('creates markers for each visible result', async () => {
    render(MapView);
    // Markers are placed in onMount and may also be placed when the reactive
    // block fires on initial store subscription — both are correct behavior.
    // Assert at least one marker per park was created.
    await waitFor(() =>
      expect(L.marker.mock.calls.length).toBeGreaterThanOrEqual(PARKS.length)
    );
    // Each marker call used one of the park's coordinates.
    const calledLatLons = L.marker.mock.calls.map((c) => c[0]);
    const parkLatLons = PARKS.map((p) => [p.lat, p.lon]);
    for (const ll of parkLatLons) {
      expect(calledLatLons).toContainEqual(ll);
    }
  });

  it('creates a circle with radius matching radiusMiles in meters', async () => {
    render(MapView);
    // 5 miles ≈ 8047 meters
    await waitFor(() =>
      expect(L.circle).toHaveBeenCalledWith(
        [38.895, -77.036],
        expect.objectContaining({ radius: expect.any(Number) })
      )
    );
    const radiusArg = L.circle.mock.calls[0][1].radius;
    expect(radiusArg).toBeCloseTo(5 * 1609.34, -2);
  });

  it('renders a div container for the map', () => {
    const { container } = render(MapView);
    expect(container.querySelector('.map-container')).toBeInTheDocument();
  });

  it('re-centers the map when origin changes', async () => {
    render(MapView);
    await waitFor(() => expect(L.map).toHaveBeenCalled());

    // Push a new origin through the store subscription.
    const newOrigin = { lat: 40.71, lon: -74.01, displayName: 'New York, NY' };
    mockState = { ...mockState, origin: newOrigin };
    storeSub(mockState);

    await waitFor(() =>
      expect(mockMap.setView).toHaveBeenCalledWith(
        [newOrigin.lat, newOrigin.lon],
        expect.any(Number)
      )
    );
  });

  it('removes stale markers before placing new ones when results change', async () => {
    // Track marker instances so we can assert .remove() was called on the old ones.
    const createdMarkers = [];
    L.marker.mockImplementation(() => {
      const m = {
        addTo: vi.fn().mockReturnThis(),
        bindPopup: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        remove: vi.fn(),
      };
      createdMarkers.push(m);
      return m;
    });

    render(MapView);
    // Wait for the initial markers to be placed.
    await waitFor(() => expect(L.marker.mock.calls.length).toBeGreaterThanOrEqual(PARKS.length));
    const firstBatch = [...createdMarkers];

    // Push new results — different park IDs means a different result set.
    const newParks = [
      { id: 'way/99', name: 'New Park', lat: 40.71, lon: -74.01, amenities: [], distanceMiles: 0.3, travelTimeSeconds: null, osmTags: {} },
    ];
    mockState = { ...mockState, allResults: newParks };
    storeSub(mockState);

    // After the update, all markers from the first batch must be removed.
    await waitFor(() => {
      for (const m of firstBatch) {
        expect(m.remove).toHaveBeenCalled();
      }
    });
  });

  it('clicking a marker calls selectPark with the corresponding park', async () => {
    // Capture the click handler from the FIRST marker placed.
    // Subsequent markers overwrite it, so we stop capturing after the first.
    let firstMarkerClickHandler = null;
    L.marker.mockImplementation(() => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      on: vi.fn((event, handler) => {
        if (event === 'click' && firstMarkerClickHandler === null) {
          firstMarkerClickHandler = handler;
        }
        return { addTo: vi.fn().mockReturnThis(), bindPopup: vi.fn().mockReturnThis(), on: vi.fn().mockReturnThis(), remove: vi.fn() };
      }),
      remove: vi.fn(),
    }));

    render(MapView);

    // Wait for markers to be placed in onMount.
    await waitFor(() => expect(L.marker).toHaveBeenCalled());
    expect(firstMarkerClickHandler).not.toBeNull();

    // Simulate a click on the first marker (Oak Hill Park).
    firstMarkerClickHandler();

    expect(selectPark).toHaveBeenCalledWith(PARKS[0]);
  });

  // --- Search-from-here (task 13) ---

  it('right-click (contextmenu) on the map calls setOrigin with "Map location"', async () => {
    render(MapView);
    await waitFor(() => expect(L.map).toHaveBeenCalled());

    // Capture the contextmenu handler registered with the Leaflet map mock.
    const contextMenuCall = mockMap.on.mock.calls.find(([event]) => event === 'contextmenu');
    expect(contextMenuCall).toBeDefined();
    const contextMenuHandler = contextMenuCall[1];

    // Simulate a right-click at specific coordinates.
    contextMenuHandler({ latlng: { lat: 40.71, lng: -74.01 } });

    const { setOrigin: setOriginMock } = await import('../../src/stores/searchStore.js');
    expect(setOriginMock).toHaveBeenCalledWith(40.71, -74.01, 'Map location');
  });

  // Long-press tests use fake timers. Wrapping them in a nested describe with
  // beforeEach/afterEach ensures timers are restored even if a test throws —
  // per-test vi.useRealTimers() calls are skipped on failure and contaminate
  // subsequent tests.
  describe('long-press', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('touchstart held 500ms calls setOrigin with "Map location"', async () => {
      render(MapView);
      await waitFor(() => expect(L.map).toHaveBeenCalled());

      const touchStartCall = mockMap.on.mock.calls.find(([event]) => event === 'touchstart');
      expect(touchStartCall).toBeDefined();
      const touchStartHandler = touchStartCall[1];

      // Start the press — the 500ms timer should not have fired yet.
      touchStartHandler({ latlng: { lat: 38.9, lng: -77.04 } });

      const { setOrigin: setOriginMock } = await import('../../src/stores/searchStore.js');
      expect(setOriginMock).not.toHaveBeenCalled();

      // Advance past the long-press threshold. Use the async variant so any
      // microtasks scheduled by the timer callback are flushed before the assertion.
      await vi.advanceTimersByTimeAsync(510);
      expect(setOriginMock).toHaveBeenCalledWith(38.9, -77.04, 'Map location');
    });

    it('cancels if finger lifts before 500ms', async () => {
      render(MapView);
      await waitFor(() => expect(L.map).toHaveBeenCalled());

      const touchStartCall = mockMap.on.mock.calls.find(([event]) => event === 'touchstart');
      const touchEndCall = mockMap.on.mock.calls.find(([event]) => event === 'touchend');
      const touchStartHandler = touchStartCall[1];
      const touchEndHandler = touchEndCall[1];

      touchStartHandler({ latlng: { lat: 38.9, lng: -77.04 } });
      touchEndHandler(); // finger lifts before 500ms
      await vi.advanceTimersByTimeAsync(600);

      const { setOrigin: setOriginMock } = await import('../../src/stores/searchStore.js');
      expect(setOriginMock).not.toHaveBeenCalled();
    });
  });
});
