# Guest → Auth → Pay flow
# ========================

## Goal

Erster Scan **ohne Account** im Browser speichern. Nach Register/Login Daten nach Convex **claimen/überschreiben**. Landing-Hero = direkt der Test. Nach Scan: Score sichtbar, Details blurred, Auth-CTA.

## States

```
[Guest]
  URL submit (Hero)
    → scanActions.runPreeval
        - reuses a preeval of the same URL from the last 24h (no cost)
        - otherwise global hourly budget (PREEVAL_HOURLY_LIMIT, default 60)
        - screenshot + Gemini; incomplete AI output fails instead of guessing
    → localStorage: slopcheck.guestScans.v1 (score, teaser, lockedCount only)
    → UI: score + teaser flags + blurred placeholders
    → CTA: Unlock €5 (no account) · or log in + share on X for free

[Pay — guest or signed in]
  payments.createCheckoutSession({ scanId, guestKey })
    → Stripe Checkout (collects email)
    → success_url /scans/:id?paid=1&k=<guestKey>  (private report link)
    → webhook → full review (strong model, one retry on bad output)
  A paid scan whose review failed is re-queued, never charged twice.

[Auth — optional]
  Clerk modal
    → GuestScanSync
        1. users.ensureUser
        2. scans.claimGuestScans({ guestKeys })
        3. clear localStorage
    → server scans with those keys move onto the user
```

## localStorage Shape

```ts
type GuestScan = {
  guestKey: string;          // uuid — also the guest's access key
  url: string;
  normalizedUrl: string;
  estimatedScore: number;    // 0–100
  verdict: "fresh" | "mixed" | "likely_slop" | "peak_slop";
  teaserFlags: string[];     // visible
  lockedCount: number;       // locked text stays server-side
  createdAt: number;
  scanId?: string;
};
```

Keys:
- `slopcheck.guestScans.v1` — array (max ~20)
- `slopcheck.activeGuestKey.v1` — last active

## Claim Rules

- Client sends only `guestKey`s; scores/findings come from the server copy
- Scans already owned by another user are skipped
- Local copy cleared after successful claim
- If claim fails → keep local, retry next session

## Hero UX

1. Brand + headline + one sentence
2. URL input + “Check UI” CTA (same viewport)
3. After run: result panel under form (score big, blur panel, auth buttons)
4. No dashboard chrome on first paint

## Auth UX

- Modal Sign-up / Sign-in (Clerk), comic appearance tokens
- After auth: stay on `/` with result; sync happens silently
- Later: `/scans/[id]` for paid report

## What is mocked now

- Preeval = `runLocalPreeval` (heuristic + delay), no real screenshot/AI yet
- Stripe not wired yet
- Full review table exists in schema, no generator yet

## Next implementation slices

1. Clerk keys + Convex `CLERK_JWT_ISSUER_DOMAIN`
2. Real capture action + Gemini preeval
3. Stripe Checkout + webhook unlock
4. Full Claude review + prompt templates
5. `/dashboard` scan history
