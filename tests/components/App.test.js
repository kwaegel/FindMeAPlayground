// Smoke test for App.svelte — verifies all components render without crashing.
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';

// Mock all child component dependencies so we don't need real store/leaflet state.
vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb({
        origin: null,
        radiusMiles: 5,
        selectedAmenities: [],
        allResults: [],
        visibleCount: 20,
        travelTimes: new Map(),
        selectedPark: null,
        loading: false,
        error: null,
      });
      return () => {};
    }),
  },
  setOrigin: vi.fn(),
  setRadius: vi.fn(),
  setFilters: vi.fn(),
  selectPark: vi.fn(),
  clearSelectedPark: vi.fn(),
  incrementVisibleCount: vi.fn(),
  getFilteredResults: vi.fn(() => []),
  mergeTravelTimes: vi.fn(),
}));

vi.mock('../../src/services/nominatim.js', () => ({
  geocode: vi.fn(),
}));

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      addLayer: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      on: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    marker: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), bindPopup: vi.fn().mockReturnThis(), on: vi.fn().mockReturnThis(), remove: vi.fn() })),
    circle: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), remove: vi.fn() })),
  },
}));

import App from '../../src/App.svelte';

describe('App (App Shell)', () => {
  it('renders without crashing', () => {
    const { container } = render(App);
    expect(container).toBeInTheDocument();
  });

  it('contains the app title', () => {
    const { getByText } = render(App);
    expect(getByText('FindMeAPlayground')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    const { getByRole } = render(App);
    expect(getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the radius dropdown', () => {
    const { getByRole } = render(App);
    expect(getByRole('combobox')).toBeInTheDocument();
  });

  it('renders the map container', () => {
    const { container } = render(App);
    expect(container.querySelector('.map-container')).toBeInTheDocument();
  });
});
