# Spec: GAW Backend Foundation (Davao City Gig & Sidejob Platform)

## 1. Objective

GAW connects underemployed and unemployed residents in **Davao City (Region XI, Philippines)** with local employers who need short-term gigs and sidejobs. The backend enforces statutory Davao City minimum wage protection, provides optional AI-assisted pricing guidance, enables hyper-local proximity discovery and personal desired-gig queues for workers, and operates a transparent freemium + transaction fee ledger.

## 2. Capability Map

| Module id | Responsibility | Depends on |
|---|---|---|
| `identity-and-tiers` | Employer/employee registration within Davao bounds and `FREE`/`PRO` tier management | — |
| `wage-and-ai-pricing` | Region XI prorated minimum wage enforcement and advisory AI/heuristic price estimation | — |
| `gig-proximity-marketplace` | Gig creation, Haversine proximity search, desired-gigs queue, applications, and assignment | `identity-and-tiers`, `wage-and-ai-pricing` |
| `freemium-ledger` | Freemium quota gating, completion settlement, fee capping, and transaction ledger | `identity-and-tiers`, `wage-and-ai-pricing`, `gig-proximity-marketplace` |

Build order: `identity-and-tiers`, `wage-and-ai-pricing` → `gig-proximity-marketplace` → `freemium-ledger`.

## 3. Core Business Rules

1. **Davao Region XI Minimum Wage Floor (Wage Order No. RBXI-23)**:
   - Daily minimum wage: **₱508.00 / 8-hour workday**.
   - Prorated hourly minimum floor: **₱63.50 / hour** (`508 / 8`).
   - Minimum required gig price: `roundToCents(estimatedHours * 63.50)`.
   - Any gig priced below `minimumRequiredPhp` is rejected with `422 BELOW_MINIMUM_WAGE`.
2. **Advisory AI Pricing**:
   - Returns `{ minimumWageFloorPhp, suggestedMinPhp, recommendedPhp, suggestedMaxPhp, hourlyRateRecommendedPhp, rationale }` based on category multiplier, urgency (`standard` vs `urgent`), and required skills (`+5%` per skill, capped at `+25%`), always clamped `>= minimumWageFloorPhp`.
   - Employers may ignore the AI recommendation as long as `offeredPricePhp >= minimumRequiredPhp`. The backend records `aiRecommendedPhp` and `followedAiRecommendation`.
3. **Proximity Discovery & Desired Gigs Queue**:
   - Coordinates must fall within Davao City / Region XI bounds (`lat ∈ [6.85, 7.60]`, `lng ∈ [125.20, 125.75]`), otherwise `422 OUTSIDE_DAVAO_REGION`.
   - Nearby search uses Haversine distance (`km`, 3 decimal precision) and orders results by `distanceKm ASC`, then Pro employer priority (`PRO` before `FREE`), then `createdAt DESC`.
   - Employees save gigs to their personal desired-gigs list (`saved_gigs`), returned ordered by `distanceKm ASC` from the employee's coordinates.
4. **Freemium & Transaction Fees**:
   - `FREE` Employer: max **3** active `OPEN` gigs; **5%** platform fee added on completion (`employerTotalChargePhp = grossAmountPhp + employerFeePhp`).
   - `PRO` Employer (₱69/mo): unlimited active `OPEN` gigs; **2%** platform fee; distance-tie priority boost.
   - `FREE` Employee: max **5** saved/desired gigs and max **5** active (`PENDING`) applications; **5%** platform fee deducted from gross payout, **capped** so `workerNetPayoutPhp >= minimumRequiredPhp`.
   - `PRO` Employee (₱99/mo): unlimited saved gigs & applications; **0%** platform fee.

## 4. Commands

```bash
npm run lint      # ESLint across src/ with zero warnings allowed
npm run typecheck # TypeScript strict type checking (tsc --noEmit)
npm run test      # Run Vitest unit, integration, and performance tests
npm run test:cov  # Run Vitest with 100% lines/branches/functions/statements enforcement
npm run build     # Compile production bundle to dist/
npm run perf:api  # Verify API p95 <= 200ms, p99 <= 500ms, errorRate < 1%
npm run verify    # Full gate: lint -> typecheck -> test:cov -> build -> perf:api
```

## 5. Project Structure

```text
src/domain/     → Pure domain policies (wage floor, Haversine geo, AI pricing, fee engine)
src/db/         → node:sqlite schema initialization and parameterized repository
src/api/        → Zod boundary schemas and Express REST API application
scripts/        → Performance budget gate runner
docs/           → Architecture diagrams, ERD, and API contract documentation
```

## 6. Boundaries

- **Always do**: Validate all HTTP inputs with Zod at API boundaries; parameterize all SQL queries; return `{ error: { code, message, details? } }` on failures; maintain 100% test coverage.
- **Ask first**: Switching storage driver to PostgreSQL in production, adding external payment gateway keys, or enabling live Gemini API calls over heuristic fallback.
- **Never do**: Commit secrets or `.db` artifacts; allow gigs or net worker payouts below statutory Davao Region XI minimum wage; bypass `npm run verify`.
