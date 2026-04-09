// Component tests for ResultsList.svelte.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

// Park fixtures for tests.
const PARKS = [
  {
    id: 'way/1',
    name: 'Oak Hill Park',
    lat: 38.9,
    lon: -77.04,
    amenities: ['playground'],
    distanceMiles: 0.5,
    travelTimeSeconds: null,
    osmTags: {},
  },
  {
    id: 'way/2',
    name: 'Riverside Park',
    lat: 38.88,
    lon: -77.02,
    amenities: ['restroom', 'hiking-trail'],
    distanceMiles: 1.8,
    travelTimeSeconds: 480,
    osmTags: {},
  },
  {
    id: 'way/3',
    name: 'Unnamed Park',
    lat: 38.87,
    lon: -77.01,
    amenities: [],
    distanceMiles: 2.5,
    travelTimeSeconds: null,
    osmTags: {},
  },
];

// Build the store mock — control state per-test via mockState.
let mockState = {};

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb(mockState);
      return () => {};
    }),
  },
  selectPark: vi.fn(),
  incrementVisibleCount: vi.fn(),
  getFilteredResults: vi.fn((state) => {
    const { allResults, selectedAmenities } = state;
    if (!selectedAmenities?.length) return allResults ?? [];
    return (allResults ?? []).filter((p) =>
      selectedAmenities.every((a) => p.amenities.includes(a))
    );
  }),
}));

import ResultsList from '../../src/components/ResultsList.svelte';
import { selectPark, incrementVisibleCount } from '../../src/stores/searchStore.js';

describe('ResultsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      allResults: PARKS,
      selectedAmenities: [],
      visibleCount: 20,
      travelTimes: new Map([['way/2', 480]]),
    };
  });

  it('renders a list item for each visible result', () => {
    render(ResultsList);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
  });

  it('displays park names', () => {
    render(ResultsList);
    expect(screen.getByText('Oak Hill Park')).toBeInTheDocument();
    expect(screen.getByText('Riverside Park')).toBeInTheDocument();
  });

  it('displays distance in miles with 1 decimal', () => {
    render(ResultsList);
    expect(screen.getByText(/0\.5 mi/)).toBeInTheDocument();
    expect(screen.getByText(/1\.8 mi/)).toBeInTheDocument();
  });

  it('displays travel time when available', () => {
    render(ResultsList);
    // 480 seconds = 8 min
    expect(screen.getByText(/8 min/)).toBeInTheDocument();
  });

  it('does not display travel time when not available', () => {
    render(ResultsList);
    // Oak Hill Park has no travel time — no "min" text for it
    const items = screen.getAllByRole('listitem');
    // First item is Oak Hill Park (0.5 mi, no travel time)
    expect(items[0].textContent).not.toMatch(/\d+ min/);
  });

  it('renders a Google Maps directions link for each result with correct coordinates', () => {
    render(ResultsList);
    const links = screen.getAllByRole('link', { name: /directions/i });
    expect(links.length).toBeGreaterThanOrEqual(3);
    // Each link must use that park's own coordinates, not a shared/first-park value.
    PARKS.forEach((park, i) => {
      expect(links[i].href).toContain('google.com/maps');
      expect(links[i].href).toContain(`destination=${park.lat},${park.lon}`);
    });
  });

  it('renders results in ascending distance order', () => {
    render(ResultsList);
    const items = screen.getAllByRole('listitem');
    // The fixture is sorted 0.5 → 1.8 → 2.5 mi; verify DOM order matches.
    expect(items[0].textContent).toContain('Oak Hill Park');
    expect(items[1].textContent).toContain('Riverside Park');
    expect(items[2].textContent).toContain('Unnamed Park');
  });

  it('clicking a result calls selectPark', async () => {
    render(ResultsList);
    // The interactive element is the <button> wrapping each list item's content.
    const buttons = screen.getAllByRole('button', { name: /oak hill park/i });
    await fireEvent.click(buttons[0]);
    expect(selectPark).toHaveBeenCalledWith(PARKS[0]);
  });

  it('shows "Show more" button when there are more results than visibleCount', () => {
    mockState = { ...mockState, visibleCount: 2 };
    render(ResultsList);
    expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument();
  });

  it('hides "Show more" button when all results are visible', () => {
    mockState = { ...mockState, visibleCount: 20 };
    render(ResultsList);
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('clicking "Show more" calls incrementVisibleCount', async () => {
    mockState = { ...mockState, visibleCount: 2 };
    render(ResultsList);
    await fireEvent.click(screen.getByRole('button', { name: /show more/i }));
    expect(incrementVisibleCount).toHaveBeenCalled();
  });

  it('shows empty state message when a search has been run but no results found', () => {
    // origin must be set — the empty state only appears after a real search.
    mockState = {
      ...mockState,
      allResults: [],
      loading: false,
      origin: { lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' },
    };
    render(ResultsList);
    expect(screen.getByText(/no parks found/i)).toBeInTheDocument();
  });

  it('does not show empty state message before any search is run', () => {
    // origin is null — user has not searched yet.
    mockState = { ...mockState, allResults: [], origin: null, loading: false };
    render(ResultsList);
    expect(screen.queryByText(/no parks found/i)).not.toBeInTheDocument();
  });
});
