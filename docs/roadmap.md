# Roadmap

## Phase 0 — Scaffold ✅

- [x] Next.js App Router + TypeScript + Tailwind
- [x] Convex project + schema
- [x] Comic UI shell + Hero URL tester
- [x] Guest localStorage preeval (mock) + blurred teaser
- [x] claimGuestScans mutation
- [x] Docs

## Phase 1 — Auth (Clerk) ✅

- [x] Clerk CLI init + app link
- [x] Keys in `.env.local`
- [x] JWT template `convex`
- [x] `CLERK_JWT_ISSUER_DOMAIN` on Convex
- [x] Nav Sign in / Sign up / UserButton
- [ ] Manual: first signup + claim verify
- [ ] `/scans` history (optional soft)

## Phase 2 — Real Preeval via **OpenRouter** ← IN PROGRESS

- [x] `convex/lib/openrouter.ts` + rubric prompts
- [x] `convex/scanActions.runPreeval` (screenshot + OR vision)
- [x] Persist guest preeval via `scanInternal.upsertGuestPreeval`
- [x] Hero wired to real action (mock removed)
- [x] Model envs on Convex (`OPENROUTER_PREEVAL_MODEL`, etc.)
- [ ] **You:** `npx convex env set OPENROUTER_API_KEY <key>`
- [ ] Optional: `npx convex env set SCREENSHOT_API_KEY <key>` (ScreenshotOne; else Microlink fallback)
- [ ] Rate limit guest scans

## Phase 3 — Stripe €5 + Full Review (OpenRouter strong) ✅

- [x] Stripe Product/Price €5 (`price_1TxoQtKzeVLyR1AU00YXHBSw`)
- [x] Checkout Session action + payment records
- [x] Webhook HTTP `/stripe/webhook` → mark paid → schedule full review
- [x] Full review action (strong OpenRouter model)
- [x] Report page `/scans/[id]` + copy prompts
- [x] Unlock CTA from hero / scan page
- [ ] Add `OPENROUTER_API_KEY` on Convex (required for AI)
- [ ] Dashboard webhook for production (replace `stripe listen`)

## Phase 4 — Polish

- [ ] Mobile viewport on paid
- [ ] Error UX, DE/EN, re-scan
- [ ] Abuse controls + analytics

## Phase 5 — Growth

- [ ] Packs / teams / hall of slop / extension
