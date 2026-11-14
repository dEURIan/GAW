import { describe, expect, it } from 'vitest';
import { calculateSettlementBreakdown } from '../../domain/fee-engine.js';
import { createDatabase } from '../database.js';
import { GawRepository } from '../repository.js';

describe('GawRepository', () => {
  it('creates, fetches, and updates user tiers', () => {
    const db = createDatabase();
    const repo = new GawRepository(db);

    expect(repo.getUserById('missing-user')).toBeNull();
    expect(repo.updateUserTier('missing-user', 'PRO')).toBeNull();

    const employer = repo.createUser({
      name: 'Juan Dela Cruz',
      role: 'employer',
      tier: 'FREE',
      barangay: 'Poblacion District',
      lat: 7.0644,
      lng: 125.608,
    });

    expect(repo.getUserById(employer.id)).toEqual(employer);

    const upgraded = repo.updateUserTier(employer.id, 'PRO');
    expect(upgraded?.tier).toBe('PRO');
    db.close();
  });

  it('rolls back database changes when runInTransaction throws', () => {
    const db = createDatabase();
    const repo = new GawRepository(db);

    expect(() =>
      repo.runInTransaction(() => {
        repo.createUser({
          name: 'Temp User',
          role: 'employee',
          tier: 'FREE',
          barangay: 'Matina',
          lat: 7.055,
          lng: 125.59,
        });
        throw new Error('Abort transaction');
      }),
    ).toThrow('Abort transaction');

    const row = db.prepare('SELECT COUNT(*) AS count FROM users').get() as {
      count: number;
    };
    expect(row.count).toBe(0);
    db.close();
  });

  it('creates gigs and lists nearby open gigs sorted by distance, PRO boost, and recency', () => {
    const db = createDatabase();
    const repo = new GawRepository(db);

    expect(repo.getGigById('missing-gig')).toBeNull();

    const freeEmp = repo.createUser({
      name: 'Free Employer',
      role: 'employer',
      tier: 'FREE',
      barangay: 'Poblacion',
      lat: 7.0644,
      lng: 125.608,
    });

    const proEmp = repo.createUser({
      name: 'Pro Employer',
      role: 'employer',
      tier: 'PRO',
      barangay: 'Poblacion',
      lat: 7.0644,
      lng: 125.608,
    });

    // At worker origin (0 km) - Free employer posted first
    const freeGigAtOrigin = repo.createGig({
      employerId: freeEmp.id,
      title: 'Office Sweep',
      description: 'Sweep retail store',
      category: 'cleaning',
      estimatedHours: 4,
      offeredPricePhp: 300,
      minimumRequiredPhp: 254,
      aiRecommendedPhp: 300,
      followedAiRecommendation: true,
      urgency: 'standard',
      barangay: 'Poblacion',
      lat: 7.0644,
      lng: 125.608,
    });

    // At worker origin (0 km) - Pro employer posted second (should outrank Free employer at 0 km)
    const proGigAtOrigin = repo.createGig({
      employerId: proEmp.id,
      title: 'Storefront Cleanup',
      description: 'Clean storefront glass',
      category: 'cleaning',
      estimatedHours: 4,
      offeredPricePhp: 350,
      minimumRequiredPhp: 254,
      aiRecommendedPhp: 320,
      followedAiRecommendation: false,
      urgency: 'urgent',
      barangay: 'Poblacion',
      lat: 7.0644,
      lng: 125.608,
    });

    // Second Pro gig at identical coordinates (testing createdAt tie-breaker)
    const secondProGigAtOrigin = repo.createGig({
      employerId: proEmp.id,
      title: 'Late Shift Helper',
      description: 'Pack orders',
      category: 'cleaning',
      estimatedHours: 4,
      offeredPricePhp: 400,
      minimumRequiredPhp: 254,
      aiRecommendedPhp: 350,
      followedAiRecommendation: true,
      urgency: 'standard',
      barangay: 'Poblacion',
      lat: 7.0644,
      lng: 125.608,
    });

    // Farther gig (~2.6 km away in Matina)
    const matinaGig = repo.createGig({
      employerId: freeEmp.id,
      title: 'Parcel Runner',
      description: 'Deliver documents',
      category: 'delivery',
      estimatedHours: 3,
      offeredPricePhp: 250,
      minimumRequiredPhp: 190.5,
      aiRecommendedPhp: 230,
      followedAiRecommendation: true,
      urgency: 'standard',
      barangay: 'Matina',
      lat: 7.0497,
      lng: 125.5885,
    });

    // Very far gig (~13 km away in Toril, outside 5km radius)
    repo.createGig({
      employerId: freeEmp.id,
      title: 'Toril Yard Clearing',
      description: 'Clear garden debris',
      category: 'cleaning',
      estimatedHours: 5,
      offeredPricePhp: 400,
      minimumRequiredPhp: 317.5,
      aiRecommendedPhp: 380,
      followedAiRecommendation: true,
      urgency: 'standard',
      barangay: 'Toril',
      lat: 7.0181,
      lng: 125.4959,
    });

    expect(repo.countEmployerOpenGigs(freeEmp.id)).toBe(3);
    expect(repo.getGigById(freeGigAtOrigin.id)?.followedAiRecommendation).toBe(
      true,
    );
    expect(repo.getGigById(proGigAtOrigin.id)?.followedAiRecommendation).toBe(
      false,
    );

    const nearby = repo.listNearbyOpenGigs({
      lat: 7.0644,
      lng: 125.608,
      radiusKm: 5,
      limit: 10,
    });
    expect(nearby).toHaveLength(4);
    expect(nearby[0].employerTier).toBe('PRO');
    expect(nearby[1].employerTier).toBe('PRO');
    expect(nearby[2].id).toBe(freeGigAtOrigin.id);
    expect(nearby[3].id).toBe(matinaGig.id);
    expect([proGigAtOrigin.id, secondProGigAtOrigin.id]).toContain(nearby[0].id);

    const filtered = repo.listNearbyOpenGigs({
      lat: 7.0644,
      lng: 125.608,
      radiusKm: 5,
      category: 'cleaning',
      minPayPhp: 350,
      limit: 1,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].offeredPricePhp).toBeGreaterThanOrEqual(350);
    db.close();
  });

  it('manages employee desired gigs queue, applications, acceptance, and completion settlements', () => {
    const db = createDatabase();
    const repo = new GawRepository(db);

    const employer = repo.createUser({
      name: 'Employer One',
      role: 'employer',
      tier: 'FREE',
      barangay: 'Poblacion',
      lat: 7.0644,
      lng: 125.608,
    });
    const workerA = repo.createUser({
      name: 'Worker A',
      role: 'employee',
      tier: 'FREE',
      barangay: 'Poblacion',
      lat: 7.0644,
      lng: 125.608,
    });
    const workerB = repo.createUser({
      name: 'Worker B',
      role: 'employee',
      tier: 'PRO',
      barangay: 'Buhangin',
      lat: 7.11,
      lng: 125.62,
    });

    const nearGig = repo.createGig({
      employerId: employer.id,
      title: 'Near Gig',
      description: 'Near Poblacion',
      category: 'errands',
      estimatedHours: 4,
      offeredPricePhp: 254,
      minimumRequiredPhp: 254,
      aiRecommendedPhp: 280,
      followedAiRecommendation: false,
      urgency: 'standard',
      barangay: 'Poblacion',
      lat: 7.065,
      lng: 125.6085,
    });
    const sameDistNearGig = repo.createGig({
      employerId: employer.id,
      title: 'Second Near Gig',
      description: 'Same spot',
      category: 'errands',
      estimatedHours: 4,
      offeredPricePhp: 300,
      minimumRequiredPhp: 254,
      aiRecommendedPhp: 300,
      followedAiRecommendation: true,
      urgency: 'standard',
      barangay: 'Poblacion',
      lat: 7.065,
      lng: 125.6085,
    });
    const farGig = repo.createGig({
      employerId: employer.id,
      title: 'Far Gig',
      description: 'In Buhangin',
      category: 'delivery',
      estimatedHours: 4,
      offeredPricePhp: 400,
      minimumRequiredPhp: 254,
      aiRecommendedPhp: 400,
      followedAiRecommendation: true,
      urgency: 'standard',
      barangay: 'Buhangin',
      lat: 7.11,
      lng: 125.62,
    });

    expect(repo.hasSavedGig(workerA.id, farGig.id)).toBe(false);
    repo.saveGigForEmployee({
      employeeId: workerA.id,
      gigId: farGig.id,
      note: 'Good payout',
    });
    repo.saveGigForEmployee({
      employeeId: workerA.id,
      gigId: nearGig.id,
      note: 'Walking distance',
    });
    repo.saveGigForEmployee({
      employeeId: workerA.id,
      gigId: sameDistNearGig.id,
      note: 'Also walking distance',
    });

    expect(repo.hasSavedGig(workerA.id, farGig.id)).toBe(true);
    expect(repo.countEmployeeSavedGigs(workerA.id)).toBe(3);

    const saved = repo.listSavedGigsForEmployee(workerA.id, {
      lat: workerA.lat,
      lng: workerA.lng,
    });
    expect(saved).toHaveLength(3);
    expect(saved[0].distanceKm).toBeLessThan(saved[2].distanceKm);
    expect(saved[2].gigId).toBe(farGig.id);

    expect(repo.removeSavedGigForEmployee(workerA.id, farGig.id)).toBe(true);
    expect(repo.removeSavedGigForEmployee(workerA.id, farGig.id)).toBe(false);

    expect(repo.hasAppliedToGig(nearGig.id, workerA.id)).toBe(false);
    expect(repo.getApplicationById('missing-app')).toBeNull();

    const appA = repo.applyToGig({
      gigId: nearGig.id,
      employeeId: workerA.id,
      message: 'Ready today',
    });
    const appB = repo.applyToGig({
      gigId: nearGig.id,
      employeeId: workerB.id,
      message: 'On my way',
    });

    expect(repo.hasAppliedToGig(nearGig.id, workerA.id)).toBe(true);
    expect(repo.countEmployeeActiveApplications(workerA.id)).toBe(1);
    expect(repo.listGigApplications(nearGig.id)).toHaveLength(2);

    const accepted = repo.acceptGigApplication(
      nearGig.id,
      appA.id,
      workerA.id,
    );
    expect(accepted.gig.status).toBe('ASSIGNED');
    expect(accepted.gig.assignedEmployeeId).toBe(workerA.id);
    expect(accepted.application.status).toBe('ACCEPTED');
    expect(repo.getApplicationById(appB.id)?.status).toBe('REJECTED');

    const protectedBreakdown = calculateSettlementBreakdown({
      grossAmountPhp: nearGig.offeredPricePhp,
      estimatedHours: nearGig.estimatedHours,
      employerTier: employer.tier,
      employeeTier: workerA.tier,
    });
    const completedNear = repo.completeGig({
      gigId: nearGig.id,
      employerId: employer.id,
      employeeId: workerA.id,
      breakdown: protectedBreakdown,
    });
    expect(completedNear.gig.status).toBe('COMPLETED');
    expect(completedNear.transaction.feeProtectedByMinimumWageFloor).toBe(true);

    // Also test unprotected fee transaction mapping
    const appB2 = repo.applyToGig({
      gigId: farGig.id,
      employeeId: workerA.id,
      message: 'Will take bus',
    });
    repo.acceptGigApplication(farGig.id, appB2.id, workerA.id);
    const normalBreakdown = calculateSettlementBreakdown({
      grossAmountPhp: farGig.offeredPricePhp,
      estimatedHours: farGig.estimatedHours,
      employerTier: employer.tier,
      employeeTier: workerA.tier,
    });
    const completedFar = repo.completeGig({
      gigId: farGig.id,
      employerId: employer.id,
      employeeId: workerA.id,
      breakdown: normalBreakdown,
    });
    expect(completedFar.transaction.feeProtectedByMinimumWageFloor).toBe(false);

    const employerTx = repo.listTransactionsForUser(employer.id);
    const workerTx = repo.listTransactionsForUser(workerA.id);
    expect(employerTx).toHaveLength(2);
    expect(workerTx).toHaveLength(2);

    db.close();
  });
});
