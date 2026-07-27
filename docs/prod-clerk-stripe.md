# Production switch — Clerk + Stripe

Both are currently in **test / development** mode. Live payments & the Clerk “Development mode” badge go away only after swapping to live keys.

## Stripe (connected account)

| | |
|--|--|
| Account | **Kavyr** |
| Account ID | `acct_1Tw8E8KzeVLyR1AU` |
| Mode now | **Test** (`sk_test_…` / `pk_test_…`) |
| Dashboard | https://dashboard.stripe.com/acct_1Tw8E8KzeVLyR1AU |

### Live checklist

1. Stripe Dashboard → toggle **Live mode**
2. Create live Product/Price for €5 Full Review (or copy from test)
3. Developers → API keys → copy `sk_live_…` + `pk_live_…`
4. Developers → Webhooks → endpoint  
   `https://<CONVEX_SITE_URL>/stripe/webhook`  
   events: `checkout.session.completed` (and refunds if you use them) → copy `whsec_…`
5. Set on **Convex production** (not only `convex env` for the anonymous/dev deploy):

```bash
npx convex env set STRIPE_SECRET_KEY sk_live_… --prod
npx convex env set STRIPE_PRICE_FULL_REVIEW price_… --prod
npx convex env set STRIPE_WEBHOOK_SECRET whsec_… --prod
npx convex env set APP_URL https://slopcheck.dev --prod
```

6. Optional on Vercel if the frontend ever needs the publishable key:

```bash
npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# pk_live_…
```

## Clerk

| | |
|--|--|
| Mode now | **Development** (`pk_test_…` / `sk_test_…`) — orange “Development mode” in modal |
| App | existing Clerk application linked to Convex JWT template `convex` |

### Live checklist

1. Clerk Dashboard → create / open **Production** instance (or promote)
2. Copy Production `pk_live_…` + `sk_live_…`
3. Allowed origins / redirect URLs:
   - `https://slopcheck.dev`
   - `https://www.slopcheck.dev`
   - `https://slopcheck-jet.vercel.app` (optional)
4. JWT template `convex` must exist on **Production** with same issuer setup
5. Set Convex:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<prod-clerk-domain> --prod
```

6. Set Vercel production:

```bash
npx vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
npx vercel env add CLERK_SECRET_KEY production
```

7. Redeploy Vercel + `npx convex deploy` for production backend

## Don’t mix

Never put `sk_live` on the local/dev Convex deployment while the site still uses `pk_test` Clerk (or vice versa). Keep **dev=test**, **prod=live**.
