import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  ApiInputError,
  apiError,
  authenticate,
  CORS_HEADERS,
  findRecipe,
  getReview,
  INVALID_KEY_MESSAGE,
  json,
  listRecipes,
  MISSING_KEY_MESSAGE,
  recipeDetail,
  startReview,
} from "./lib/apiHttp";
import { handleMcp } from "./lib/mcp";

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await request.text();

    try {
      await ctx.runAction(internal.payments.verifyAndHandleWebhook, {
        body,
        signature,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook failed";
      console.error("Stripe webhook error:", message);
      return new Response(message, { status: 400 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ---------------------------------------------------------------------------
// Public API v1 + MCP (proxied by Next under /api/v1/* and /mcp)
// ---------------------------------------------------------------------------

const preflight = httpAction(async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

for (const pathPrefix of ["/api/v1/"]) {
  http.route({ pathPrefix, method: "OPTIONS", handler: preflight });
}
http.route({ path: "/mcp", method: "OPTIONS", handler: preflight });

/** Last path segment after a prefix, e.g. /api/v1/recipes/liquid-glass. */
function idAfter(request: Request, prefix: string): string {
  const path = new URL(request.url).pathname;
  return decodeURIComponent(path.slice(prefix.length)).replace(/\/+$/, "");
}

http.route({
  path: "/api/v1/recipes",
  method: "GET",
  handler: httpAction(async () => json({ recipes: listRecipes() })),
});

http.route({
  pathPrefix: "/api/v1/recipes/",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const recipe = findRecipe(idAfter(request, "/api/v1/recipes/"));
    return recipe ? json(recipeDetail(recipe)) : apiError(404, "Recipe not found");
  }),
});

http.route({
  path: "/api/v1/account",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (auth === null) return apiError(401, MISSING_KEY_MESSAGE);
    if (auth === "invalid") return apiError(401, INVALID_KEY_MESSAGE);
    return json({ credits: auth.credits });
  }),
});

http.route({
  path: "/api/v1/reviews",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (auth === null) return apiError(401, MISSING_KEY_MESSAGE);
    if (auth === "invalid") return apiError(401, INVALID_KEY_MESSAGE);

    let body: { url?: unknown } = {};
    try {
      body = (await request.json()) as { url?: unknown };
    } catch {
      return apiError(400, 'Send a JSON body like {"url": "https://example.com"}');
    }
    try {
      return json(await startReview(ctx, auth, body.url), 202);
    } catch (error) {
      if (error instanceof ApiInputError) {
        const status = /credits/i.test(error.message)
          ? 402
          : /rate limit/i.test(error.message)
            ? 429
            : 400;
        return apiError(status, error.message);
      }
      throw error;
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/reviews/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticate(ctx, request);
    if (auth === null) return apiError(401, MISSING_KEY_MESSAGE);
    if (auth === "invalid") return apiError(401, INVALID_KEY_MESSAGE);
    const review = await getReview(ctx, auth, idAfter(request, "/api/v1/reviews/"));
    return review ? json(review) : apiError(404, "Review not found");
  }),
});

http.route({
  path: "/mcp",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleMcp(ctx, request)),
});

// Stateless server: no SSE stream to open and no session to delete.
for (const method of ["GET", "DELETE"] as const) {
  http.route({
    path: "/mcp",
    method,
    handler: httpAction(async () =>
      new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST, OPTIONS", ...CORS_HEADERS },
      }),
    ),
  });
}

export default http;
