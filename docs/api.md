# Public API & MCP server

Both are Convex HTTP actions (`convex/http.ts`, logic in `convex/lib/apiHttp.ts`
and `convex/lib/mcp.ts`). `next.config.ts` proxies them so users only see
`slopcheck.dev/api/v1/*` and `slopcheck.dev/mcp`. The Convex site URL is derived
from `NEXT_PUBLIC_CONVEX_URL` (`.convex.cloud` → `.convex.site`) or set
explicitly with `CONVEX_SITE_URL` at build time.

## Auth & credits

- Keys: `slop_` + 40 hex, created on `/developers` (max 5 active per account).
  Only the sha256 is stored (`apiKeys.keyHash`); the key is shown once.
- Send as `Authorization: Bearer slop_…` (or `X-API-Key`).
- `users.apiCredits`: 1 credit = 1 full review. The first key grants
  `API_TRIAL_CREDITS` (default 1) once.
- A failed review refunds its credit (`apiKeys.runApiReview`).
- Rate limit: `API_HOURLY_LIMIT` reviews per key per hour (default 20).
- Credit packs: Stripe Checkout with `STRIPE_PRICE_API_CREDITS`, granting
  `STRIPE_API_CREDITS_PER_PACK` (default 10). The webhook branches on
  `metadata.kind = "api_credits"` and is idempotent per session.

## REST

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/recipes` | – | Recipe summaries |
| GET | `/api/v1/recipes/:id` | – | Full code + markdown |
| GET | `/api/v1/account` | key | `{ credits }` |
| POST | `/api/v1/reviews` | key | `{ url }` → 202 `{ id, status, reportUrl, creditsLeft }`; 402 no credits, 429 rate limit |
| GET | `/api/v1/reviews/:id` | key | `status`: queued / running / ready / failed. When ready: `score, verdict, summary, criteria, tells, findings, kit, briefMarkdown` |

API reviews skip the pre-eval and go straight to `reviewActions.runFullReview`.
The scan belongs to the key's account (so it also shows in `/scans`) and gets
a random `guestKey`, which makes `reportUrl` a private web link.

## MCP

Stateless Streamable HTTP: every JSON-RPC message is a POST answered with
plain JSON (no SSE, no sessions; GET/DELETE → 405). Supports `initialize`,
`ping`, `tools/list`, `tools/call`; notifications get 202.

Tools: `list_recipes`, `get_recipe` (public), `review_site`, `get_review`
(need the key in the MCP config's `Authorization` header). Missing or wrong
keys come back as tool errors, not HTTP 401, so clients don't start an OAuth
flow.

```bash
claude mcp add --transport http slopcheck https://slopcheck.dev/mcp \
  --header "Authorization: Bearer slop_YOUR_KEY"
```
