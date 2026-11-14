import {
  CATEGORY_HOURLY_MULTIPLIERS,
  type GigCategory,
  type UrgencyLevel,
} from './constants.js';
import { calculateMinimumWageFloor, roundToCents } from './wage-policy.js';

export interface PricingEstimateInput {
  category: GigCategory;
  estimatedHours: number;
  urgency: UrgencyLevel;
  requiredSkills: string[];
}

export interface PricingEstimateResult {
  minimumWageFloorPhp: number;
  suggestedMinPhp: number;
  recommendedPhp: number;
  suggestedMaxPhp: number;
  hourlyRateRecommendedPhp: number;
  source: 'heuristic' | 'external_ai';
  rationale: string;
}

export type ExternalPricingProvider = (
  input: PricingEstimateInput,
  minimumWageFloorPhp: number,
) => Promise<{
  recommendedPhp: number;
  suggestedMinPhp: number;
  suggestedMaxPhp: number;
  rationale: string;
}>;

/**
 * Deterministic Davao market-rate pricing engine that guarantees output stays above minimum wage.
 */
export function estimateGigPrice(
  input: PricingEstimateInput,
): PricingEstimateResult {
  const floor = calculateMinimumWageFloor(input.estimatedHours);
  const categoryMultiplier = CATEGORY_HOURLY_MULTIPLIERS[input.category];
  const urgencyMultiplier = input.urgency === 'urgent' ? 1.2 : 1.0;
  const normalizedSkills = input.requiredSkills
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const skillPremium = Math.min(0.25, normalizedSkills.length * 0.05);

  const baseMarketPhp =
    floor.minimumRequiredPhp *
    categoryMultiplier *
    urgencyMultiplier *
    (1 + skillPremium);

  const recommendedPhp = roundToCents(
    Math.max(floor.minimumRequiredPhp, baseMarketPhp),
  );
  const suggestedMinPhp = roundToCents(
    Math.max(floor.minimumRequiredPhp, recommendedPhp * 0.9),
  );
  const suggestedMaxPhp = roundToCents(recommendedPhp * 1.25);
  const hourlyRateRecommendedPhp = roundToCents(
    recommendedPhp / input.estimatedHours,
  );

  const rationale = [
    `Davao Region XI floor ₱${floor.minimumRequiredPhp.toFixed(2)} (${input.estimatedHours}h × ₱${floor.hourlyFloorPhp.toFixed(2)}/hr)`,
    `${input.category} market factor ${categoryMultiplier.toFixed(2)}×`,
    input.urgency === 'urgent' ? 'urgent +20%' : 'standard timing',
    `skills premium +${Math.round(skillPremium * 100)}%`,
  ].join('; ');

  return {
    minimumWageFloorPhp: floor.minimumRequiredPhp,
    suggestedMinPhp,
    recommendedPhp,
    suggestedMaxPhp,
    hourlyRateRecommendedPhp,
    source: 'heuristic',
    rationale,
  };
}

/**
 * Pluggable AI pricing wrapper: queries an external LLM provider when supplied and falls back safely
 * to the deterministic Davao heuristic engine if the provider throws, clamping all prices to the floor.
 */
export async function estimateGigPriceWithAdvisor(
  input: PricingEstimateInput,
  provider?: ExternalPricingProvider,
): Promise<PricingEstimateResult> {
  const heuristic = estimateGigPrice(input);
  if (!provider) {
    return heuristic;
  }

  try {
    const external = await provider(input, heuristic.minimumWageFloorPhp);
    const recommendedPhp = roundToCents(
      Math.max(heuristic.minimumWageFloorPhp, external.recommendedPhp),
    );
    const suggestedMinPhp = roundToCents(
      Math.max(
        heuristic.minimumWageFloorPhp,
        Math.min(recommendedPhp, external.suggestedMinPhp),
      ),
    );
    const suggestedMaxPhp = roundToCents(
      Math.max(recommendedPhp, external.suggestedMaxPhp),
    );

    return {
      minimumWageFloorPhp: heuristic.minimumWageFloorPhp,
      suggestedMinPhp,
      recommendedPhp,
      suggestedMaxPhp,
      hourlyRateRecommendedPhp: roundToCents(
        recommendedPhp / input.estimatedHours,
      ),
      source: 'external_ai',
      rationale: external.rationale,
    };
  } catch {
    return heuristic;
  }
}

/**
 * Records whether an employer's offered price aligns within the AI-recommended band.
 */
export function didFollowAiRecommendation(
  offeredPricePhp: number,
  suggestedMinPhp: number,
  suggestedMaxPhp: number,
): boolean {
  return (
    offeredPricePhp >= suggestedMinPhp && offeredPricePhp <= suggestedMaxPhp
  );
}
