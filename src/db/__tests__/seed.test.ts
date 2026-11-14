import { describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { GawRepository } from '../repository.js';
import { DAVAO_SEED_GIGS, DAVAO_SEED_USERS, seedDemoMarketplace } from '../seed.js';

describe('seedDemoMarketplace', () => {
  it('seeds Davao City employers, workers, minimum-wage-compliant gigs, and is idempotent', () => {
    const db = createDatabase();
    const repo = new GawRepository(db);

    const first = seedDemoMarketplace(repo);
    expect(first.usersSeeded).toBe(DAVAO_SEED_USERS.length);
    expect(first.gigsSeeded).toBe(DAVAO_SEED_GIGS.length);
    expect(repo.countGigs()).toBe(DAVAO_SEED_GIGS.length);
    expect(repo.countEmployeeSavedGigs('w-ramon')).toBe(1);

    for (const gigSpec of DAVAO_SEED_GIGS) {
      const stored = repo.getGigById(gigSpec.id);
      expect(stored).not.toBeNull();
      expect(stored!.offeredPricePhp).toBeGreaterThanOrEqual(stored!.minimumRequiredPhp);
    }

    // Re-running seedDemoMarketplace skips existing records cleanly
    const second = seedDemoMarketplace(repo);
    expect(second.usersSeeded).toBe(0);
    expect(second.gigsSeeded).toBe(0);

    db.close();
  });
});
