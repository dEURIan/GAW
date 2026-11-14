# GAW Frontend (`pixel-perfect`)

React 19 + TanStack Start / Router + Tailwind CSS Progressive Web App (PWA) frontend for the **GAW (Davao City Gig & Sidejob Platform)**.

## Features

- Live GPS Street Tracker (`/jobs`) with 1:1 Web Mercator tiles, walk/commute ETAs, and simulated location controls
- Live GPS Nearby Worker Finder (`/find`) with interactive proximity radar
- Employer Gig Posting (`/hire`) with **Use AI Pricer** and **Manual Pricing** options backed by the Davao Region XI ₱508/day minimum wage guard
- Free worker tools across all views, with Employer Pro Buyout (`/pro`) scoped to hiring mode
- Mobile-responsive UI and installable PWA manifest & service worker

## Scripts

```sh
npm install
npm run dev      # Start Vite / TanStack Start dev server
npm run build    # Build production client + SSR output
npm test         # Run Vitest unit/component tests
npm run lint     # Run ESLint
npx tsc --noEmit # Typecheck TypeScript sources
```
