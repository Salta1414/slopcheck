import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import { designKitValidator } from "./lib/kitValidator";
import { TELLS, tellLabel } from "./lib/rubric";

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

export const getScanInternal = internalQuery({
  args: { scanId: v.id("scans") },
  returns: v.union(
    v.object({
      _id: v.id("scans"),
      userId: v.optional(v.id("users")),
      guestKey: v.optional(v.string()),
      url: v.string(),
      normalizedUrl: v.string(),
      status: v.string(),
      estimatedScore: v.optional(v.number()),
      score: v.optional(v.number()),
      verdict: v.optional(verdictValidator),
      freeReviewClaimedAt: v.optional(v.number()),
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
      guestKey: scan.guestKey,
      url: scan.url,
      normalizedUrl: scan.normalizedUrl,
      status: scan.status,
      estimatedScore: scan.estimatedScore,
      score: scan.score,
      verdict: scan.verdict,
      freeReviewClaimedAt: scan.freeReviewClaimedAt,
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

/**
 * Owner view of one scan. Signed-in owners match by account; guests pass the
 * guestKey from localStorage or their private report link.
 */
export const getMine = query({
  args: { scanId: v.id("scans"), guestKey: v.optional(v.string()) },
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
      /** How many findings sit behind the paywall — the text never leaves the server. */
      lockedCount: v.number(),
      errorMessage: v.optional(v.string()),
      freeReviewClaimed: v.boolean(),
      isGuest: v.boolean(),
      createdAt: v.number(),
      review: v.union(
        v.object({
          score: v.number(),
          summary: v.string(),
          findings: v.array(findingValidator),
          prompts: v.array(promptValidator),
          tells: v.array(
            v.object({
              id: v.string(),
              label: v.string(),
              evidence: v.string(),
            }),
          ),
          tellsChecked: v.number(),
          kit: v.union(designKitValidator, v.null()),
        }),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) {
      return null;
    }

    const user = await getCurrentUserOrNull(ctx);
    const ownedByUser = user !== null && scan.userId === user._id;
    const ownedByGuest =
      args.guestKey !== undefined &&
      args.guestKey.length > 0 &&
      scan.guestKey === args.guestKey;
    if (!ownedByUser && !ownedByGuest) {
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
      lockedCount: unlocked ? 0 : (scan.lockedFindings?.length ?? 0),
      errorMessage: scan.errorMessage,
      freeReviewClaimed: scan.freeReviewClaimedAt !== undefined,
      isGuest: !ownedByUser,
      createdAt: scan.createdAt,
      review: reviewDoc
        ? {
            score: reviewDoc.score,
            summary: reviewDoc.summary,
            findings: reviewDoc.findings,
            prompts: reviewDoc.prompts,
            tells: (reviewDoc.tells ?? []).map((t) => ({
              ...t,
              label: tellLabel(t.id),
            })),
            // Reviews from before the checklist existed didn't check any.
            tellsChecked: reviewDoc.rubricVersion ? TELLS.length : 0,
            kit: reviewDoc.kit ?? null,
          }
        : null,
    };
  },
});

/**
 * Claim guest scans after sign-up / sign-in. The client only proves which
 * scans it holds (by guestKey); scores and findings always come from the
 * server copy, so nobody can forge a result by editing localStorage.
 */
export const claimGuestScans = mutation({
  args: {
    guestKeys: v.optional(v.array(v.string())),
    /**
     * Deprecated payload from frontends before guestKeys existed. Only the
     * guestKey of each entry is read — the rest is client data we don't trust.
     */
    scans: v.optional(v.array(v.any())),
  },
  returns: v.object({
    claimed: v.number(),
    scanIds: v.array(v.id("scans")),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const scanIds = [];

    const guestKeys =
      args.guestKeys ??
      (args.scans ?? [])
        .map((scan: { guestKey?: unknown }) => scan?.guestKey)
        .filter((key): key is string => typeof key === "string");
    for (const guestKey of guestKeys.slice(0, 20)) {
      if (guestKey.length < 8) continue;

      const scan = await ctx.db
        .query("scans")
        .withIndex("by_guest_key", (q) => q.eq("guestKey", guestKey))
        .unique();
      if (!scan) continue;
      // Already someone else's — the guestKey alone can't transfer it.
      if (scan.userId !== undefined && scan.userId !== user._id) continue;

      if (scan.userId !== user._id) {
        await ctx.db.patch(scan._id, { userId: user._id, updatedAt: now });
      }
      scanIds.push(scan._id);
    }

    return { claimed: scanIds.length, scanIds };
  },
});
