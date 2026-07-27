import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const verdictValidator = v.union(
  v.literal("fresh"),
  v.literal("mixed"),
  v.literal("likely_slop"),
  v.literal("peak_slop"),
);

export const upsertGuestPreeval = internalMutation({
  args: {
    guestKey: v.string(),
    userId: v.optional(v.id("users")),
    url: v.string(),
    normalizedUrl: v.string(),
    status: v.union(
      v.literal("capturing"),
      v.literal("preeval_running"),
      v.literal("preeval_ready"),
      v.literal("failed"),
    ),
    estimatedScore: v.optional(v.number()),
    verdict: v.optional(verdictValidator),
    teaserFlags: v.optional(v.array(v.string())),
    lockedFindings: v.optional(v.array(v.string())),
    lockedPrompts: v.optional(v.array(v.string())),
    preevalModel: v.optional(v.string()),
    screenshotProvider: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  },
  returns: v.id("scans"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("scans")
      .withIndex("by_guest_key", (q) => q.eq("guestKey", args.guestKey))
      .unique();

    const patch = {
      url: args.url,
      normalizedUrl: args.normalizedUrl,
      status: args.status,
      estimatedScore: args.estimatedScore,
      verdict: args.verdict,
      teaserFlags: args.teaserFlags,
      lockedFindings: args.lockedFindings,
      lockedPrompts: args.lockedPrompts,
      preevalModel: args.preevalModel,
      screenshotProvider: args.screenshotProvider,
      screenshotStorageId: args.screenshotStorageId,
      errorMessage: args.errorMessage,
      updatedAt: now,
      ...(args.userId ? { userId: args.userId } : {}),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("scans", {
      guestKey: args.guestKey,
      userId: args.userId,
      createdAt: args.createdAt,
      ...patch,
    });
  },
});

export const markAwaitingPayment = internalMutation({
  args: { scanId: v.id("scans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) throw new Error("Scan not found");
    await ctx.db.patch(args.scanId, {
      status: "awaiting_payment",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const createPaymentRecord = internalMutation({
  args: {
    scanId: v.id("scans"),
    userId: v.id("users"),
    stripeSessionId: v.string(),
    amountCents: v.number(),
    currency: v.string(),
  },
  returns: v.id("payments"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("payments", {
      scanId: args.scanId,
      userId: args.userId,
      stripeSessionId: args.stripeSessionId,
      amountCents: args.amountCents,
      currency: args.currency,
      status: "created",
      createdAt: Date.now(),
    });
  },
});

export const markPaidAndQueueReview = internalMutation({
  args: {
    stripeSessionId: v.string(),
    scanId: v.optional(v.id("scans")),
  },
  returns: v.union(
    v.object({
      scanId: v.id("scans"),
      alreadyPaid: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .unique();

    let scanId: Id<"scans"> | null = payment?.scanId ?? args.scanId ?? null;
    if (!scanId) return null;

    const scan = await ctx.db.get(scanId);
    if (!scan) return null;

    const now = Date.now();

    if (payment) {
      if (payment.status === "paid") {
        return { scanId, alreadyPaid: true };
      }
      await ctx.db.patch(payment._id, {
        status: "paid",
        paidAt: now,
      });
    }

    if (scan.status === "ready" || scan.status === "full_review_running") {
      return { scanId, alreadyPaid: true };
    }

    await ctx.db.patch(scanId, {
      status: "paid",
      updatedAt: now,
    });

    return { scanId, alreadyPaid: false };
  },
});

export const setFullReviewRunning = internalMutation({
  args: { scanId: v.id("scans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, {
      status: "full_review_running",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const saveFullReview = internalMutation({
  args: {
    scanId: v.id("scans"),
    userId: v.id("users"),
    score: v.number(),
    summary: v.string(),
    findings: v.array(
      v.object({
        area: v.string(),
        severity: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high"),
        ),
        issue: v.string(),
        whyItFeelsAi: v.string(),
        fixHint: v.string(),
      }),
    ),
    prompts: v.array(
      v.object({
        tool: v.string(),
        title: v.string(),
        prompt: v.string(),
      }),
    ),
    model: v.string(),
    screenshotStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("reviews"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_scan", (q) => q.eq("scanId", args.scanId))
      .unique();

    let reviewId: Id<"reviews">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        summary: args.summary,
        findings: args.findings,
        prompts: args.prompts,
        model: args.model,
      });
      reviewId = existing._id;
    } else {
      reviewId = await ctx.db.insert("reviews", {
        scanId: args.scanId,
        userId: args.userId,
        score: args.score,
        summary: args.summary,
        findings: args.findings,
        prompts: args.prompts,
        model: args.model,
        createdAt: now,
      });
    }

    const scanPatch: {
      status: "ready";
      score: number;
      updatedAt: number;
      screenshotStorageId?: Id<"_storage">;
    } = {
      status: "ready",
      score: args.score,
      updatedAt: now,
    };
    if (args.screenshotStorageId) {
      scanPatch.screenshotStorageId = args.screenshotStorageId;
    }
    await ctx.db.patch(args.scanId, scanPatch);

    return reviewId;
  },
});

export const markScanFailed = internalMutation({
  args: {
    scanId: v.id("scans"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
    return null;
  },
});
