# Clerk Auth

## Role

Clerk = Identity. Convex = App-Daten (Scans, Payments, Reviews).

## Setup Checklist

1. Create Clerk app
2. Enable **Convex** integration in Clerk (JWT template name: `convex`)
3. `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Convex Dashboard env:
   - `CLERK_JWT_ISSUER_DOMAIN` = Frontend API URL  
     (e.g. `https://verb-noun-00.clerk.accounts.dev`)
5. Restart `npx convex dev` + `npm run dev`

Until keys exist, the app still runs: guest scans work locally; auth buttons show “Clerk keys pending”.

## MVP Policy

1. **Browse + URL submit:** guest scan in `localStorage` (see [guest-flow.md](./guest-flow.md))
2. **Nach Preeval:** Sign-up / Log-in CTA (score sichtbar, details blurred)
3. **On auth:** `GuestScanSync` → `users.ensureUser` + `scans.claimGuestScans` (overwrite)
4. **Vor Payment:** Login required
5. **History / Reports:** nur Owner

## Integration

- `src/components/providers.tsx` — `ClerkProvider` + `ConvexProviderWithClerk`
- `src/middleware.ts` — `clerkMiddleware` when keys present, else passthrough
- `convex/auth.config.ts` — validates Clerk JWT (`applicationID: "convex"`)
- Comic appearance tokens on ClerkProvider (mint / coral / big radius)
