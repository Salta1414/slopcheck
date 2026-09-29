import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import { displayPrefix, generateApiKey, hashApiKey } from "./lib/apiKey";
import { buildBriefMarkdown } from "./lib/kitMarkdown";
import { tellLabel } from "./lib/rubric";

const MAX_ACTIVE_KEYS = 5;
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_API_HOURLY_LIMIT = 20;

function trialCredits(): number {
  const raw = Number(process.env.API_TRIAL_CREDITS ?? 1);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 1;
}

function apiHourlyLimit(): number {
  const raw = Number(process.env.API_HOURLY_LIMIT);
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DEFAULT_API_HOURLY_LIMIT;
}

function appUrl(): string {
  return (process.env.APP_URL ?? "https://slopcheck.dev").replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Account page
// ---------------------------------------------------------------------------

export const overview = query({
  args: {},
  returns: v.union(
    v.object({
      credits: v.number(),
      keys: v.array(
        v.object({
          _id: v.id("apiKeys"),
          name: v.string(),
          prefix: v.string(),
          createdAt: v.number(),
          lastUsedAt: v.optional(v.number()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);
    return {
      credits: user.apiCredits ?? 0,
      keys: keys
        .filter((k) => k.revokedAt === undefined)
        .map((k) => ({
          _id: k._id,
          name: k.name,
          prefix: k.prefix,
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
        })),
    };
  },
});

/** Returns the plaintext key exactly once. Runs as an action for real randomness. */
export const create = action({
  args: { name: v.string() },
  returns: v.object({ key: v.string() }),
  handler: async (ctx, args): Promise<{ key: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId: Id<"users"> = await ctx.runMutation(
      internal.users.ensureUserInternal,
      {},
    );
    const key = generateApiKey();
    await ctx.runMutation(internal.apiKeys.insertKey, {
      userId,
      name: args.name.trim().slice(0, 60) || "Default",
      keyHash: await hashApiKey(key),
      prefix: displayPrefix(key),
    });
    return { key };
  },
});

export const insertKey = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    prefix: v.string(),
  },
  returns: v.id("apiKeys"),
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(100);
    const active = keys.filter((k) => k.revokedAt === undefined);
    if (active.length >= MAX_ACTIVE_KEYS) {
      throw new Error(
        `You can have ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`,
      );
    }

    // First key ever: a free trial credit so the MCP server can be tried for real.
    const user = await ctx.db.get(args.userId);
    if (user && user.apiTrialGrantedAt === undefined) {
      await ctx.db.patch(args.userId, {
        apiCredits: (user.apiCredits ?? 0) + trialCredits(),
        apiTrialGrantedAt: Date.now(),
      });
    }

    return await ctx.db.insert("apiKeys", {
      userId: args.userId,
      name: args.name,
      keyHash: args.keyHash,
      prefix: args.prefix,
      createdAt: Date.now(),
    });
  },
});

export const revoke = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== user._id) throw new Error("Key not found");
    if (key.revokedAt === undefined) {
      await ctx.db.patch(args.keyId, { revokedAt: Date.now() });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// HTTP API internals
// ---------------------------------------------------------------------------

export const authenticate = internalMutation({
  args: { keyHash: v.string() },
  returns: v.union(
    v.object({
      keyId: v.id("apiKeys"),
      userId: v.id("users"),
      credits: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash))
      .unique();
    if (!key || key.revokedAt !== undefined) return null;
    const user = await ctx.db.get(key.userId);
    if (!user) return null;

    const now = Date.now();
    // Only write when it moved noticeably, so hot keys don't contend.
    if (key.lastUsedAt === undefined || now - key.lastUsedAt > 60_000) {
      await ctx.db.patch(key._id, { lastUsedAt: now });
    }
    return {
      keyId: key._id,
      userId: key.userId,
      credits: user.apiCredits ?? 0,
    };
  },
});

/** Takes one credit and creates an unlocked scan. Throws when out of credits. */
export const startReview = internalMutation({
  args: {
    keyId: v.id("apiKeys"),
    userId: v.id("users"),
    url: v.string(),
    normalizedUrl: v.string(),
    guestKey: v.string(),
  },
  returns: v.id("scans"),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const credits = user.apiCredits ?? 0;
    if (credits < 1) {
      throw new Error(
        "No API credits left. Buy more at " + appUrl() + "/developers",
      );
    }

    const now = Date.now();
    const limit = apiHourlyLimit();
    const recent = await ctx.db
      .query("scans")
      .withIndex("by_api_key_and_created", (q) =>
        q.eq("apiKeyId", args.keyId).gte("createdAt", now - HOUR_MS),
      )
      .take(limit);
    if (recent.length >= limit) {
      throw new Error(
        `Rate limit: ${limit} reviews per hour per key. Try again later.`,
      );
    }

    await ctx.db.patch(args.userId, { apiCredits: credits - 1 });
    return await ctx.db.insert("scans", {
      userId: args.userId,
      guestKey: args.guestKey,
      apiKeyId: args.keyId,
      url: args.url,
      normalizedUrl: args.normalizedUrl,
      status: "paid",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Runs the full review and gives the credit back if it failed. */
export const runApiReview = internalAction({
  args: { scanId: v.id("scans"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.reviewActions.runFullReview, {
      scanId: args.scanId,
    });
    const scan = await ctx.runQuery(internal.scans.getScanInternal, {
      scanId: args.scanId,
    });
    if (scan?.status === "failed") {
      await ctx.runMutation(internal.apiKeys.addCredits, {
        userId: args.userId,
        credits: 1,
      });
    }
    return null;
  },
});

export const addCredits = internalMutation({
  args: { userId: v.id("users"), credits: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    await ctx.db.patch(args.userId, {
      apiCredits: (user.apiCredits ?? 0) + args.credits,
    });
    return null;
  },
});

const API_STATUS: Record<string, "queued" | "running" | "ready" | "failed"> = {
  pending_capture: "queued",
  paid: "queued",
  capturing: "running",
  preeval_running: "running",
  full_review_running: "running",
  ready: "ready",
  failed: "failed",
};

/**
 * The public JSON shape of a review. Only the account that started the scan
 * through the API can read it.
 */
export const getReviewForApi = internalQuery({
  args: { scanId: v.string(), userId: v.id("users") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const scanId = ctx.db.normalizeId("scans", args.scanId);
    if (!scanId) return null;
    const scan = await ctx.db.get(scanId);
    if (!scan || scan.userId !== args.userId || scan.apiKeyId === undefined) {
      return null;
    }

    const base = {
      id: scan._id,
      url: scan.normalizedUrl,
      status: API_STATUS[scan.status] ?? "running",
      reportUrl:
        appUrl() +
        "/scans/" +
        scan._id +
        "?k=" +
        encodeURIComponent(scan.guestKey ?? ""),
      createdAt: new Date(scan.createdAt).toISOString(),
    };

    if (scan.status === "failed") {
      return {
        ...base,
        error: scan.errorMessage ?? "Review failed",
        creditRefunded: true,
      };
    }
    if (scan.status !== "ready") return base;

    const review = await ctx.db
      .query("reviews")
      .withIndex("by_scan", (q) => q.eq("scanId", scan._id))
      .unique();
    if (!review || !review.kit) return { ...base, status: "running" };

    const tells = (review.tells ?? []).map((t) => ({
      id: t.id,
      label: tellLabel(t.id),
      evidence: t.evidence,
    }));

    return {
      ...base,
      score: review.score,
      verdict: scan.verdict,
      summary: review.summary,
      criteria: review.criteriaScores ?? {},
      tells,
      findings: review.findings,
      kit: review.kit,
      briefMarkdown: buildBriefMarkdown({
        url: scan.normalizedUrl,
        score: review.score,
        tells: tells.map((t) => ({ label: t.label, evidence: t.evidence })),
        findings: review.findings,
        kit: review.kit,
      }),
    };
  },
});

// ---------------------------------------------------------------------------
// Credit packs (Stripe)
// ---------------------------------------------------------------------------

export const createCreditPurchase = internalMutation({
  args: {
    userId: v.id("users"),
    stripeSessionId: v.string(),
    credits: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("creditPurchases", {
      userId: args.userId,
      stripeSessionId: args.stripeSessionId,
      credits: args.credits,
      status: "created",
      createdAt: Date.now(),
    });
    return null;
  },
});

/** Idempotent: Stripe may deliver the same webhook more than once. */
export const markCreditPurchasePaid = internalMutation({
  args: { stripeSessionId: v.string(), email: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("creditPurchases")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .unique();
    if (!purchase || purchase.status === "paid") return null;

    await ctx.db.patch(purchase._id, {
      status: "paid",
      paidAt: Date.now(),
      ...(args.email ? { email: args.email } : {}),
    });
    const user = await ctx.db.get(purchase.userId);
    if (user) {
      await ctx.db.patch(user._id, {
        apiCredits: (user.apiCredits ?? 0) + purchase.credits,
      });
    }
    return null;
  },
});
