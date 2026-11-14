import { describe, expect, it, vi } from 'vitest';
import {
  createGeminiPricingProvider,
  didFollowAiRecommendation,
  estimateGigPrice,
  estimateGigPriceWithAdvisor,
  getCategoryToolAllowancePhp,
  type ExternalPricingProvider,
} from '../pricing-advisor.js';
import type { GigCategory } from '../constants.js';

describe('pricing-advisor', () => {
  it('estimateGigPrice computes category, urgency, and capped skill premiums above minimum wage with legal and logical breakdown', () => {
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
    expect(standard.legalBasis).toContain('DOLE Region XI Wage Order No. RB-XI-22');
    expect(standard.logicalBasis).toContain('Fair market compensation');
    expect(standard.breakdown.baseWageFloorPhp).toBe(254);
    expect(standard.breakdown.toolAllowancePhp).toBeGreaterThan(0);
    expect(standard.breakdown.transportAllowancePhp).toBeGreaterThan(0);
    expect(standard.breakdown.urgencyPremiumPhp).toBe(0);

    const urgentCapped = estimateGigPrice({
      category: 'construction',
      estimatedHours: 8,
      urgency: 'urgent',
      requiredSkills: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    expect(urgentCapped.minimumWageFloorPhp).toBe(508);
    expect(urgentCapped.breakdown.toolAllowancePhp).toBe(100);
    expect(urgentCapped.breakdown.urgencyPremiumPhp).toBeGreaterThan(0);
    expect(urgentCapped.rationale).toContain('urgent +20%');
    expect(urgentCapped.rationale).toContain('skills premium +25%');

    // Test fallback category multiplier at floor and omitted requiredSkills
    const fallback = estimateGigPrice({
      category: 'custom_trade' as unknown as GigCategory,
      estimatedHours: 1,
      urgency: 'standard',
      requiredSkills: undefined as unknown as string[],
    });
    expect(fallback.recommendedPhp).toBe(63.5);
    expect(fallback.breakdown.skillPremiumPhp).toBe(0);
  });

  it('getCategoryToolAllowancePhp returns correct trade equipment allowance tiers', () => {
    expect(getCategoryToolAllowancePhp('plumbing')).toBe(100);
    expect(getCategoryToolAllowancePhp('electrical')).toBe(100);
    expect(getCategoryToolAllowancePhp('carpentry')).toBe(100);
    expect(getCategoryToolAllowancePhp('construction')).toBe(100);
    expect(getCategoryToolAllowancePhp('painting')).toBe(75);
    expect(getCategoryToolAllowancePhp('handyman')).toBe(75);
    expect(getCategoryToolAllowancePhp('cleaning')).toBe(50);
    expect(getCategoryToolAllowancePhp('delivery')).toBe(50);
    expect(getCategoryToolAllowancePhp('tutoring')).toBe(50);
    expect(getCategoryToolAllowancePhp('caregiving')).toBe(50);
    expect(getCategoryToolAllowancePhp('event_staff')).toBe(50);
    expect(getCategoryToolAllowancePhp('errands')).toBe(50);
    expect(getCategoryToolAllowancePhp('agri_harvest')).toBe(50);
    expect(getCategoryToolAllowancePhp('other')).toBe(50);
    expect(
      getCategoryToolAllowancePhp('unknown_trade' as unknown as GigCategory),
    ).toBe(50);
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
    expect(result.breakdown.baseWageFloorPhp).toBe(127);
  });

  it('estimateGigPriceWithAdvisor uses external provider, merges breakdown, and clamps outputs to minimum wage floor', async () => {
    const lowballProvider: ExternalPricingProvider = async () => ({
      suggestedMinPhp: 50,
      recommendedPhp: 100,
      suggestedMaxPhp: 120,
      rationale: 'LLM suggested low price',
      legalBasis: 'Custom Legal Basis',
      logicalBasis: 'Custom Logical Basis',
      breakdown: {
        skillPremiumPhp: 20,
        toolAllowancePhp: 10,
        transportAllowancePhp: 15,
        urgencyPremiumPhp: 0,
      },
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
    expect(clamped.legalBasis).toBe('Custom Legal Basis');
    expect(clamped.logicalBasis).toBe('Custom Logical Basis');
    expect(clamped.breakdown.skillPremiumPhp).toBe(20);
    expect(clamped.breakdown.toolAllowancePhp).toBe(10);
    expect(clamped.breakdown.transportAllowancePhp).toBe(15);
  });

  it('estimateGigPriceWithAdvisor handles provider with omitted breakdown fields and fallback texts', async () => {
    const sparseProvider: ExternalPricingProvider = async () => ({
      recommendedPhp: 500,
      suggestedMinPhp: 450,
      suggestedMaxPhp: 650,
      rationale: '',
      // legalBasis, logicalBasis, and breakdown omitted
    });

    const result = await estimateGigPriceWithAdvisor(
      {
        category: 'handyman',
        estimatedHours: 4,
        urgency: 'standard',
        requiredSkills: [],
      },
      sparseProvider,
    );

    expect(result.source).toBe('external_ai');
    expect(result.recommendedPhp).toBe(500);
    expect(result.legalBasis).toContain('DOLE Region XI Wage Order No. RB-XI-22');
    expect(result.logicalBasis).toContain('Fair market compensation');
    expect(result.breakdown.baseWageFloorPhp).toBe(254);
    expect(result.breakdown.toolAllowancePhp).toBeGreaterThan(0);
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
    expect(result.breakdown.baseWageFloorPhp).toBe(190.5);
  });

  it('createGeminiPricingProvider calls Gemini API with structured prompt and parses JSON response', async () => {
    const mockJson = {
      recommendedPhp: 650,
      suggestedMinPhp: 550,
      suggestedMaxPhp: 800,
      rationale: 'Gemini reasoning',
      legalBasis: 'DOLE Region XI RB-XI-22',
      logicalBasis: 'Skill + tools + transit',
      breakdown: {
        baseWageFloorPhp: 254,
        skillPremiumPhp: 200,
        toolAllowancePhp: 100,
        transportAllowancePhp: 96,
        urgencyPremiumPhp: 0,
      },
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockJson) }],
            },
          },
        ],
      }),
    });

    try {
      const provider = createGeminiPricingProvider({
        apiKey: 'test-key',
        model: 'gemini-3.5-flash',
        timeoutMs: 3000,
      });

      const result = await provider(
        {
          category: 'electrical',
          estimatedHours: 4,
          urgency: 'standard',
          requiredSkills: ['wiring'],
          title: 'Fix outlet',
          description: 'Living room outlet sparking',
          barangay: 'Bajada',
        },
        254,
      );

      expect(result.recommendedPhp).toBe(650);
      expect(result.suggestedMinPhp).toBe(550);
      expect(result.suggestedMaxPhp).toBe(800);
      expect(result.breakdown?.toolAllowancePhp).toBe(100);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('createGeminiPricingProvider handles default options and fallback fields when candidate JSON has omissions', async () => {
    const originalFetch = globalThis.fetch;
    // Minimal JSON with only recommendedPhp
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ recommendedPhp: 350 }) }],
            },
          },
        ],
      }),
    });

    try {
      const defaultProvider = createGeminiPricingProvider();
      const result = await defaultProvider(
        {
          category: 'cleaning',
          estimatedHours: 3,
          urgency: 'standard',
          requiredSkills: undefined as unknown as string[],
          title: undefined,
          description: undefined,
          barangay: undefined,
        },
        190.5,
      );

      expect(result.recommendedPhp).toBe(350);
      expect(result.suggestedMinPhp).toBe(350 * 0.9);
      expect(result.suggestedMaxPhp).toBe(350 * 1.25);
      expect(result.rationale).toBe('Gemini Pro AI labor pricing evaluation.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('createGeminiPricingProvider aborts on timeout', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((_url, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          reject(new Error('Operation aborted by timeout'));
        });
      });
    });

    try {
      const provider = createGeminiPricingProvider({
        apiKey: 'test-key',
        timeoutMs: 10,
      });

      await expect(
        provider(
          {
            category: 'plumbing',
            estimatedHours: 2,
            urgency: 'standard',
            requiredSkills: [],
          },
          127,
        ),
      ).rejects.toThrow('Operation aborted by timeout');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('createGeminiPricingProvider throws on HTTP error or invalid response', async () => {
    const originalFetch = globalThis.fetch;

    // HTTP 500 error
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    try {
      const provider = createGeminiPricingProvider({
        apiKey: 'test-key',
      });

      await expect(
        provider(
          {
            category: 'plumbing',
            estimatedHours: 2,
            urgency: 'standard',
            requiredSkills: [],
          },
          127,
        ),
      ).rejects.toThrow('Gemini API returned status 500');

      // Empty candidates
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [] }),
      });

      await expect(
        provider(
          {
            category: 'plumbing',
            estimatedHours: 2,
            urgency: 'standard',
            requiredSkills: [],
          },
          127,
        ),
      ).rejects.toThrow('Gemini API returned empty candidate text');

      // Sub-floor recommendation
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ recommendedPhp: 50 }) }],
              },
            },
          ],
        }),
      });

      await expect(
        provider(
          {
            category: 'plumbing',
            estimatedHours: 2,
            urgency: 'standard',
            requiredSkills: [],
          },
          127,
        ),
      ).rejects.toThrow('Gemini recommended price below statutory floor or invalid');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('didFollowAiRecommendation returns true only within the recommended band', () => {
    expect(didFollowAiRecommendation(300, 270, 375)).toBe(true);
    expect(didFollowAiRecommendation(270, 270, 375)).toBe(true);
    expect(didFollowAiRecommendation(375, 270, 375)).toBe(true);
    expect(didFollowAiRecommendation(260, 270, 375)).toBe(false);
    expect(didFollowAiRecommendation(400, 270, 375)).toBe(false);
  });
});
