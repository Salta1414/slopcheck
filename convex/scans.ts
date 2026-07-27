import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";

const verdictValidator = v.union(
  v.literal("fresh"),
  v.literal("mixed"),
  v.literal("likely_slop"),
  v.literal("peak_slop"),
);

const findingValidator = v.object({
  area: v.string(),
  severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  issue: v.string(),
  whyItFeelsAi: v.string(),
  fixHint: v.string(),
});

const promptValidator = v.object({
  tool: v.string(),
  title: v.string(),
  prompt: v.string(),
});

const guestScanValidator = v.object({
  guestKey: v.string(),
  url: v.string(),
  normalizedUrl: v.string(),
  estimatedScore: v.number(),
  verdict: verdictValidator,
  teaserFlags: v.array(v.string()),
  lockedFindings: v.optional(v.array(v.string())),
  lockedPrompts: v.optional(v.array(v.string())),
  createdAt: v.number(),
});

function normalizeUrl(raw: string): string {
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export const getScanInternal = internalQuery({
  args: { scanId: v.id("scans") },
  returns: v.union(
    v.object({
      _id: v.id("scans"),
      userId: v.optional(v.id("users")),
      url: v.string(),
      normalizedUrl: v.string(),
      status: v.string(),
      estimatedScore: v.optional(v.number()),
      score: v.optional(v.number()),
      verdict: v.optional(verdictValidator),
      screenshotStorageId: v.optional(v.id("_storage")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;
    return {
      _id: scan._id,
      userId: scan.userId,
      url: scan.url,
      normalizedUrl: scan.normalizedUrl,
      status: scan.status,
      estimatedScore: scan.estimatedScore,
      score: scan.score,
      verdict: scan.verdict,
      screenshotStorageId: scan.screenshotStorageId,
    };
  },
});

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("scans"),
      url: v.string(),
      status: v.string(),
      estimatedScore: v.optional(v.number()),
      score: v.optional(v.number()),
      verdict: v.optional(verdictValidator),
      teaserFlags: v.optional(v.array(v.string())),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return [];
    }

    const scans = await ctx.db
      .query("scans")
      .withIndex("by_user_and_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return scans.map((scan) => ({
      _id: scan._id,
      url: scan.url,
      status: scan.status,
      estimatedScore: scan.estimatedScore,
      score: scan.score,
      verdict: scan.verdict,
      teaserFlags: scan.teaserFlags,
      createdAt: scan.createdAt,
    }));
  },
});

export const getMine = query({
  args: { scanId: v.id("scans") },
  returns: v.union(
    v.object({
      _id: v.id("scans"),
      url: v.string(),
      normalizedUrl: v.string(),
      status: v.string(),
      estimatedScore: v.optional(v.number()),
      score: v.optional(v.number()),
      verdict: v.optional(verdictValidator),
      teaserFlags: v.optional(v.array(v.string())),
      lockedFindings: v.optional(v.array(v.string())),
      lockedPrompts: v.optional(v.array(v.string())),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
      review: v.union(
        v.object({
          score: v.number(),
          summary: v.string(),
          findings: v.array(findingValidator),
          prompts: v.array(promptValidator),
        }),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }

    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== user._id) {
      return null;
    }

    const unlocked =
      scan.status === "ready" ||
      scan.status === "paid" ||
      scan.status === "full_review_running";

    const reviewDoc = unlocked
      ? await ctx.db
          .query("reviews")
          .withIndex("by_scan", (q) => q.eq("scanId", scan._id))
          .unique()
      : null;

    return {
      _id: scan._id,
      url: scan.url,
      normalizedUrl: scan.normalizedUrl,
      status: scan.status,
      estimatedScore: scan.estimatedScore,
      score: scan.score,
      verdict: scan.verdict,
      teaserFlags: scan.teaserFlags,
      lockedFindings: unlocked ? undefined : scan.lockedFindings,
      lockedPrompts: unlocked ? undefined : scan.lockedPrompts,
      errorMessage: scan.errorMessage,
      createdAt: scan.createdAt,
      review: reviewDoc
        ? {
            score: reviewDoc.score,
            summary: reviewDoc.summary,
            findings: reviewDoc.findings,
            prompts: reviewDoc.prompts,
          }
        : null,
    };
  },
});

/**
 * Claim guest scans from localStorage after sign-up / sign-in.
 * Overwrites ownership onto the authenticated user.
 */
export const claimGuestScans = mutation({
  args: {
    scans: v.array(guestScanValidator),
  },
  returns: v.object({
    claimed: v.number(),
    scanIds: v.array(v.id("scans")),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const scanIds = [];

    for (const guest of args.scans) {
      let normalizedUrl: string;
      try {
        normalizedUrl = normalizeUrl(guest.normalizedUrl || guest.url);
      } catch {
        continue;
      }

      const existing = await ctx.db
        .query("scans")
        .withIndex("by_guest_key", (q) => q.eq("guestKey", guest.guestKey))
        .unique();

      // Don't downgrade paid/ready scans
      const preserveStatus =
        existing &&
        (existing.status === "ready" ||
          existing.status === "paid" ||
          existing.status === "full_review_running" ||
          existing.status === "awaiting_payment");

      if (existing) {
        await ctx.db.patch(existing._id, {
          userId: user._id,
          guestKey: guest.guestKey,
          url: guest.url,
          normalizedUrl,
          status: preserveStatus ? existing.status : "preeval_ready",
          estimatedScore: guest.estimatedScore,
          verdict: guest.verdict,
          teaserFlags: guest.teaserFlags,
          lockedFindings: guest.lockedFindings,
          lockedPrompts: guest.lockedPrompts,
          updatedAt: now,
        });
        scanIds.push(existing._id);
        continue;
      }

      const id = await ctx.db.insert("scans", {
        userId: user._id,
        guestKey: guest.guestKey,
        url: guest.url,
        normalizedUrl,
        status: "preeval_ready",
        estimatedScore: guest.estimatedScore,
        verdict: guest.verdict,
        teaserFlags: guest.teaserFlags,
        lockedFindings: guest.lockedFindings,
        lockedPrompts: guest.lockedPrompts,
        createdAt: guest.createdAt || now,
        updatedAt: now,
      });
      scanIds.push(id);
    }

    return { claimed: scanIds.length, scanIds };
  },
});
