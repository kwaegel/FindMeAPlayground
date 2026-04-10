// Component tests for SearchBar.svelte.
// Uses Svelte Testing Library. Store actions are mocked.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

// Use a mutable state variable (like RadiusDropdown.test.js) so each test can
// configure the initial store state before render without re-importing the mock.
// This replaces the fragile `await import(...).mockImplementation(...)` pattern,
// which ran after vi.clearAllMocks() had already wiped any prior implementation.
let mockState = { loading: false, error: null, origin: null };

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb(mockState);
      return () => {};
    }),
    // SearchBar calls searchStore.update() to clear the store error on GPS click
    // and to surface geocoding errors via the error channel.
    update: vi.fn(),
  },
  setOrigin: vi.fn(),
}));

vi.mock('../../src/services/nominatim.js', () => ({
  geocode: vi.fn(),
}));

import SearchBar from '../../src/components/SearchBar.svelte';
import { setOrigin, searchStore } from '../../src/stores/searchStore.js';
import { geocode } from '../../src/services/nominatim.js';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { loading: false, error: null, origin: null };
  });

  afterEach(() => {
    // Ensure navigator stubs from GPS tests don't leak into other tests.
    vi.unstubAllGlobals();
  });

  it('renders an address input and search button', () => {
    render(SearchBar);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('calls geocode and setOrigin when Enter is pressed with a value', async () => {
    geocode.mockResolvedValue({ lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' });

    render(SearchBar);
    const input = screen.getByRole('textbox');

    await fireEvent.input(input, { target: { value: 'Arlington, VA' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(geocode).toHaveBeenCalledWith('Arlington, VA');
      expect(setOrigin).toHaveBeenCalledWith(38.895, -77.036, 'Arlington, VA');
    });
  });

  it('calls geocode when Search button is clicked', async () => {
    geocode.mockResolvedValue({ lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' });

    render(SearchBar);
    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Arlington, VA' } });
    await fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(geocode).toHaveBeenCalledWith('Arlington, VA'));
  });

  it('does not call geocode when input is empty', async () => {
    render(SearchBar);
    await fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(geocode).not.toHaveBeenCalled();
  });

  it('renders a GPS button', () => {
    render(SearchBar);
    expect(screen.getByRole('button', { name: /gps|location|my location/i })).toBeInTheDocument();
  });

  it('calls setOrigin with GPS coordinates when geolocation succeeds', async () => {
    // Mock navigator.geolocation.getCurrentPosition to call the success callback.
    const mockGetCurrentPosition = vi.fn((successCb) => {
      successCb({ coords: { latitude: 38.9, longitude: -77.04 } });
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: mockGetCurrentPosition },
    });

    render(SearchBar);
    await fireEvent.click(screen.getByRole('button', { name: /gps|location|my location/i }));

    await waitFor(() => {
      expect(setOrigin).toHaveBeenCalledWith(38.9, -77.04, 'Your location');
    });
  });

  it('displays an error message when geolocation is denied', async () => {
    // Mock navigator.geolocation.getCurrentPosition to call the error callback.
    const mockGetCurrentPosition = vi.fn((_successCb, errorCb) => {
      errorCb(new Error('User denied geolocation'));
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: mockGetCurrentPosition },
    });

    render(SearchBar);
    await fireEvent.click(screen.getByRole('button', { name: /gps|location|my location/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/location access denied/i);
    });
  });

  it('displays an error message from the store', async () => {
    mockState = { loading: false, error: 'Address not found', origin: null };
    render(SearchBar);
    expect(screen.getByText(/address not found/i)).toBeInTheDocument();
  });

  it('GPS click clears any prior store error', async () => {
    // If the user gets an address-search error then clicks GPS, the stale error
    // should be cleared before the GPS result arrives (not linger on screen).
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: vi.fn() }, // don't resolve — just checking the clear
    });

    render(SearchBar);
    await fireEvent.click(screen.getByRole('button', { name: /gps|location|my location/i }));

    // The component calls searchStore.update(fn) to clear the error.
    expect(searchStore.update).toHaveBeenCalled();
    const updateFn = searchStore.update.mock.calls[0][0];
    const result = updateFn({ loading: false, error: 'Previous error', origin: null });
    expect(result.error).toBeNull();
  });

  it('shows a loading indicator and disables buttons while loading', async () => {
    mockState = { loading: true, error: null, origin: null };
    render(SearchBar);

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /gps|location/i })).toBeDisabled();
  });

  it('shows a loading indicator and disables buttons while geocoding', async () => {
    // The store.loading flag only becomes true once the Overpass query starts,
    // not during the geocode() call itself. The component should show feedback
    // during the geocoding phase too so the user doesn't press Search again.
    let resolveGeocode;
    geocode.mockImplementation(() => new Promise((resolve) => { resolveGeocode = resolve; }));

    render(SearchBar);
    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Arlington, VA' } });
    await fireEvent.click(screen.getByRole('button', { name: /search/i }));

    // While geocode() is pending, the button should be disabled.
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    expect(screen.getByText(/searching/i)).toBeInTheDocument();

    // Resolve geocode — loading state should clear.
    resolveGeocode({ lat: 38.895, lon: -77.036, displayName: 'Arlington, VA' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled();
    });
  });
});
