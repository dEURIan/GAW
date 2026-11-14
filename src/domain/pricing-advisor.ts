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
  title?: string;
  description?: string;
  barangay?: string;
}

export interface PricingBreakdown {
  baseWageFloorPhp: number;
  skillPremiumPhp: number;
  toolAllowancePhp: number;
  transportAllowancePhp: number;
  urgencyPremiumPhp: number;
}

export interface PricingEstimateResult {
  minimumWageFloorPhp: number;
  suggestedMinPhp: number;
  recommendedPhp: number;
  suggestedMaxPhp: number;
  hourlyRateRecommendedPhp: number;
  source: 'heuristic' | 'external_ai';
  legalBasis: string;
  logicalBasis: string;
  rationale: string;
  breakdown: PricingBreakdown;
}

export type ExternalPricingProvider = (
  input: PricingEstimateInput,
  minimumWageFloorPhp: number,
) => Promise<{
  recommendedPhp: number;
  suggestedMinPhp: number;
  suggestedMaxPhp: number;
  rationale: string;
  legalBasis?: string;
  logicalBasis?: string;
  breakdown?: Partial<PricingBreakdown>;
}>;

/**
 * Standard equipment wear-and-tear allowance ceiling by trade category for Davao gig workers.
 */
export function getCategoryToolAllowancePhp(category: GigCategory): number {
  switch (category) {
    case 'plumbing':
    case 'electrical':
    case 'carpentry':
    case 'construction':
      return 100;
    case 'painting':
    case 'handyman':
      return 75;
    case 'cleaning':
    case 'delivery':
    case 'tutoring':
    case 'caregiving':
    case 'event_staff':
    case 'errands':
    case 'agri_harvest':
    case 'other':
    default:
      return 50;
  }
}

export const DAVAO_STANDARD_TRANSIT_ALLOWANCE_PHP = 75;

/**
 * Deterministic Davao market-rate pricing engine that guarantees output stays above minimum wage
 * and produces an itemized breakdown with full legal and logical foundations.
 */
export function estimateGigPrice(
  input: PricingEstimateInput,
): PricingEstimateResult {
  const floor = calculateMinimumWageFloor(input.estimatedHours);
  const baseWageFloorPhp = floor.minimumRequiredPhp;

  const categoryMultiplier = CATEGORY_HOURLY_MULTIPLIERS[input.category] ?? 1.0;
  const urgencyMultiplier = input.urgency === 'urgent' ? 1.2 : 1.0;
  const normalizedSkills = (input.requiredSkills || [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const skillPremium = Math.min(0.25, normalizedSkills.length * 0.05);

  const baseMarketPhp =
    baseWageFloorPhp *
    categoryMultiplier *
    urgencyMultiplier *
    (1 + skillPremium);

  const recommendedPhp = roundToCents(
    Math.max(baseWageFloorPhp, baseMarketPhp),
  );
  const suggestedMinPhp = roundToCents(
    Math.max(baseWageFloorPhp, recommendedPhp * 0.9),
  );
  const suggestedMaxPhp = roundToCents(recommendedPhp * 1.25);
  const hourlyRateRecommendedPhp = roundToCents(
    recommendedPhp / input.estimatedHours,
  );

  // Decompose recommended rate into transparent legal & logical components
  let urgencyPremiumPhp = 0;
  let toolAllowancePhp = 0;
  let transportAllowancePhp = 0;
  let skillPremiumPhp = 0;

  if (recommendedPhp > baseWageFloorPhp) {
    if (input.urgency === 'urgent') {
      urgencyPremiumPhp = roundToCents(recommendedPhp - recommendedPhp / 1.2);
    }
    const netMargin = Math.max(
      0,
      roundToCents(recommendedPhp - baseWageFloorPhp - urgencyPremiumPhp),
    );
    const maxTool = getCategoryToolAllowancePhp(input.category);
    toolAllowancePhp = roundToCents(Math.min(maxTool, netMargin * 0.35));
    transportAllowancePhp = roundToCents(
      Math.min(DAVAO_STANDARD_TRANSIT_ALLOWANCE_PHP, netMargin * 0.25),
    );
    skillPremiumPhp = roundToCents(
      Math.max(0, netMargin - toolAllowancePhp - transportAllowancePhp),
    );
  }

  const breakdown: PricingBreakdown = {
    baseWageFloorPhp,
    skillPremiumPhp,
    toolAllowancePhp,
    transportAllowancePhp,
    urgencyPremiumPhp,
  };

  const legalBasis = `DOLE Region XI Wage Order No. RB-XI-22 mandates ₱508.00 per 8-hour workday (₱${floor.hourlyFloorPhp.toFixed(2)}/hr). The statutory non-negotiable floor for ${input.estimatedHours}h is ₱${baseWageFloorPhp.toFixed(2)}.`;

  const logicalBasis = `Fair market compensation calculated under Davao labor standards: base statutory floor (₱${baseWageFloorPhp.toFixed(2)}), specialized ${input.category} skill premium (₱${skillPremiumPhp.toFixed(2)}), worker-supplied equipment allowance (₱${toolAllowancePhp.toFixed(2)}), and intra-city travel allowance (₱${transportAllowancePhp.toFixed(2)})${urgencyPremiumPhp > 0 ? ` plus urgent dispatch surcharge (₱${urgencyPremiumPhp.toFixed(2)})` : ''}.`;

  const rationale = [
    `Davao Region XI floor ₱${baseWageFloorPhp.toFixed(2)} (${input.estimatedHours}h × ₱${floor.hourlyFloorPhp.toFixed(2)}/hr)`,
    `${input.category} factor ${categoryMultiplier.toFixed(2)}×`,
    input.urgency === 'urgent' ? 'urgent +20%' : 'standard timing',
    `skills premium +${Math.round(skillPremium * 100)}%`,
    `tools allowance ₱${toolAllowancePhp}`,
    `transit allowance ₱${transportAllowancePhp}`,
  ].join('; ');

  return {
    minimumWageFloorPhp: baseWageFloorPhp,
    suggestedMinPhp,
    recommendedPhp,
    suggestedMaxPhp,
    hourlyRateRecommendedPhp,
    source: 'heuristic',
    legalBasis,
    logicalBasis,
    rationale,
    breakdown,
  };
}

/**
 * Creates an external pricing provider backed by Google Gemini (Google Pro Account / Gemini 3.5 Flash).
 */
export function createGeminiPricingProvider(options?: {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}): ExternalPricingProvider {
  const apiKey =
    options?.apiKey ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    '';
  const model = options?.model ?? process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
  const timeoutMs = options?.timeoutMs ?? 7000;

  return async (input, minimumWageFloorPhp) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const prompt = `
You are the official GAW (Gawa Agad Work) Labor Pricing Advisor for Davao City (Region XI), Philippines.
Evaluate and calculate the fair market pricing for the following gig request:
- Gig Title: ${input.title || 'Standard Gig'}
- Category: ${input.category}
- Estimated Hours: ${input.estimatedHours}
- Urgency: ${input.urgency}
- Required Skills: ${JSON.stringify(input.requiredSkills || [])}
- Location / Barangay: ${input.barangay || 'Davao City'}
- Scope Description: ${input.description || 'Standard task scope'}

LEGAL BASIS REQUIREMENTS:
- DOLE Region XI Wage Order No. RB-XI-22 mandates ₱508.00 per 8-hour workday (₱63.50/hour).
- For ${input.estimatedHours} hours, the absolute statutory minimum legal wage floor is ₱${minimumWageFloorPhp.toFixed(2)}.
- Under Philippine labor law, paying or offering below this statutory floor is strictly illegal.

LOGICAL BASIS REQUIREMENTS:
- Pricing must be itemized into logical economic components:
  1. Base Statutory Floor: ₱${minimumWageFloorPhp.toFixed(2)}
  2. Skill & Trade Specialization Premium (diagnostic expertise, hazard, trade complexity)
  3. Worker Tools & Consumables Allowance (PPE, hand/power tools depreciation)
  4. Davao Intra-City Commute / Transit Allowance (local jeepney/motorcycle transport offset)
  5. Urgency Surcharge (+20% for immediate same-day dispatch, 0 if standard)

Return JSON strictly matching this schema:
{
  "recommendedPhp": number,
  "suggestedMinPhp": number,
  "suggestedMaxPhp": number,
  "breakdown": {
    "baseWageFloorPhp": number,
    "skillPremiumPhp": number,
    "toolAllowancePhp": number,
    "transportAllowancePhp": number,
    "urgencyPremiumPhp": number
  },
  "legalBasis": string,
  "logicalBasis": string,
  "rationale": string
}
All prices must be valid numbers in Philippine Pesos (PHP). recommendedPhp must be >= ₱${minimumWageFloorPhp.toFixed(2)}.
`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini API returned empty candidate text');
      }

      const parsed = JSON.parse(rawText) as {
        recommendedPhp?: number;
        suggestedMinPhp?: number;
        suggestedMaxPhp?: number;
        rationale?: string;
        legalBasis?: string;
        logicalBasis?: string;
        breakdown?: Partial<PricingBreakdown>;
      };

      const recommendedPhp = Number(parsed.recommendedPhp);
      if (!Number.isFinite(recommendedPhp) || recommendedPhp < minimumWageFloorPhp) {
        throw new Error('Gemini recommended price below statutory floor or invalid');
      }

      return {
        recommendedPhp,
        suggestedMinPhp: Number(parsed.suggestedMinPhp) || recommendedPhp * 0.9,
        suggestedMaxPhp: Number(parsed.suggestedMaxPhp) || recommendedPhp * 1.25,
        rationale: String(parsed.rationale || 'Gemini Pro AI labor pricing evaluation.'),
        legalBasis: parsed.legalBasis,
        logicalBasis: parsed.logicalBasis,
        breakdown: parsed.breakdown,
      };
    } finally {
      clearTimeout(timer);
    }
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

    const breakdown: PricingBreakdown = {
      baseWageFloorPhp: heuristic.breakdown.baseWageFloorPhp,
      skillPremiumPhp:
        typeof external.breakdown?.skillPremiumPhp === 'number'
          ? roundToCents(Math.max(0, external.breakdown.skillPremiumPhp))
          : heuristic.breakdown.skillPremiumPhp,
      toolAllowancePhp:
        typeof external.breakdown?.toolAllowancePhp === 'number'
          ? roundToCents(Math.max(0, external.breakdown.toolAllowancePhp))
          : heuristic.breakdown.toolAllowancePhp,
      transportAllowancePhp:
        typeof external.breakdown?.transportAllowancePhp === 'number'
          ? roundToCents(Math.max(0, external.breakdown.transportAllowancePhp))
          : heuristic.breakdown.transportAllowancePhp,
      urgencyPremiumPhp:
        typeof external.breakdown?.urgencyPremiumPhp === 'number'
          ? roundToCents(Math.max(0, external.breakdown.urgencyPremiumPhp))
          : heuristic.breakdown.urgencyPremiumPhp,
    };

    return {
      minimumWageFloorPhp: heuristic.minimumWageFloorPhp,
      suggestedMinPhp,
      recommendedPhp,
      suggestedMaxPhp,
      hourlyRateRecommendedPhp: roundToCents(
        recommendedPhp / input.estimatedHours,
      ),
      source: 'external_ai',
      legalBasis: external.legalBasis || heuristic.legalBasis,
      logicalBasis: external.logicalBasis || heuristic.logicalBasis,
      rationale: external.rationale || heuristic.rationale,
      breakdown,
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
