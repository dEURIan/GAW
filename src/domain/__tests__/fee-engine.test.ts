import { describe, expect, it } from 'vitest';
import {
  calculateSettlementBreakdown,
  checkEmployeeQueueQuota,
  checkEmployerPostingQuota,
} from '../fee-engine.js';

describe('fee-engine', () => {
  it('checkEmployerPostingQuota enforces FREE limit of 3 and unlimited PRO', () => {
    expect(checkEmployerPostingQuota('FREE', 2)).toEqual({
      allowed: true,
      currentCount: 2,
      limit: 3,
    });

    const blocked = checkEmployerPostingQuota('FREE', 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.limit).toBe(3);
    expect(blocked.reason).toContain('FREE employer tier');

    expect(checkEmployerPostingQuota('PRO', 50)).toEqual({
      allowed: true,
      currentCount: 50,
      limit: null,
    });
  });

  it('checkEmployeeQueueQuota enforces FREE limit of 5 and unlimited PRO', () => {
    expect(checkEmployeeQueueQuota('FREE', 4)).toEqual({
      allowed: true,
      currentCount: 4,
      limit: 5,
    });

    const blocked = checkEmployeeQueueQuota('FREE', 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.limit).toBe(5);
    expect(blocked.reason).toContain('FREE employee tier');

    expect(checkEmployeeQueueQuota('PRO', 100)).toEqual({
      allowed: true,
      currentCount: 100,
      limit: null,
    });
  });

  it('calculateSettlementBreakdown computes FREE and PRO fees accurately', () => {
    // 4h minimum floor = 254 PHP; gross = 400 PHP allows full 5% (20 PHP) deduction -> net 380 >= 254
    const freePair = calculateSettlementBreakdown({
      grossAmountPhp: 400,
      estimatedHours: 4,
      employerTier: 'FREE',
      employeeTier: 'FREE',
    });
    expect(freePair).toEqual({
      grossAmountPhp: 400,
      minimumRequiredPhp: 254,
      employerFeePhp: 20,
      employerTotalChargePhp: 420,
      employeeFeePhp: 20,
      workerNetPayoutPhp: 380,
      platformRevenuePhp: 40,
      feeProtectedByMinimumWageFloor: false,
    });

    const proPair = calculateSettlementBreakdown({
      grossAmountPhp: 400,
      estimatedHours: 4,
      employerTier: 'PRO',
      employeeTier: 'PRO',
    });
    expect(proPair).toEqual({
      grossAmountPhp: 400,
      minimumRequiredPhp: 254,
      employerFeePhp: 8,
      employerTotalChargePhp: 408,
      employeeFeePhp: 0,
      workerNetPayoutPhp: 400,
      platformRevenuePhp: 8,
      feeProtectedByMinimumWageFloor: false,
    });
  });

  it('calculateSettlementBreakdown caps employee fee to protect statutory minimum wage', () => {
    // Priced exactly at floor (254 PHP for 4h): employee fee must be capped to 0
    const atFloor = calculateSettlementBreakdown({
      grossAmountPhp: 254,
      estimatedHours: 4,
      employerTier: 'FREE',
      employeeTier: 'FREE',
    });
    expect(atFloor.employeeFeePhp).toBe(0);
    expect(atFloor.workerNetPayoutPhp).toBe(254);
    expect(atFloor.feeProtectedByMinimumWageFloor).toBe(true);
    expect(atFloor.employerFeePhp).toBe(12.7);
    expect(atFloor.platformRevenuePhp).toBe(12.7);

    // Slightly above floor (260 PHP): 5% would be 13 PHP (net 247 < 254), capped to 6 PHP (net 254)
    const partialCap = calculateSettlementBreakdown({
      grossAmountPhp: 260,
      estimatedHours: 4,
      employerTier: 'FREE',
      employeeTier: 'FREE',
    });
    expect(partialCap.employeeFeePhp).toBe(6);
    expect(partialCap.workerNetPayoutPhp).toBe(254);
    expect(partialCap.feeProtectedByMinimumWageFloor).toBe(true);
  });

  it('calculateSettlementBreakdown throws if grossAmountPhp is below minimum wage floor or non-finite', () => {
    expect(() =>
      calculateSettlementBreakdown({
        grossAmountPhp: 250,
        estimatedHours: 4,
        employerTier: 'FREE',
        employeeTier: 'FREE',
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSettlementBreakdown({
        grossAmountPhp: Number.NaN,
        estimatedHours: 4,
        employerTier: 'FREE',
        employeeTier: 'FREE',
      }),
    ).toThrow(RangeError);
  });
});
