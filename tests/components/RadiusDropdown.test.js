// Component tests for RadiusDropdown.svelte.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

vi.mock('../../src/stores/searchStore.js', () => ({
  searchStore: {
    subscribe: vi.fn((cb) => {
      cb({ radiusMiles: 5 });
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

  it('calls setRadius with a number when selection changes', async () => {
    render(RadiusDropdown);
    const select = screen.getByRole('combobox');
    await fireEvent.change(select, { target: { value: '10' } });
    expect(setRadius).toHaveBeenCalledWith(10);
  });
});
