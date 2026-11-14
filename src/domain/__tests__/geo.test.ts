import { describe, expect, it } from 'vitest';
import {
  calculateHaversineDistanceKm,
  isWithinDavaoRegion,
} from '../geo.js';

describe('geo', () => {
  it('isWithinDavaoRegion accepts valid Davao City barangays and rejects outside bounds', () => {
    // Davao City Hall / Poblacion District
    expect(isWithinDavaoRegion(7.0644, 125.608)).toBe(true);
    // Toril District
    expect(isWithinDavaoRegion(7.0181, 125.4959)).toBe(true);
    // Manila (outside Davao Region)
    expect(isWithinDavaoRegion(14.5995, 120.9842)).toBe(false);
    // Out of longitude bounds
    expect(isWithinDavaoRegion(7.07, 126.0)).toBe(false);
    // Non-finite inputs
    expect(isWithinDavaoRegion(Number.NaN, 125.6)).toBe(false);
    expect(isWithinDavaoRegion(7.07, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('calculateHaversineDistanceKm computes zero for identical points and accurate Davao distances', () => {
    const cityHall = { lat: 7.0644, lng: 125.608 };
    const smEcoland = { lat: 7.0497, lng: 125.5885 };

    expect(calculateHaversineDistanceKm(cityHall, cityHall)).toBe(0);

    const distance = calculateHaversineDistanceKm(cityHall, smEcoland);
    expect(distance).toBeGreaterThan(2.5);
    expect(distance).toBeLessThan(3.0);
  });
});
