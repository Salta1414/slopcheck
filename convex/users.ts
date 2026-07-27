import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUserOrNull, getIdentityOrThrow } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

async function upsertFromIdentity(ctx: MutationCtx): Promise<Id<"users">> {
  const identity = await getIdentityOrThrow(ctx);
  const now = Date.now();

  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      email: identity.email ?? existing.email,
      name: identity.name ?? existing.name,
      imageUrl: identity.pictureUrl ?? existing.imageUrl,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    clerkId: identity.subject,
    email: identity.email,
    name: identity.name,
    imageUrl: identity.pictureUrl,
    createdAt: now,
    updatedAt: now,
  });
}

export const ensureUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    return await upsertFromIdentity(ctx);
  },
});

export const ensureUserInternal = internalMutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    return await upsertFromIdentity(ctx);
  },
});

export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
    };
  },
});
