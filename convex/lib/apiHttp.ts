import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { generateGuestKey, hashApiKey, looksLikeApiKey } from "./apiKey";
import { recipeMarkdown } from "./kitMarkdown";
import { getRecipe, RECIPES, type Recipe } from "./recipes";
import { normalizeAndValidateUrl } from "./url";

/**
 * Public HTTP API (/api/v1/*) and MCP server (/mcp). Both run as Convex HTTP
 * actions; the Next app proxies them under its own domain.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function apiError(status: number, message: string): Response {
  return json({ error: message }, status);
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "https://slopcheck.dev").replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type ApiAuth = {
  keyId: Id<"apiKeys">;
  userId: Id<"users">;
  credits: number;
};

/** `null` = no key sent, `"invalid"` = a key was sent but doesn't work. */
export async function authenticate(
  ctx: ActionCtx,
  request: Request,
): Promise<ApiAuth | null | "invalid"> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const key = match?.[1] ?? request.headers.get("x-api-key") ?? "";
  if (!key) return null;
  if (!looksLikeApiKey(key)) return "invalid";
  const auth = await ctx.runMutation(internal.apiKeys.authenticate, {
    keyHash: await hashApiKey(key),
  });
  return auth ?? "invalid";
}

export const MISSING_KEY_MESSAGE =
  "This needs a Slopcheck API key. Create one at " +
  "https://slopcheck.dev/home/keys and send it as `Authorization: Bearer slop_…`.";

export const INVALID_KEY_MESSAGE =
  "That API key is not valid (revoked or mistyped). Create a new one at https://slopcheck.dev/home/keys.";

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export function recipeSummary(r: Recipe) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    summary: r.summary,
    useWhen: r.useWhen,
    avoidWhen: r.avoidWhen,
    url: appUrl() + "/recipes/" + r.id,
  };
}

export function recipeDetail(r: Recipe) {
  return {
    ...recipeSummary(r),
    support: r.support,
    accessibility: r.accessibility,
    performance: r.performance,
    aiHint: r.aiHint,
    code: { html: r.html, css: r.css, js: r.js ?? null, react: r.react },
    markdown: recipeMarkdown(r),
  };
}

export function listRecipes() {
  return RECIPES.map(recipeSummary);
}

export function findRecipe(id: string): Recipe | undefined {
  return getRecipe(id.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export class ApiInputError extends Error {}

/** Takes one credit, creates the scan and queues the full review. */
export async function startReview(
  ctx: ActionCtx,
  auth: ApiAuth,
  rawUrl: unknown,
): Promise<{
  id: Id<"scans">;
  status: "queued";
  reportUrl: string;
  creditsLeft: number;
}> {
  if (typeof rawUrl !== "string") {
    throw new ApiInputError(
      'Send a JSON body like {"url": "https://example.com"}',
    );
  }
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeAndValidateUrl(rawUrl);
  } catch (error) {
    throw new ApiInputError(
      error instanceof Error ? error.message : "Invalid URL",
    );
  }

  const guestKey = generateGuestKey();
  let scanId: Id<"scans">;
  try {
    scanId = await ctx.runMutation(internal.apiKeys.startReview, {
      keyId: auth.keyId,
      userId: auth.userId,
      url: rawUrl.trim(),
      normalizedUrl,
      guestKey,
    });
  } catch (error) {
    // Out of credits / rate limited — the caller's problem, not ours.
    throw new ApiInputError(
      error instanceof Error ? error.message : "Could not start the review",
    );
  }
  await ctx.scheduler.runAfter(0, internal.apiKeys.runApiReview, {
    scanId,
    userId: auth.userId,
  });

  return {
    id: scanId,
    status: "queued",
    reportUrl:
      appUrl() + "/scans/" + scanId + "?k=" + encodeURIComponent(guestKey),
    creditsLeft: auth.credits - 1,
  };
}

export type ApiReview = {
  id: string;
  url: string;
  status: "queued" | "running" | "ready" | "failed";
  reportUrl: string;
  score?: number;
  verdict?: string;
  summary?: string;
  error?: string;
  tells?: { id: string; label: string; evidence: string }[];
  findings?: {
    area: string;
    severity: string;
    issue: string;
    fixHint: string;
  }[];
  briefMarkdown?: string;
};

export async function getReview(
  ctx: ActionCtx,
  auth: ApiAuth,
  id: string,
): Promise<ApiReview | null> {
  return (await ctx.runQuery(internal.apiKeys.getReviewForApi, {
    scanId: id,
    userId: auth.userId,
  })) as ApiReview | null;
}
