// Component tests for AmenityFilters.svelte.
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
  setFilters: vi.fn(),
}));

import AmenityFilters from '../../src/components/AmenityFilters.svelte';
import { setFilters } from '../../src/stores/searchStore.js';

describe('AmenityFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { selectedAmenities: [] };
  });

  it('renders a toggle button for each amenity in config', () => {
    render(AmenityFilters);
    // Config has playground, restroom, hiking-trail
    expect(screen.getByRole('button', { name: /playground/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restroom/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hiking trail/i })).toBeInTheDocument();
  });

  it('no button is active when selectedAmenities is empty', () => {
    render(AmenityFilters);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  it('active filter button has aria-pressed=true', () => {
    mockState = { selectedAmenities: ['playground'] };
    render(AmenityFilters);
    const playgroundBtn = screen.getByRole('button', { name: /playground/i });
    expect(playgroundBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking an inactive filter calls setFilters with it added', async () => {
    mockState = { selectedAmenities: [] };
    render(AmenityFilters);
    await fireEvent.click(screen.getByRole('button', { name: /playground/i }));
    expect(setFilters).toHaveBeenCalledWith(['playground']);
  });

  it('clicking an active filter calls setFilters with it removed', async () => {
    mockState = { selectedAmenities: ['playground', 'restroom'] };
    render(AmenityFilters);
    await fireEvent.click(screen.getByRole('button', { name: /playground/i }));
    expect(setFilters).toHaveBeenCalledWith(['restroom']);
  });
});
