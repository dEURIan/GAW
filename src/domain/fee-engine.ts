import { TIER_CONFIG, type SubscriptionTier } from './constants.js';
import { calculateMinimumWageFloor, roundToCents } from './wage-policy.js';

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number | null;
  reason?: string;
}

export interface SettlementInput {
  grossAmountPhp: number;
  estimatedHours: number;
  employerTier: SubscriptionTier;
  employeeTier: SubscriptionTier;
}

export interface SettlementBreakdown {
  grossAmountPhp: number;
  minimumRequiredPhp: number;
  employerFeePhp: number;
  employerTotalChargePhp: number;
  employeeFeePhp: number;
  workerNetPayoutPhp: number;
  platformRevenuePhp: number;
  feeProtectedByMinimumWageFloor: boolean;
}

/**
 * Checks whether an employer can post another active OPEN gig under their subscription tier.
 */
export function checkEmployerPostingQuota(
  tier: SubscriptionTier,
  currentOpenGigsCount: number,
): QuotaCheckResult {
  const limit = TIER_CONFIG[tier].maxActiveOpenGigs;
  if (!Number.isFinite(limit)) {
    return {
      allowed: true,
      currentCount: currentOpenGigsCount,
      limit: null,
    };
  }

  if (currentOpenGigsCount >= limit) {
    return {
      allowed: false,
      currentCount: currentOpenGigsCount,
      limit,
      reason: `FREE employer tier is limited to ${limit} active open gigs. Upgrade to PRO for unlimited listings.`,
    };
  }

  return {
    allowed: true,
    currentCount: currentOpenGigsCount,
    limit,
  };
}

/**
 * Checks whether an employee can add another gig to their desired list or active applications queue.
 */
export function checkEmployeeQueueQuota(
  tier: SubscriptionTier,
  currentQueueCount: number,
): QuotaCheckResult {
  const limit = TIER_CONFIG[tier].maxSavedOrActiveEmployeeGigs;
  if (!Number.isFinite(limit)) {
    return {
      allowed: true,
      currentCount: currentQueueCount,
      limit: null,
    };
  }

  if (currentQueueCount >= limit) {
    return {
      allowed: false,
      currentCount: currentQueueCount,
      limit,
      reason: `FREE employee tier is limited to ${limit} queued items. Upgrade to PRO for unlimited gigs.`,
    };
  }

  return {
    allowed: true,
    currentCount: currentQueueCount,
    limit,
  };
}

/**
 * Calculates transaction fees for employer and employee while strictly guaranteeing
 * that the worker's net payout never drops below the prorated Davao minimum wage floor.
 */
export function calculateSettlementBreakdown(
  input: SettlementInput,
): SettlementBreakdown {
  const floor = calculateMinimumWageFloor(input.estimatedHours);
  const grossAmountPhp = roundToCents(input.grossAmountPhp);

  if (!Number.isFinite(grossAmountPhp) || grossAmountPhp < floor.minimumRequiredPhp) {
    throw new RangeError(
      `grossAmountPhp (${grossAmountPhp}) cannot be below Davao minimum wage floor (${floor.minimumRequiredPhp})`,
    );
  }

  const employerRate = TIER_CONFIG[input.employerTier].employerFeeRate;
  const employeeRate = TIER_CONFIG[input.employeeTier].employeeFeeRate;

  const employerFeePhp = roundToCents(grossAmountPhp * employerRate);
  const employerTotalChargePhp = roundToCents(grossAmountPhp + employerFeePhp);

  const rawEmployeeFeePhp = roundToCents(grossAmountPhp * employeeRate);
  const maxAllowableEmployeeFeePhp = roundToCents(
    grossAmountPhp - floor.minimumRequiredPhp,
  );
  const employeeFeePhp = Math.min(rawEmployeeFeePhp, maxAllowableEmployeeFeePhp);

  const workerNetPayoutPhp = roundToCents(grossAmountPhp - employeeFeePhp);
  const platformRevenuePhp = roundToCents(employerFeePhp + employeeFeePhp);

  return {
    grossAmountPhp,
    minimumRequiredPhp: floor.minimumRequiredPhp,
    employerFeePhp,
    employerTotalChargePhp,
    employeeFeePhp,
    workerNetPayoutPhp,
    platformRevenuePhp,
    feeProtectedByMinimumWageFloor: rawEmployeeFeePhp > employeeFeePhp,
  };
}
