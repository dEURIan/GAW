# GAW — Davao City Gig & Sidejob Platform

GAW is a mobile-first full-stack gig and sidejob marketplace built for **Davao City (Region XI)**, connecting local workers and employers across Poblacion, Bajada, Matina, Buhangin, Lanang, Toril, Mintal, and Talomo.

## Key Features

- **Live GPS Job Tracker (`/jobs`)**: Interactive 1:1 Web Mercator street map (`z12–z18`) using real continuous `navigator.geolocation.watchPosition` tracking, Haversine distances, walk/commute ETAs, plus simulated location controls (barangay presets, directional steps, and Worker Walk Demo).
- **Live GPS Nearby Worker Finder (`/find`)**: Concentric-ring radar and worker directory powered by live or simulated GPS coordinates (`km away · Live GPS`), instant barangay simulation, and one-tap `Pinpoint GPS` re-lock.
- **Fair Pay & Pricing Options (`/hire`)**: Enforces the Davao Region XI minimum wage floor (**₱508/day** / **₱63.50/hr**) across both **Use AI Pricer** and **Manual Pricing** modes, alongside worker minimum-wage fee protection.
- **Free Worker Experience & Employer Pro Buyout (`/pro`)**: All worker features are 100% free; the optional **Employer Pro Buyout (`₱299/mo`)** exists exclusively on the employer side under the profile banner and account menu.
- **Mobile-First PWA**: Installable Progressive Web App with `manifest.webmanifest` (`display: standalone`) and an offline-capable service worker (`sw.js`).

## Repository Structure

```text
GAW/
├── src/                    # Node.js + TypeScript + Express + SQLite backend
│   ├── api/                # REST API routes, validation, integration & perf tests
│   ├── db/                 # SQLite schema, repository, and seed utilities
│   └── domain/             # Geo distance, Region XI wage policy, fees, AI pricing advisor
├── pixel-perfect/          # React 19 + TanStack Start / Router + Tailwind CSS PWA frontend
│   ├── public/             # PWA manifest, icons, service worker
│   └── src/                # Routes, components (LiveGpsTracker, PostGigCard, Radar), tests
├── scripts/                # API runner (serve-api.mjs) and latency benchmark (perf-check.mjs)
├── SPEC.md                 # Platform domain specification
└── .github/workflows/      # CI pipeline (lint, typecheck, 100% coverage, audit, perf gate)
```

## Quick Start

### 1. Install dependencies

```sh
npm install
npm --prefix pixel-perfect install
```

### 2. Run local development server

```sh
npm run dev
```

Starts the backend build and launches the frontend Vite/TanStack Start dev server (with `/api/v1` middleware) on `http://localhost:8080/` (or `http://localhost:8081/` if `8080` is busy).

### 3. Run standalone API server

```sh
npm run start:api
```

Starts the REST API server on `http://localhost:8787/`.

## Verification & Quality Gates

```sh
npm run verify
```

Runs the full verification pipeline:

- `npm run lint` — Backend ESLint (`--max-warnings=0`)
- `npm run typecheck` — Backend TypeScript (`tsc --noEmit`)
- `npm run test:cov` — Backend Vitest suite with **100% statement/branch/function/line coverage**
- `npm run build` — Backend production build
- `npm run perf:api` — API latency budget check (`p95 <= 200ms`, `p99 <= 500ms`)
- `npm run frontend:test` — Frontend Vitest suite
- `npm run frontend:build` — Frontend Vite/Nitro build

Frontend checks can also be run individually inside `pixel-perfect/`:

```sh
cd pixel-perfect
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## REST API Endpoints (`/api/v1`)

| Method & Path | Description |
| --- | --- |
| `GET /api/v1/health` | Service health check and Davao Region XI configuration |
| `POST /api/v1/marketplace/seed` | Seed demo Davao City users and nearby gigs |
| `POST /api/v1/users` | Create an employer or worker profile |
| `GET /api/v1/users/:userId` | Retrieve user profile & subscription tier |
| `PATCH /api/v1/users/:userId/subscription` | Update Employer subscription tier (`FREE` / `PRO`) |
| `POST /api/v1/pricing/estimate` | Calculate minimum wage floor and suggested AI rate |
| `POST /api/v1/gigs` | Publish a Davao City gig (enforces Region XI wage floor & bounds) |
| `GET /api/v1/gigs/nearby` | Query open gigs sorted by proximity (`lat`, `lng`, `radiusKm`) |
| `GET /api/v1/gigs/:gigId` | Retrieve gig details |
| `POST /api/v1/users/:employeeId/saved-gigs` | Add a gig to a worker's desired-gigs queue |
| `GET /api/v1/users/:employeeId/saved-gigs` | List a worker's saved/desired gigs |
| `DELETE /api/v1/users/:employeeId/saved-gigs/:gigId` | Remove a gig from saved queue |
| `POST /api/v1/gigs/:gigId/applications` | Submit a worker application for an open gig |
| `POST /api/v1/gigs/:gigId/accept` | Accept a worker application |
| `POST /api/v1/gigs/:gigId/complete` | Complete a gig and compute protected worker settlement |
| `GET /api/v1/users/:userId/transactions` | Fetch settled transaction ledger for a user |
