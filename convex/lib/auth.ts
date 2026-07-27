import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getIdentityOrThrow(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function getCurrentUserOrNull(
  ctx: Ctx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function requireScanOwner(
  ctx: Ctx,
  scanId: Id<"scans">,
): Promise<Doc<"scans">> {
  const user = await getCurrentUser(ctx);
  const scan = await ctx.db.get(scanId);
  if (!scan) {
    throw new Error("Scan not found");
  }
  if (scan.userId !== user._id) {
    throw new Error("Unauthorized");
  }
  return scan;
}
