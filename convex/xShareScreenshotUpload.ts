import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

export const generateUploadUrl = mutation({
  args: { challengeId: v.id("screenshotShareChallenges") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.userId !== user._id) {
      throw new Error("Share challenge not found");
    }
    if (challenge.expiresAt < Date.now()) {
      if (challenge.screenshotStorageId) {
        await ctx.storage.delete(challenge.screenshotStorageId);
      }
      await ctx.db.delete(challenge._id);
      throw new Error("Share challenge expired");
    }
    return await ctx.storage.generateUploadUrl();
  },
});
