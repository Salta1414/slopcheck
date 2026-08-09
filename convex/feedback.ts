import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getIdentityOrThrow } from "./lib/auth";
import { getOwnerIdentity } from "./owner";

const feedbackItemValidator = v.object({
  _id: v.id("feedback"),
  userId: v.id("users"),
  scanId: v.optional(v.id("scans")),
  title: v.string(),
  message: v.string(),
  email: v.optional(v.string()),
  twitter: v.optional(v.string()),
  createdAt: v.number(),
});

export const create = mutation({
  args: {
    scanId: v.optional(v.id("scans")),
    title: v.string(),
    message: v.string(),
    email: v.optional(v.string()),
    twitter: v.optional(v.string()),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    await getIdentityOrThrow(ctx);
    const user = await getCurrentUser(ctx);
    const title = args.title.trim();
    const message = args.message.trim();
    const email = args.email?.trim() || undefined;
    const twitter = args.twitter?.trim() || undefined;

    if (title.length < 2) {
      throw new Error("Please add a short feedback title");
    }
    if (title.length > 120) {
      throw new Error("Feedback title is too long");
    }
    if (message.length < 5) {
      throw new Error("Please tell us a little more");
    }
    if (message.length > 5000) {
      throw new Error("Feedback message is too long");
    }
    if (email && (email.length > 320 || !email.includes("@"))) {
      throw new Error("Please enter a valid email address");
    }
    if (twitter && twitter.length > 100) {
      throw new Error("X/Twitter handle is too long");
    }

    if (args.scanId) {
      const scan = await ctx.db.get(args.scanId);
      if (!scan) {
        throw new Error("Scan not found");
      }
      if (scan.userId !== user._id) {
        throw new Error("Unauthorized");
      }
    }

    return await ctx.db.insert("feedback", {
      userId: user._id,
      scanId: args.scanId,
      title,
      message,
      email,
      twitter,
      createdAt: Date.now(),
    });
  },
});

export const listForOwner = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(feedbackItemValidator),
  handler: async (ctx, args) => {
    const owner = await getOwnerIdentity(ctx);
    if (!owner) {
      return [];
    }

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 50), 1), 100);
    return await ctx.db
      .query("feedback")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});
