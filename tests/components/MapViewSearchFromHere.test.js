// Tests for "search from here" feature in MapView.svelte.
// Right-click / long-press on the map sets a new origin.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';

// --- Leaflet mock with contextmenu event support ---
let mapEventHandlers = {};

const mockMap = {
  setView: vi.fn().mockReturnThis(),
  addLayer: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  on: vi.fn((event, handler) => {
    mapEventHandlers[event] = handler;
    return mockMap;
  }),
};

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    circle: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), remove: vi.fn() })),
  },
}));

let mockState = {};

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb(mockState);
      return () => {};
    }),
  },
  selectPark: vi.fn(),
  setOrigin: vi.fn(),
  getFilteredResults: vi.fn(() => []),
}));

import MapView from '../../src/components/MapView.svelte';
import { setOrigin } from '../../src/stores/searchStore.js';

describe('MapView: search from here', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapEventHandlers = {};
    mockState = {
      origin: { lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' },
      radiusMiles: 5,
      allResults: [],
      selectedAmenities: [],
      visibleCount: 20,
      travelTimes: new Map(),
    };
  });

  it('registers a contextmenu handler on the Leaflet map', async () => {
    render(MapView);
    await waitFor(() => expect(mockMap.on).toHaveBeenCalledWith('contextmenu', expect.any(Function)));
  });

  it('calls setOrigin with "Map location" when right-click fires', async () => {
    render(MapView);

    // Wait for the map to initialize and register event handlers.
    await waitFor(() => expect(mapEventHandlers['contextmenu']).toBeDefined());

    // Simulate a right-click event from Leaflet.
    mapEventHandlers['contextmenu']({
      latlng: { lat: 38.91, lng: -77.05 },
    });

    expect(setOrigin).toHaveBeenCalledWith(38.91, -77.05, 'Map location');
  });

  it('renders the map container', () => {
    const { container } = render(MapView);
    expect(container.querySelector('.map-container')).toBeInTheDocument();
  });
});
