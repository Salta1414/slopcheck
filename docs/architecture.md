# Architecture

## Stack

| Layer | Choice | Warum |
|-------|--------|-------|
| Frontend | Next.js (App Router) | SSR, Vercel-ready, Clerk/Stripe easy |
| Backend / DB | **Convex** | Reactive results, auth, actions, scheduler |
| Auth | **Clerk** | Login, Session → Convex JWT |
| Payments | **Stripe Checkout** (hosted) | Einmalzahlung €5, wenig Custom-UI |
| Screenshots | siehe [screenshots-and-ai.md](./screenshots-and-ai.md) | Capture → Storage |
| AI | **OpenRouter** (cheap → strong vision) | Ein Key, Models per Env |

## High-level

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js UI │────▶│    Convex    │────▶│ Screenshot  │
│  (comic)    │◀────│  queries/    │     │  Provider   │
└──────┬──────┘     │  mutations/  │     └──────┬──────┘
       │            │  actions     │            │
       │            └──────┬───────┘            ▼
       │                   │              Convex File Storage
       │                   ▼
       │            ┌──────────────┐
       │            │  OpenRouter  │
       │            │ cheap/strong │
       ▼            └──────────────┘
┌─────────────┐            │
│    Clerk    │     ┌──────▼───────┐
└─────────────┘     │    Stripe    │
                    │  Checkout €5 │
                    └──────────────┘
```

Vollplan: [master-plan.md](./master-plan.md)
## Core Domain (Convex Tables — Entwurf)

- `users` — synced from Clerk
- `scans` — url, status, owner, createdAt
- `screenshots` — scanId, viewport, storageId
- `preevals` — scanId, score, teaserFlags, model, costCents
- `payments` — scanId, stripeSessionId, status, amountEur
- `reviews` — scanId, fullScore, findings[], prompts[], model (unlocked after pay)

## Status Machine (Scan)

```
pending_capture
  → capturing
  → preeval_running
  → preeval_ready          ← User sieht Teaser
  → awaiting_payment
  → paid                   ← Stripe webhook
  → full_review_running
  → ready                  ← Full Report
  → failed
```

## Auth Boundary

- Public: Landing, URL submit (optional guest → später Claim)
- Authenticated (Clerk): Scan-History, Paid Reports
- MVP-Empfehlung: **Login vor Pay** (sonst Webhook ↔ User Mapping messy)

## Env (Konzept)

```
CLERK_* / NEXT_PUBLIC_CLERK_*
CONVEX_URL / CONVEX_DEPLOY_KEY
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
SCREENSHOT_API_KEY (oder Browserless/Firecrawl)
OPENAI_API_KEY / GOOGLE_API_KEY / ANTHROPIC_API_KEY
```

## Deploy

- Frontend: Vercel
- Backend: Convex (`npx convex dev` lokal, `deploy` nur Production)
- Stripe Webhook → Convex HTTP Action
