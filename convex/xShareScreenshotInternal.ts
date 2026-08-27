import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const challengeValidator = v.object({
  _id: v.id("screenshotShareChallenges"),
  _creationTime: v.number(),
  scanId: v.id("scans"),
  userId: v.id("users"),
  proof: v.string(),
  postText: v.string(),
  expectedScore: v.number(),
  expectedUrl: v.string(),
  screenshotStorageId: v.optional(v.id("_storage")),
  createdAt: v.number(),
  expiresAt: v.number(),
});

async function deleteChallenge(
  ctx: MutationCtx,
  challenge: Doc<"screenshotShareChallenges">,
) {
  if (challenge.screenshotStorageId) {
    await ctx.storage.delete(challenge.screenshotStorageId);
  }
  await ctx.db.delete(challenge._id);
}

export const createChallenge = internalMutation({
  args: {
    scanId: v.id("scans"),
    userId: v.id("users"),
    proof: v.string(),
    postText: v.string(),
    expectedScore: v.number(),
    expectedUrl: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  returns: v.id("screenshotShareChallenges"),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== args.userId) {
      throw new Error("Scan not found");
    }

    const existing = await ctx.db
      .query("screenshotShareChallenges")
      .withIndex("by_scan", (q) => q.eq("scanId", args.scanId))
      .collect();
    await Promise.all(existing.map((challenge) => deleteChallenge(ctx, challenge)));

    const challengeId = await ctx.db.insert("screenshotShareChallenges", args);
    await ctx.scheduler.runAfter(
      Math.max(0, args.expiresAt - Date.now()),
      internal.xShareScreenshotInternal.consumeChallenge,
      { challengeId },
    );
    return challengeId;
  },
});

export const getChallenge = internalQuery({
  args: { challengeId: v.id("screenshotShareChallenges") },
  returns: v.union(challengeValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.challengeId);
  },
});

export const attachScreenshot = internalMutation({
  args: {
    challengeId: v.id("screenshotShareChallenges"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Share challenge not found");
    if (challenge.expiresAt < Date.now()) {
      await deleteChallenge(ctx, challenge);
      throw new Error("Share challenge expired");
    }

    if (
      challenge.screenshotStorageId &&
      challenge.screenshotStorageId !== args.storageId
    ) {
      await ctx.storage.delete(challenge.screenshotStorageId);
    }
    await ctx.db.patch(challenge._id, { screenshotStorageId: args.storageId });
    return null;
  },
});

export const consumeChallenge = internalMutation({
  args: { challengeId: v.id("screenshotShareChallenges") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (challenge) await deleteChallenge(ctx, challenge);
    return null;
  },
});

export const finishChallenge = internalMutation({
  args: { challengeId: v.id("screenshotShareChallenges") },
  returns: v.object({
    status: v.union(
      v.literal("started"),
      v.literal("already_running"),
      v.literal("already_ready"),
    ),
  }),
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Share challenge not found");
    if (challenge.expiresAt < Date.now()) {
      await deleteChallenge(ctx, challenge);
      throw new Error("Share challenge expired");
    }

    const scan = await ctx.db.get(challenge.scanId);
    if (!scan || scan.userId !== challenge.userId) {
      await deleteChallenge(ctx, challenge);
      throw new Error("Scan not found");
    }

    if (scan.status === "ready") {
      await deleteChallenge(ctx, challenge);
      return { status: "already_ready" as const };
    }

    if (
      scan.freeReviewClaimedAt ||
      scan.status === "paid" ||
      scan.status === "full_review_running"
    ) {
      await deleteChallenge(ctx, challenge);
      return { status: "already_running" as const };
    }

    if (
      scan.status !== "preeval_ready" &&
      scan.status !== "awaiting_payment" &&
      scan.status !== "failed"
    ) {
      await deleteChallenge(ctx, challenge);
      throw new Error("This scan is not ready for a full review yet");
    }

    const now = Date.now();
    await ctx.db.patch(scan._id, {
      sharedAt: now,
      freeReviewClaimedAt: now,
      xVerifiedAt: now,
      xShareMethod: "screenshot",
      xShareProof: challenge.proof,
      status: "paid",
      updatedAt: now,
    });
    await deleteChallenge(ctx, challenge);
    await ctx.scheduler.runAfter(0, internal.reviewActions.runFullReview, {
      scanId: scan._id,
    });

    return { status: "started" as const };
  },
});
