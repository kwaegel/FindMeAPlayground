// Component tests for RadiusDropdown.svelte.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

// Mutable state lets each test set a specific radiusMiles value before render.
let mockState = { radiusMiles: 5 };

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb(mockState);
      return () => {};
    }),
  },
  setRadius: vi.fn(),
}));

import RadiusDropdown from '../../src/components/RadiusDropdown.svelte';
import { setRadius } from '../../src/stores/searchStore.js';

describe('RadiusDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { radiusMiles: 5 };
  });

  it('renders a select element with 5, 10, 15 mile options', () => {
    render(RadiusDropdown);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    const values = options.map((o) => o.value);
    expect(values).toContain('5');
    expect(values).toContain('10');
    expect(values).toContain('15');
  });

  it('has 5 miles selected by default', () => {
    render(RadiusDropdown);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('5');
  });

  it('reflects non-default radiusMiles from store', () => {
    // The previous mock pattern always returned 5 — this test verifies the
    // dropdown actually binds to the store value rather than using an HTML default.
    mockState = { radiusMiles: 10 };
    render(RadiusDropdown);
    expect(screen.getByRole('combobox').value).toBe('10');
  });

  it('calls setRadius with a number when selection changes', async () => {
    render(RadiusDropdown);
    const select = screen.getByRole('combobox');
    await fireEvent.change(select, { target: { value: '10' } });
    expect(setRadius).toHaveBeenCalledWith(10);
  });
});
