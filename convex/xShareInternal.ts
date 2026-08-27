import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

export const createChallenge = internalMutation({
  args: {
    state: v.string(),
    codeVerifier: v.string(),
    scanId: v.id("scans"),
    userId: v.id("users"),
    postText: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  returns: v.id("xShareChallenges"),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== args.userId) {
      throw new Error("Scan not found");
    }

    const existing = await ctx.db
      .query("xShareChallenges")
      .withIndex("by_scan", (q) => q.eq("scanId", args.scanId))
      .collect();
    await Promise.all(existing.map((challenge) => ctx.db.delete(challenge._id)));

    const challengeId = await ctx.db.insert("xShareChallenges", args);
    await ctx.scheduler.runAfter(
      Math.max(0, args.expiresAt - Date.now()),
      internal.xShareInternal.consumeChallenge,
      { challengeId },
    );
    return challengeId;
  },
});

export const getChallenge = internalQuery({
  args: { state: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("xShareChallenges"),
      _creationTime: v.number(),
      state: v.string(),
      codeVerifier: v.string(),
      scanId: v.id("scans"),
      userId: v.id("users"),
      postText: v.string(),
      createdAt: v.number(),
      expiresAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("xShareChallenges")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
  },
});

export const consumeChallenge = internalMutation({
  args: { challengeId: v.id("xShareChallenges") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (challenge) await ctx.db.delete(args.challengeId);
    return null;
  },
});

export const finishChallenge = internalMutation({
  args: {
    challengeId: v.id("xShareChallenges"),
    xPostId: v.string(),
    xAuthorId: v.string(),
  },
  returns: v.object({
    status: v.union(
      v.literal("started"),
      v.literal("already_running"),
      v.literal("already_ready"),
    ),
  }),
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("X share challenge not found");
    if (challenge.expiresAt < Date.now()) {
      await ctx.db.delete(args.challengeId);
      throw new Error("X share challenge expired");
    }

    const scan = await ctx.db.get(challenge.scanId);
    if (!scan || scan.userId !== challenge.userId) {
      await ctx.db.delete(args.challengeId);
      throw new Error("Scan not found");
    }

    if (scan.status === "ready") {
      await ctx.db.delete(args.challengeId);
      return { status: "already_ready" as const };
    }

    if (
      scan.freeReviewClaimedAt ||
      scan.status === "paid" ||
      scan.status === "full_review_running"
    ) {
      await ctx.db.delete(args.challengeId);
      return { status: "already_running" as const };
    }

    if (
      scan.status !== "preeval_ready" &&
      scan.status !== "awaiting_payment" &&
      scan.status !== "failed"
    ) {
      await ctx.db.delete(args.challengeId);
      throw new Error("This scan is not ready for a full review yet");
    }

    const now = Date.now();
    await ctx.db.patch(scan._id, {
      sharedAt: now,
      freeReviewClaimedAt: now,
      xPostId: args.xPostId,
      xAuthorId: args.xAuthorId,
      xVerifiedAt: now,
      status: "paid",
      updatedAt: now,
    });
    await ctx.db.delete(args.challengeId);
    await ctx.scheduler.runAfter(0, internal.reviewActions.runFullReview, {
      scanId: scan._id,
    });

    return { status: "started" as const };
  },
});
