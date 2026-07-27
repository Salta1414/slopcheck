# Guest → Auth → Pay flow
# ========================

## Goal

Erster Scan **ohne Account** im Browser speichern. Nach Register/Login Daten nach Convex **claimen/überschreiben**. Landing-Hero = direkt der Test. Nach Scan: Score sichtbar, Details blurred, Auth-CTA.

## States

```
[Guest]
  URL submit (Hero)
    → local preeval (mock → later Gemini)
    → localStorage: slopcheck.guestScans.v1
    → UI: score + teaser flags + blurred findings
    → CTA: Sign up / Log in

[Auth]
  Clerk modal
    → GuestScanSync
        1. users.ensureUser
        2. scans.claimGuestScans(payload)
        3. clear localStorage
    → Scan gehört dem User in Convex

[Pay] (next)
  Stripe Checkout €5
    → webhook → full review (Claude)
    → unlock findings + prompts
```

## localStorage Shape

```ts
type GuestScan = {
  guestKey: string;          // uuid
  url: string;
  normalizedUrl: string;
  estimatedScore: number;    // 0–100
  verdict: "fresh" | "mixed" | "likely_slop" | "peak_slop";
  teaserFlags: string[];     // visible
  lockedFindings: string[];  // blurred
  lockedPrompts: string[];   // blurred / locked
  createdAt: number;
};
```

Keys:
- `slopcheck.guestScans.v1` — array (max ~20)
- `slopcheck.activeGuestKey.v1` — last active

## Claim Rules

- Match by `guestKey` if already exists in Convex → **patch/overwrite** onto `userId`
- Else insert new scan owned by user
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
