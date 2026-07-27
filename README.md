# Slopcheck

Paste a URL. We check if the UI looks like AI slop — and tell you how to fix it.

**Price:** €5 for a full UI review + fix prompts  
**Stack:** Next.js (TS) · Convex · Clerk · Stripe  
**Look:** Comic — round, squishy, playful

## Docs

| Doc | Inhalt |
|-----|--------|
| [docs/master-plan.md](docs/master-plan.md) | Gesamtplan (OpenRouter) |
| [docs/guest-flow.md](docs/guest-flow.md) | Guest localStorage → Auth claim |
| [docs/roadmap.md](docs/roadmap.md) | Phased plan |
| [docs/architecture.md](docs/architecture.md) | Stack & Systemübersicht |
| [docs/ui-comic.md](docs/ui-comic.md) | Comic UI Style Guide |
| [docs/screenshots-and-ai.md](docs/screenshots-and-ai.md) | Screenshots + OpenRouter |
| [docs/scoring-rubric.md](docs/scoring-rubric.md) | Slop-Score Rubrik |
| [docs/payments-stripe.md](docs/payments-stripe.md) | Stripe Checkout (€5) |
| [docs/auth-clerk.md](docs/auth-clerk.md) | Clerk Auth |

## Dev

```bash
# terminal 1
npx convex dev

# terminal 2
npm run dev
```

Copy `.env.example` → fill Clerk keys. Set `CLERK_JWT_ISSUER_DOMAIN` in Convex dashboard.

## Current MVP behavior

1. Hero: paste URL → local mock preeval (stored in `localStorage`)
2. Result: big UI score + teaser flags + **blurred** findings
3. Sign up / Log in → `claimGuestScans` writes into Convex and clears guest storage
4. Real screenshots / Gemini / Stripe = next phases (see roadmap)

## Status

Scaffold running. Clerk keys + real AI pipeline still to wire.
