// Component tests for SearchBar.svelte.
// Uses Svelte Testing Library. Store actions are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb({ loading: false, error: null, origin: null });
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
import { setOrigin } from '../../src/stores/searchStore.js';
import { geocode } from '../../src/services/nominatim.js';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    // Re-mock the store to return an error state.
    const { searchStore: storeMock } = await import('../../src/stores/searchStore.js');
    storeMock.subscribe.mockImplementation((cb) => {
      cb({ loading: false, error: 'Address not found', origin: null });
      return () => {};
    });

    render(SearchBar);

    expect(screen.getByText(/address not found/i)).toBeInTheDocument();
  });

  it('GPS click clears any prior store error', async () => {
    // If the user gets an address-search error then clicks GPS, the stale error
    // should be cleared before the GPS result arrives (not linger on screen).
    const { searchStore: storeMock } = await import('../../src/stores/searchStore.js');
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: vi.fn() }, // don't resolve — just checking the clear
    });

    render(SearchBar);
    await fireEvent.click(screen.getByRole('button', { name: /gps|location|my location/i }));

    // The component calls searchStore.update(fn) to clear the error.
    expect(storeMock.update).toHaveBeenCalled();
    const updateFn = storeMock.update.mock.calls[0][0];
    const result = updateFn({ loading: false, error: 'Previous error', origin: null });
    expect(result.error).toBeNull();
  });

  it('shows a loading indicator and disables buttons while loading', async () => {
    const { searchStore: storeMock } = await import('../../src/stores/searchStore.js');
    storeMock.subscribe.mockImplementation((cb) => {
      cb({ loading: true, error: null, origin: null });
      return () => {};
    });

    render(SearchBar);

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /gps|location/i })).toBeDisabled();
  });
});
