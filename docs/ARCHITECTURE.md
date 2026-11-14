# GAW Backend Architecture

## 1. System Overview

GAW is organized as a modular monolith with strict dependency direction:

`api (HTTP & Zod validation)` → `db (SQLite repository)` & `domain (pure business rules)`

This ensures all business invariants (Davao Region XI minimum wage, Haversine proximity, AI pricing heuristics, and freemium fee protection) are pure, deterministic, and independently verifiable at 100% coverage while the repository boundary cleanly isolates `node:sqlite` (`DatabaseSync`) for future PostgreSQL migration.

```mermaid
graph TD
    Client["Employer / Employee Client"] --> ExpressAPI["Express REST API (src/api/app.ts)"]
    ExpressAPI --> ZodSchemas["Zod Boundary Schemas (src/api/schemas.ts)"]
    ExpressAPI --> Repo["GawRepository (src/db/repository.ts)"]
    ExpressAPI --> WagePolicy["Wage Policy (src/domain/wage-policy.ts)"]
    ExpressAPI --> Geo["Geo Service (src/domain/geo.ts)"]
    ExpressAPI --> Pricing["AI Pricing Advisor (src/domain/pricing-advisor.ts)"]
    ExpressAPI --> FeeEngine["Freemium Fee Engine (src/domain/fee-engine.ts)"]
    Repo --> SQLite["node:sqlite DatabaseSync (src/db/database.ts)"]
    Pricing -. optional external provider .-> ExternalLLM["Pluggable LLM Provider (e.g. Gemini)"]
```

## 2. Core Flows

### 2.1 Employer Gig Creation & Optional AI Pricing

```mermaid
sequenceDiagram
    participant E as Employer
    participant API as Express API
    participant P as Pricing Advisor
    participant W as Wage Policy
    participant F as Fee Engine
    participant DB as SQLite Repo

    E->>API: POST /api/v1/pricing/estimate
    API->>W: calculateMinimumWageFloor(hours)
    API->>P: estimateGigPrice(category, hours, urgency, skills)
    API-->>E: { minimumWageFloorPhp, suggestedMinPhp, recommendedPhp, suggestedMaxPhp }

    E->>API: POST /api/v1/gigs (offeredPricePhp)
    API->>DB: getUserById(employerId) & countEmployerOpenGigs()
    API->>F: checkEmployerPostingQuota(tier, openCount)
    API->>W: validateGigPrice(hours, offeredPricePhp)
    alt offeredPricePhp < minimumRequiredPhp
        API-->>E: 422 BELOW_MINIMUM_WAGE
    else valid price (AI followed or ignored)
        API->>P: estimateGigPrice(...) & didFollowAiRecommendation(...)
        API->>DB: createGig(...)
        API-->>E: 201 Created (Gig)
    end
```

### 2.2 Employee Proximity Discovery & Minimum-Wage-Protected Settlement

```mermaid
sequenceDiagram
    participant Wk as Employee
    participant API as Express API
    participant G as Geo (Haversine)
    participant DB as SQLite Repo
    participant F as Fee Engine

    Wk->>API: GET /api/v1/gigs/nearby?lat=...&lng=...&radiusKm=10
    API->>DB: listNearbyOpenGigs(...)
    DB->>G: calculateHaversineDistanceKm(worker, gig)
    API-->>Wk: 200 OK (sorted by distanceKm ASC, PRO employer boost, newest)

    Wk->>API: POST /api/v1/users/:employeeId/saved-gigs
    API->>F: checkEmployeeQueueQuota(tier, savedCount)
    API->>DB: saveGigForEmployee(...)
    API-->>Wk: 201 Created

    Wk->>API: POST /api/v1/gigs/:gigId/applications
    Note over API,DB: Employer accepts via POST /api/v1/gigs/:gigId/accept
    Note over API,DB: Employer completes via POST /api/v1/gigs/:gigId/complete
    API->>F: calculateSettlementBreakdown(gross, hours, employerTier, employeeTier)
    Note over F: Caps employeeFeePhp so workerNetPayoutPhp >= minimumRequiredPhp
    API->>DB: completeGig(gigId, breakdown)
    API-->>Wk: 200 OK (Gig + Transaction Ledger)
```

## 3. Data Model (ERD)

```mermaid
erDiagram
    users ||--o{ gigs : "posts (employer_id)"
    users ||--o{ gigs : "assigned (assigned_employee_id)"
    users ||--o{ saved_gigs : "saves (employee_id)"
    gigs ||--o{ saved_gigs : "bookmarked_in"
    users ||--o{ gig_applications : "submits (employee_id)"
    gigs ||--o{ gig_applications : "receives"
    gigs ||--o| transactions : "settles"

    users {
        text id PK
        text name
        text role "employer | employee"
        text tier "FREE | PRO"
        text barangay
        real lat
        real lng
        text created_at
    }
    gigs {
        text id PK
        text employer_id FK
        text title
        text description
        text category
        real estimated_hours
        real offered_price_php
        real minimum_required_php
        real ai_recommended_php
        integer followed_ai_recommendation
        text urgency "standard | urgent"
        text barangay
        real lat
        real lng
        text status "OPEN | ASSIGNED | COMPLETED | CANCELLED"
        text assigned_employee_id FK
        text created_at
    }
    saved_gigs {
        text employee_id PK,FK
        text gig_id PK,FK
        text note
        text created_at
    }
    gig_applications {
        text id PK
        text gig_id FK
        text employee_id FK
        text message
        text status "PENDING | ACCEPTED | REJECTED"
        text created_at
    }
    transactions {
        text id PK
        text gig_id UK,FK
        text employer_id FK
        text employee_id FK
        real gross_amount_php
        real minimum_required_php
        real employer_fee_php
        real employer_total_charge_php
        real employee_fee_php
        real worker_net_payout_php
        real platform_revenue_php
        integer fee_protected_by_min_wage
        text created_at
    }
```

## 4. REST API Contract (`/api/v1`)

| Method & Path | Description | Key Status Codes |
|---|---|---|
| `GET /api/v1/health` | Service health & active Davao Region XI wage config | `200` |
| `POST /api/v1/users` | Register employer or employee inside Davao bounds | `201`, `422` |
| `GET /api/v1/users/:userId` | Retrieve user profile and tier quota metadata | `200`, `404` |
| `PATCH /api/v1/users/:userId/subscription` | Upgrade or downgrade subscription tier (`FREE` / `PRO`) | `200`, `404`, `422` |
| `POST /api/v1/pricing/estimate` | Calculate Davao wage floor & AI/heuristic price band | `200`, `422` |
| `POST /api/v1/gigs` | Create gig enforcing quota & Davao minimum wage floor | `201`, `403`, `404`, `422` |
| `GET /api/v1/gigs/nearby` | Discover open gigs by Haversine distance (`radiusKm`) | `200`, `422` |
| `GET /api/v1/gigs/:gigId` | Retrieve gig details | `200`, `404` |
| `POST /api/v1/users/:employeeId/saved-gigs` | Save gig to employee's desired-gigs queue | `201`, `403`, `404`, `409`, `422` |
| `GET /api/v1/users/:employeeId/saved-gigs` | List employee's desired gigs sorted by proximity | `200`, `404` |
| `DELETE /api/v1/users/:employeeId/saved-gigs/:gigId` | Remove gig from desired-gigs queue | `200`, `404` |
| `POST /api/v1/gigs/:gigId/applications` | Submit employee application for an `OPEN` gig | `201`, `403`, `404`, `409`, `422` |
| `POST /api/v1/gigs/:gigId/accept` | Employer accepts an application (`OPEN` → `ASSIGNED`) | `200`, `403`, `404`, `409`, `422` |
| `POST /api/v1/gigs/:gigId/complete` | Complete gig and record freemium fee settlement | `200`, `403`, `404`, `409`, `422` |
| `GET /api/v1/users/:userId/transactions` | List settlement ledger entries for user | `200`, `404` |
