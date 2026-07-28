import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrNull } from "./lib/auth";

const verdictValidator = v.union(
  v.literal("fresh"),
  v.literal("mixed"),
  v.literal("likely_slop"),
  v.literal("peak_slop"),
);

/**
 * Opt-in: only scans with `sharedAt` are readable through `getPublic`.
 * Guests prove ownership with the guestKey they hold in localStorage.
 */
export const enableShare = mutation({
  args: {
    scanId: v.id("scans"),
    guestKey: v.optional(v.string()),
  },
  returns: v.object({ scanId: v.id("scans"), sharedAt: v.number() }),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) {
      throw new Error("Scan not found");
    }

    const user = await getCurrentUserOrNull(ctx);
    const ownedByUser = user !== null && scan.userId === user._id;
    const ownedByGuest =
      args.guestKey !== undefined && scan.guestKey === args.guestKey;

    if (!ownedByUser && !ownedByGuest) {
      throw new Error("Unauthorized: this scan is not yours to share");
    }

    if (scan.sharedAt) {
      return { scanId: scan._id, sharedAt: scan.sharedAt };
    }

    const sharedAt = Date.now();
    await ctx.db.patch(scan._id, { sharedAt, updatedAt: sharedAt });
    return { scanId: scan._id, sharedAt };
  },
});

export const getPublic = query({
  args: { scanId: v.id("scans") },
  returns: v.union(
    v.object({
      normalizedUrl: v.string(),
      score: v.number(),
      verdict: v.optional(verdictValidator),
      teaserFlags: v.array(v.string()),
      isFullReview: v.boolean(),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan || !scan.sharedAt) {
      return null;
    }

    const review =
      scan.status === "ready"
        ? await ctx.db
            .query("reviews")
            .withIndex("by_scan", (q) => q.eq("scanId", scan._id))
            .unique()
        : null;

    const score = review?.score ?? scan.score ?? scan.estimatedScore;
    if (score === undefined) {
      return null;
    }

    return {
      normalizedUrl: scan.normalizedUrl,
      score,
      verdict: scan.verdict,
      teaserFlags: scan.teaserFlags ?? [],
      isFullReview: review !== null,
      createdAt: scan.createdAt,
    };
  },
});
