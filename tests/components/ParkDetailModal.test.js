// Component tests for ParkDetailModal.svelte.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

let mockState = {};

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb(mockState);
      return () => {};
    }),
  },
  clearSelectedPark: vi.fn(),
}));

import ParkDetailModal from '../../src/components/ParkDetailModal.svelte';
import { clearSelectedPark } from '../../src/stores/searchStore.js';

const PARK = {
  id: 'way/1',
  name: 'Oak Hill Park',
  lat: 38.9,
  lon: -77.04,
  amenities: ['playground', 'restroom'],
  distanceMiles: 0.5,
  travelTimeSeconds: null,
  osmTags: {},
};

describe('ParkDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is not visible when selectedPark is null', () => {
    mockState = { selectedPark: null, travelTimes: new Map() };
    const { container } = render(ParkDetailModal);
    expect(container.querySelector('.modal-content')).not.toBeInTheDocument();
  });

  it('is visible when selectedPark is set', () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    expect(screen.getByText('Oak Hill Park')).toBeInTheDocument();
  });

  it('shows the park name', () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    expect(screen.getByRole('heading', { name: 'Oak Hill Park' })).toBeInTheDocument();
  });

  it('shows distance in miles with 1 decimal', () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    expect(screen.getByText(/0\.5 mi/)).toBeInTheDocument();
  });

  it('shows travel time when available', () => {
    mockState = {
      selectedPark: PARK,
      travelTimes: new Map([['way/1', 720]]),
    };
    render(ParkDetailModal);
    // 720 seconds = 12 min
    expect(screen.getByText(/12 min/)).toBeInTheDocument();
  });

  it('does not show travel time when not available', () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    expect(screen.queryByText(/\d+ min/)).not.toBeInTheDocument();
  });

  it('shows a Google Maps directions link that opens in a new tab', () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    const link = screen.getByRole('link', { name: /directions|google maps/i });
    expect(link.href).toContain('google.com/maps');
    expect(link.href).toContain(`${PARK.lat},${PARK.lon}`);
    expect(link.target).toBe('_blank');
  });

  it('closes when the close button is clicked', async () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    await fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(clearSelectedPark).toHaveBeenCalled();
  });

  it('closes when Escape is pressed', async () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(clearSelectedPark).toHaveBeenCalled();
  });

  it('shows amenity labels for each amenity', () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    // PARK has ['playground', 'restroom'] — verify human-readable labels are shown.
    expect(screen.getByText('Playground')).toBeInTheDocument();
    expect(screen.getByText('Restroom')).toBeInTheDocument();
  });

  it('closes when overlay background is clicked', async () => {
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    render(ParkDetailModal);
    // The dialog element IS the overlay — clicking it directly (not its children)
    // triggers the close. Use getByRole to avoid coupling to CSS class names.
    const dialog = screen.getByRole('dialog');
    await fireEvent.click(dialog);
    expect(clearSelectedPark).toHaveBeenCalled();
  });

  it('does NOT close when modal content area is clicked', async () => {
    // The handleOverlayClick guard (event.target === event.currentTarget) must
    // prevent clicks on the inner content from bubbling up and closing the modal.
    mockState = { selectedPark: PARK, travelTimes: new Map() };
    const { container } = render(ParkDetailModal);
    const modalContent = container.querySelector('.modal-content');
    await fireEvent.click(modalContent);
    expect(clearSelectedPark).not.toHaveBeenCalled();
  });
});
