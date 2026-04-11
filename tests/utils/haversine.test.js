// Unit tests for the Haversine distance utility.
import { describe, it, expect } from 'vitest';
import { haversineDistance } from '../../src/utils/haversine.js';

describe('haversineDistance()', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(38.895, -77.036, 38.895, -77.036)).toBe(0);
  });

  it('calculates approximately correct distance between two known points', () => {
    // Two points ~0.4 miles apart in Arlington, VA — the assertion bounds
    // match the actual coordinate separation, not the comment that was here
    // before which erroneously said "3.7 miles".
    const dist = haversineDistance(38.895, -77.036, 38.889, -77.035);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(1); // ~0.4 miles apart
  });

  it('calculates ~2,451 miles between Los Angeles and New York', () => {
    // Known great-circle distance: ~2,451 miles
    const dist = haversineDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(dist).toBeGreaterThan(2400);
    expect(dist).toBeLessThan(2500);
  });

  it('returns a positive number for any two different points', () => {
    const dist = haversineDistance(38.0, -77.0, 39.0, -78.0);
    expect(dist).toBeGreaterThan(0);
  });

  it('is symmetric — distance A→B equals distance B→A', () => {
    // A coordinate-order bug (e.g. swapping lat/lon) would produce a different
    // value in each direction because longitude spans are wider than latitude spans.
    const ab = haversineDistance(34.0522, -118.2437, 40.7128, -74.006);
    const ba = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(ab).toBeCloseTo(ba, 5);
  });
});
