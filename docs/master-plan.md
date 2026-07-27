# Master Plan — Slopcheck

Alles über **OpenRouter** (ein Key, viele Models). Kein Gemini-/Anthropic-Direktkonto nötig.

---

## Stack (final)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (TS) · Comic UI |
| Backend | Convex |
| Auth | Clerk ✅ |
| Payments | Stripe Checkout €5 |
| Screenshots | ScreenshotOne (MVP) / Browserless später |
| AI | **OpenRouter** — cheap vision → strong vision |

---

## End-to-End Flow

```
Guest
  Hero URL
    → Convex action: capture screenshot(s)
    → OpenRouter CHEAP vision (JSON rubrik)
    → Teaser in localStorage (+ optional guestKey on server)
    → Score sichtbar, findings blurred
    → Sign up / Log in → claimGuestScans

Authed
  Pay €5 (Stripe Checkout)
    → webhook → scan.paid
    → OpenRouter STRONG vision (mehr shots + prompts)
    → Full report unlocked
```

---

## OpenRouter — Model Strategy

Ein Env: `OPENROUTER_API_KEY`.  
API: `https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible + image_url).

| Stufe | Model-ID (Vorschlag) | Rolle | ~Cost/Scan |
|-------|----------------------|-------|------------|
| **Preeval** | `moonshotai/kimi-k3` | Schnell, billig, Vision | ~0.1–2¢ |
| **Full** | `anthropic/claude-opus-5` | Tiefe Kritik + Fix-Prompts | ~5–25¢ |
| Fallback | nächst-billigeres Vision-Model auf OR | wenn primary down | — |

**Regel:** Models nur als Config/Env wechseln (`OPENROUTER_PREEVAL_MODEL`, `OPENROUTER_FULL_MODEL`) — kein Code-Rewrite.

### Request Pattern (beide Stufen)

```
POST /api/v1/chat/completions
{
  model: "...",
  response_format: { type: "json_object" },  // oder tool/schema
  messages: [
    { role: "system", content: RUBRIK_PROMPT },
    { role: "user", content: [
        { type: "text", text: "Evaluate this UI for AI slop..." },
        { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
      ]
    }
  ]
}
```

Screenshots als **base64 data URLs** oder öffentlich signierte Storage-URLs (wenn Model remote fetch erlaubt).

### Cost Guardrails

- Preeval: max 1 Desktop above-the-fold image
- Full: max 3 images (desktop fold, mobile, optional mid-scroll)
- Hard cap tokens / max €0.40 full review
- Rate limit: N free preevals / IP / day + after auth per user

---

## Screenshots

| Phase | Was |
|-------|-----|
| Preeval | 1440×900, above-the-fold, `block_ads`, wait ~1.5s |
| Full | + mobile 390×844, optional fullPage/mid |

**Provider MVP:** ScreenshotOne  
**Alt:** Browserless wenn Cookie-Banner-Dismiss nötig  

Flow in Convex `"use node"` action:

1. SSRF-safe URL validate  
2. Capture → bytes  
3. `ctx.storage.store` → `storageId`  
4. Schedule AI action  

---

## Phases

### Phase 1 — Clerk harden ✅ (fast done)

- [x] Clerk linked + keys  
- [x] JWT template `convex`  
- [x] Issuer on Convex  
- [ ] Manuell: Sign-up testen, Guest-Scan claimen verifizieren  
- [ ] Optional: `/scans` history page (auth)

### Phase 2 — Real Preeval (OpenRouter) ← **NEXT**

1. `OPENROUTER_API_KEY` + Screenshot API key  
2. Convex modules:
   - `convex/lib/openrouter.ts` — chat helper (vision + JSON)  
   - `convex/lib/screenshots.ts` — capture client  
   - `convex/scanActions.ts` — `"use node"` capture + preeval  
   - `convex/scans.ts` — `startGuestScan` / status updates  
3. Frontend: Hero ruft echte Action statt `runLocalPreeval`  
4. Guest: Ergebnis weiter in localStorage; parallel Server-Scan mit `guestKey`  
5. Rubrik aus `scoring-rubric.md` als System-Prompt  

**Deliverable:** URL → echter Screenshot-Score in <15s, blurred teaser bleibt.

### Phase 3 — Stripe + Full Review (OpenRouter strong)

1. Stripe Product/Price €5 EUR  
2. `createCheckoutSession` action (metadata: scanId, userId)  
3. HTTP webhook → `payments.paid` → schedule full review  
4. Full OpenRouter call mit strong model + multi-image  
5. Report UI: findings, copy-prompt buttons  
6. Gate: blurred → unlocked only if `status === ready`

**Deliverable:** €5 → brauchbare Fix-Prompts.

### Phase 4 — Product polish

- Scan history (`/scans`, `/scans/[id]`)  
- Mobile capture default on paid  
- Error UX (blocked site, timeout)  
- DE/EN  
- Abuse limits + basic analytics  
- Re-scan after fix (discounted?)

### Phase 5 — Growth (later)

- Scan packs  
- Team seats  
- Opt-in hall of slop  
- Extension  

---

## Env Checklist

```bash
# Done
NEXT_PUBLIC_CLERK_* / CLERK_SECRET_KEY
NEXT_PUBLIC_CONVEX_URL
# Convex dashboard: CLERK_JWT_ISSUER_DOMAIN

# Phase 2
OPENROUTER_API_KEY=
OPENROUTER_PREEVAL_MODEL=moonshotai/kimi-k3
OPENROUTER_FULL_MODEL=anthropic/claude-opus-5
SCREENSHOT_API_KEY=
SCREENSHOT_API_URL=   # provider-specific

# Phase 3
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_FULL_REVIEW=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=   # optional if hosted only
```

Keys für OpenRouter + Screenshot → **Convex Dashboard env** (Actions), nicht nur Next.

---

## Convex Module Map (geplant)

```
convex/
  schema.ts          ✅
  auth.config.ts     ✅
  users.ts           ✅
  scans.ts           ✅ (+ start / get status)
  payments.ts        Phase 3
  http.ts            Stripe webhook
  lib/
    auth.ts          ✅
    openrouter.ts    Phase 2
    screenshots.ts   Phase 2
    rubric.ts        shared prompts/schema
  scanActions.ts     "use node" capture + AI
  reviewActions.ts   "use node" full review
```

---

## Data after Phase 2/3

Erweitere `scans` / speichere separat:

- `screenshotStorageIds: Id<"_storage">[]`
- `preevalModel`, `fullModel` (OpenRouter IDs)
- `preevalRaw` (optional, debug)
- `costEstimateCents` (telemetry)

---

## Risks & Mitigations

| Risk | Fix |
|------|-----|
| OpenRouter model rename/deprecation | Env-based model IDs |
| Vision JSON flaky | Strict schema + retry once + local validate |
| Screenshot blocked | Clear `failed` message + manual URL tips |
| Free-tier abuse | IP + user rate limits before capture |
| Score jumps preeval→full | Same rubric; label preeval as estimate ±15 |

---

## Success Criteria

- Preeval conversion: guest → signup > X%  
- Pay conversion: signup → €5 > Y%  
- Full review feels „fair“ (rubric evidence)  
- AI+capture COGS << €1 pro Paid-Scan  

---

## Immediate Next Step

**Phase 2 implementieren:** OpenRouter helper + Screenshot capture + replace mock preeval.

Braucht von dir:
1. `OPENROUTER_API_KEY`
2. Screenshot-Provider-Wahl + API key (Empfehlung: ScreenshotOne)
