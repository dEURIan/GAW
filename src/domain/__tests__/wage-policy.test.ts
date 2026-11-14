import { describe, expect, it } from 'vitest';
import {
  calculateMinimumWageFloor,
  roundToCents,
  validateGigPrice,
} from '../wage-policy.js';

describe('wage-policy', () => {
  it('roundToCents rounds floating point values cleanly to two decimals', () => {
    expect(roundToCents(100.005)).toBe(100.01);
    expect(roundToCents(254.0)).toBe(254);
  });

  it('calculateMinimumWageFloor computes Davao Region XI prorated hourly floor', () => {
    const fourHours = calculateMinimumWageFloor(4);
    expect(fourHours).toEqual({
      estimatedHours: 4,
      hourlyFloorPhp: 63.5,
      dailyMinimumWagePhp: 508,
      minimumRequiredPhp: 254,
    });

    const eightHours = calculateMinimumWageFloor(8);
    expect(eightHours.minimumRequiredPhp).toBe(508);
  });

  it('calculateMinimumWageFloor rejects non-positive or non-finite hours', () => {
    expect(() => calculateMinimumWageFloor(0)).toThrow(RangeError);
    expect(() => calculateMinimumWageFloor(-2)).toThrow(RangeError);
    expect(() => calculateMinimumWageFloor(Number.NaN)).toThrow(RangeError);
    expect(() => calculateMinimumWageFloor(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });

  it('validateGigPrice accepts prices equal to or above floor and rejects prices below floor', () => {
    const exact = validateGigPrice(4, 254);
    expect(exact.isValid).toBe(true);
    expect(exact.shortfallPhp).toBe(0);

    const above = validateGigPrice(4, 350);
    expect(above.isValid).toBe(true);
    expect(above.shortfallPhp).toBe(0);

    const below = validateGigPrice(4, 253.99);
    expect(below.isValid).toBe(false);
    expect(below.minimumRequiredPhp).toBe(254);
    expect(below.shortfallPhp).toBe(0.01);
  });

  it('validateGigPrice rejects negative or non-finite prices', () => {
    expect(() => validateGigPrice(4, -10)).toThrow(RangeError);
    expect(() => validateGigPrice(4, Number.NaN)).toThrow(RangeError);
  });
});
