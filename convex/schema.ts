import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_clerk", ["clerkId"]),

  scans: defineTable({
    userId: v.optional(v.id("users")),
    guestKey: v.optional(v.string()),
    url: v.string(),
    normalizedUrl: v.string(),
    status: v.union(
      v.literal("pending_capture"),
      v.literal("capturing"),
      v.literal("preeval_running"),
      v.literal("preeval_ready"),
      v.literal("awaiting_payment"),
      v.literal("paid"),
      v.literal("full_review_running"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    estimatedScore: v.optional(v.number()),
    score: v.optional(v.number()),
    verdict: v.optional(
      v.union(
        v.literal("fresh"),
        v.literal("mixed"),
        v.literal("likely_slop"),
        v.literal("peak_slop"),
      ),
    ),
    teaserFlags: v.optional(v.array(v.string())),
    lockedFindings: v.optional(v.array(v.string())),
    lockedPrompts: v.optional(v.array(v.string())),
    preevalModel: v.optional(v.string()),
    screenshotProvider: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),
    /** Paid full-review mobile capture (390×844) */
    mobileScreenshotStorageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
    sharedAt: v.optional(v.number()),
    freeReviewClaimedAt: v.optional(v.number()),
    xPostId: v.optional(v.string()),
    xAuthorId: v.optional(v.string()),
    xVerifiedAt: v.optional(v.number()),
    xShareMethod: v.optional(
      v.union(v.literal("api"), v.literal("screenshot")),
    ),
    xShareProof: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_guest_key", ["guestKey"])
    .index("by_user_and_created", ["userId", "createdAt"]),

  xShareChallenges: defineTable({
    state: v.string(),
    codeVerifier: v.string(),
    scanId: v.id("scans"),
    userId: v.id("users"),
    postText: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_scan", ["scanId"]),

  screenshotShareChallenges: defineTable({
    scanId: v.id("scans"),
    userId: v.id("users"),
    proof: v.string(),
    postText: v.string(),
    expectedScore: v.number(),
    expectedUrl: v.string(),
    screenshotStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_scan", ["scanId"])
    .index("by_user", ["userId"]),

  payments: defineTable({
    scanId: v.id("scans"),
    userId: v.id("users"),
    stripeSessionId: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("created"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_scan", ["scanId"])
    .index("by_stripe_session", ["stripeSessionId"])
    .index("by_user", ["userId"]),

  reviews: defineTable({
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
    createdAt: v.number(),
  }).index("by_scan", ["scanId"]),

  feedback: defineTable({
    userId: v.id("users"),
    scanId: v.optional(v.id("scans")),
    title: v.string(),
    message: v.string(),
    email: v.optional(v.string()),
    twitter: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"])
    .index("by_scan", ["scanId"]),
});
