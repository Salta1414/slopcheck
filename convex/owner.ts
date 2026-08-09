import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";

const DEFAULT_OWNER_EMAIL = "domenic.wehkamp@web.de";
const MAX_STATS_DOCUMENTS = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const verdictValidator = v.union(
  v.literal("fresh"),
  v.literal("mixed"),
  v.literal("likely_slop"),
  v.literal("peak_slop"),
);

const statusCountsValidator = v.object({
  pendingCapture: v.number(),
  capturing: v.number(),
  preevalRunning: v.number(),
  preevalReady: v.number(),
  awaitingPayment: v.number(),
  paid: v.number(),
  fullReviewRunning: v.number(),
  ready: v.number(),
  failed: v.number(),
});

const verdictCountsValidator = v.object({
  fresh: v.number(),
  mixed: v.number(),
  likelySlop: v.number(),
  peakSlop: v.number(),
});

const recentScanValidator = v.object({
  _id: v.id("scans"),
  url: v.string(),
  status: v.string(),
  score: v.union(v.number(), v.null()),
  verdict: v.union(verdictValidator, v.null()),
  createdAt: v.number(),
  ownerEmail: v.union(v.string(), v.null()),
});

const overviewValidator = v.object({
  ownerEmail: v.string(),
  users: v.object({
    total: v.number(),
    newLast7Days: v.number(),
    newLast30Days: v.number(),
  }),
  scans: v.object({
    total: v.number(),
    completed: v.number(),
    inProgress: v.number(),
    failed: v.number(),
    scored: v.number(),
    averageScore: v.union(v.number(), v.null()),
    last7Days: v.number(),
    statuses: statusCountsValidator,
    verdicts: verdictCountsValidator,
  }),
  revenue: v.object({
    paidCount: v.number(),
    paidRevenueCents: v.number(),
    paidLast30DaysCents: v.number(),
    refundedCount: v.number(),
  }),
  recentScans: v.array(recentScanValidator),
});

export async function getOwnerIdentity(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const configuredOwnerEmail =
    process.env.OWNER_EMAIL?.trim().toLowerCase() || DEFAULT_OWNER_EMAIL;
  const configuredOwnerClerkId = process.env.OWNER_CLERK_ID?.trim();
  const matchesClerkId =
    configuredOwnerClerkId !== undefined &&
    identity.subject === configuredOwnerClerkId;
  const matchesEmail =
    identity.email?.trim().toLowerCase() === configuredOwnerEmail;

  if (!matchesClerkId && !matchesEmail) {
    return null;
  }

  return identity;
}

export const overview = query({
  args: {
    now: v.number(),
  },
  returns: v.union(overviewValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await getOwnerIdentity(ctx);
    if (!identity) {
      return null;
    }

    const last7Days = args.now - 7 * DAY_MS;
    const last30Days = args.now - 30 * DAY_MS;

    const userEmails = new Map<string, string>();
    let totalUsers = 0;
    let newUsersLast7Days = 0;
    let newUsersLast30Days = 0;

    // Convex allows only one paginated query per function. Keep this owner-only
    // dashboard bounded while the product is small; increase the cap alongside
    // a dedicated aggregation path if these tables outgrow it.
    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(MAX_STATS_DOCUMENTS);

    for (const user of users) {
      totalUsers += 1;
      if (user.createdAt >= last7Days) {
        newUsersLast7Days += 1;
      }
      if (user.createdAt >= last30Days) {
        newUsersLast30Days += 1;
      }
      if (user.email) {
        userEmails.set(user._id, user.email);
      }
    }

    const statusCounts = {
      pendingCapture: 0,
      capturing: 0,
      preevalRunning: 0,
      preevalReady: 0,
      awaitingPayment: 0,
      paid: 0,
      fullReviewRunning: 0,
      ready: 0,
      failed: 0,
    };
    const verdictCounts = {
      fresh: 0,
      mixed: 0,
      likelySlop: 0,
      peakSlop: 0,
    };
    const recentScans: Array<{
      _id: Id<"scans">;
      url: string;
      status: string;
      score: number | null;
      verdict: "fresh" | "mixed" | "likely_slop" | "peak_slop" | null;
      createdAt: number;
      ownerEmail: string | null;
    }> = [];

    let totalScans = 0;
    let completedScans = 0;
    let failedScans = 0;
    let scoredScans = 0;
    let scoreTotal = 0;
    let scansLast7Days = 0;

    const scans = await ctx.db
      .query("scans")
      .order("desc")
      .take(MAX_STATS_DOCUMENTS);

    for (const scan of scans) {
      totalScans += 1;
      if (scan.createdAt >= last7Days) {
        scansLast7Days += 1;
      }

      switch (scan.status) {
        case "pending_capture":
          statusCounts.pendingCapture += 1;
          break;
        case "capturing":
          statusCounts.capturing += 1;
          break;
        case "preeval_running":
          statusCounts.preevalRunning += 1;
          break;
        case "preeval_ready":
          statusCounts.preevalReady += 1;
          break;
        case "awaiting_payment":
          statusCounts.awaitingPayment += 1;
          break;
        case "paid":
          statusCounts.paid += 1;
          break;
        case "full_review_running":
          statusCounts.fullReviewRunning += 1;
          break;
        case "ready":
          statusCounts.ready += 1;
          completedScans += 1;
          break;
        case "failed":
          statusCounts.failed += 1;
          failedScans += 1;
          break;
      }

      const score = scan.score ?? scan.estimatedScore;
      if (score !== undefined) {
        scoredScans += 1;
        scoreTotal += score;
      }

      switch (scan.verdict) {
        case "fresh":
          verdictCounts.fresh += 1;
          break;
        case "mixed":
          verdictCounts.mixed += 1;
          break;
        case "likely_slop":
          verdictCounts.likelySlop += 1;
          break;
        case "peak_slop":
          verdictCounts.peakSlop += 1;
          break;
      }

      if (recentScans.length < 8) {
        recentScans.push({
          _id: scan._id,
          url: scan.url,
          status: scan.status,
          score: score ?? null,
          verdict: scan.verdict ?? null,
          createdAt: scan.createdAt,
          ownerEmail: scan.userId
            ? (userEmails.get(scan.userId) ?? null)
            : null,
        });
      }
    }

    let paidCount = 0;
    let paidRevenueCents = 0;
    let paidLast30DaysCents = 0;
    let refundedCount = 0;

    const payments = await ctx.db
      .query("payments")
      .order("desc")
      .take(MAX_STATS_DOCUMENTS);

    for (const payment of payments) {
      if (payment.status === "paid") {
        paidCount += 1;
        paidRevenueCents += payment.amountCents;
        const paidAt = payment.paidAt ?? payment.createdAt;
        if (paidAt >= last30Days) {
          paidLast30DaysCents += payment.amountCents;
        }
      } else if (payment.status === "refunded") {
        refundedCount += 1;
      }
    }

    return {
      ownerEmail:
        identity.email ??
        process.env.OWNER_EMAIL?.trim() ??
        DEFAULT_OWNER_EMAIL,
      users: {
        total: totalUsers,
        newLast7Days: newUsersLast7Days,
        newLast30Days: newUsersLast30Days,
      },
      scans: {
        total: totalScans,
        completed: completedScans,
        inProgress: totalScans - completedScans - failedScans,
        failed: failedScans,
        scored: scoredScans,
        averageScore:
          scoredScans > 0
            ? Math.round((scoreTotal / scoredScans) * 10) / 10
            : null,
        last7Days: scansLast7Days,
        statuses: statusCounts,
        verdicts: verdictCounts,
      },
      revenue: {
        paidCount,
        paidRevenueCents,
        paidLast30DaysCents,
        refundedCount,
      },
      recentScans,
    };
  },
});
