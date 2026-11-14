import { describe, expect, it } from 'vitest';
import {
  didFollowAiRecommendation,
  estimateGigPrice,
  estimateGigPriceWithAdvisor,
  type ExternalPricingProvider,
} from '../pricing-advisor.js';

describe('pricing-advisor', () => {
  it('estimateGigPrice computes category, urgency, and capped skill premiums above minimum wage', () => {
    const standard = estimateGigPrice({
      category: 'cleaning',
      estimatedHours: 4,
      urgency: 'standard',
      requiredSkills: ['   ', 'sweeping'],
    });
    expect(standard.minimumWageFloorPhp).toBe(254);
    expect(standard.recommendedPhp).toBeGreaterThan(254);
    expect(standard.suggestedMinPhp).toBeGreaterThanOrEqual(254);
    expect(standard.suggestedMaxPhp).toBeGreaterThan(standard.recommendedPhp);
    expect(standard.source).toBe('heuristic');
    expect(standard.rationale).toContain('standard timing');

    const urgentCapped = estimateGigPrice({
      category: 'construction',
      estimatedHours: 8,
      urgency: 'urgent',
      requiredSkills: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    expect(urgentCapped.minimumWageFloorPhp).toBe(508);
    expect(urgentCapped.rationale).toContain('urgent +20%');
    expect(urgentCapped.rationale).toContain('skills premium +25%');
  });

  it('estimateGigPriceWithAdvisor uses heuristic when no provider is given', async () => {
    const result = await estimateGigPriceWithAdvisor({
      category: 'errands',
      estimatedHours: 2,
      urgency: 'standard',
      requiredSkills: [],
    });
    expect(result.source).toBe('heuristic');
    expect(result.minimumWageFloorPhp).toBe(127);
  });

  it('estimateGigPriceWithAdvisor uses external provider and clamps outputs to minimum wage floor', async () => {
    const lowballProvider: ExternalPricingProvider = async () => ({
      suggestedMinPhp: 50,
      recommendedPhp: 100,
      suggestedMaxPhp: 120,
      rationale: 'LLM suggested low price',
    });

    const clamped = await estimateGigPriceWithAdvisor(
      {
        category: 'delivery',
        estimatedHours: 4,
        urgency: 'standard',
        requiredSkills: [],
      },
      lowballProvider,
    );

    expect(clamped.source).toBe('external_ai');
    expect(clamped.minimumWageFloorPhp).toBe(254);
    expect(clamped.recommendedPhp).toBe(254);
    expect(clamped.suggestedMinPhp).toBe(254);
    expect(clamped.suggestedMaxPhp).toBe(254);
  });

  it('estimateGigPriceWithAdvisor falls back to heuristic when external provider throws', async () => {
    const failingProvider: ExternalPricingProvider = async () => {
      throw new Error('Upstream AI timeout');
    };

    const result = await estimateGigPriceWithAdvisor(
      {
        category: 'tutoring',
        estimatedHours: 3,
        urgency: 'urgent',
        requiredSkills: ['math'],
      },
      failingProvider,
    );

    expect(result.source).toBe('heuristic');
    expect(result.recommendedPhp).toBeGreaterThanOrEqual(190.5);
  });

  it('didFollowAiRecommendation returns true only within the recommended band', () => {
    expect(didFollowAiRecommendation(300, 270, 375)).toBe(true);
    expect(didFollowAiRecommendation(270, 270, 375)).toBe(true);
    expect(didFollowAiRecommendation(375, 270, 375)).toBe(true);
    expect(didFollowAiRecommendation(260, 270, 375)).toBe(false);
    expect(didFollowAiRecommendation(400, 270, 375)).toBe(false);
  });
});
