import {
  DAVAO_DAILY_MIN_WAGE_PHP,
  DAVAO_HOURLY_MIN_WAGE_PHP,
} from './constants.js';

export interface WageFloorResult {
  estimatedHours: number;
  hourlyFloorPhp: number;
  dailyMinimumWagePhp: number;
  minimumRequiredPhp: number;
}

export interface WageValidationResult extends WageFloorResult {
  isValid: boolean;
  offeredPricePhp: number;
  shortfallPhp: number;
}

/**
 * Rounds currency amounts in PHP to two decimal places (centavos).
 */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Computes the prorated Davao City (Region XI) minimum wage floor for a gig duration.
 */
export function calculateMinimumWageFloor(
  estimatedHours: number,
): WageFloorResult {
  if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
    throw new RangeError('estimatedHours must be a positive finite number');
  }

  return {
    estimatedHours,
    hourlyFloorPhp: DAVAO_HOURLY_MIN_WAGE_PHP,
    dailyMinimumWagePhp: DAVAO_DAILY_MIN_WAGE_PHP,
    minimumRequiredPhp: roundToCents(
      estimatedHours * DAVAO_HOURLY_MIN_WAGE_PHP,
    ),
  };
}

/**
 * Validates that an employer's offered price meets or exceeds the Davao prorated minimum wage.
 */
export function validateGigPrice(
  estimatedHours: number,
  offeredPricePhp: number,
): WageValidationResult {
  if (!Number.isFinite(offeredPricePhp) || offeredPricePhp < 0) {
    throw new RangeError('offeredPricePhp must be a non-negative finite number');
  }

  const floor = calculateMinimumWageFloor(estimatedHours);
  const roundedOffer = roundToCents(offeredPricePhp);
  const isValid = roundedOffer >= floor.minimumRequiredPhp;
  const shortfallPhp = isValid
    ? 0
    : roundToCents(floor.minimumRequiredPhp - roundedOffer);

  return {
    ...floor,
    isValid,
    offeredPricePhp: roundedOffer,
    shortfallPhp,
  };
}
