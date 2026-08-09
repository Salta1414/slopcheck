"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";

const DEFAULT_OWNER_EMAIL = "domenic.wehkamp@web.de";
const DAY_MS = 24 * 60 * 60 * 1000;

const liveRevenueValidator = v.object({
  currency: v.string(),
  grossRevenueCents: v.number(),
  refundedCents: v.number(),
  netRevenueCents: v.number(),
  grossLast30DaysCents: v.number(),
  refundedLast30DaysCents: v.number(),
  netLast30DaysCents: v.number(),
  paidCount: v.number(),
  refundCount: v.number(),
  livemode: v.boolean(),
  fetchedAt: v.number(),
});

function requireStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set on Convex");
  }
  if (!/^(sk|rk)_live_/.test(key)) {
    throw new Error("Stripe is not configured with a live secret key");
  }
  return new Stripe(key);
}

async function getOwnerIdentity(ctx: ActionCtx) {
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

export const getLiveRevenue = action({
  args: {
    now: v.number(),
  },
  returns: v.union(liveRevenueValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await getOwnerIdentity(ctx);
    if (!identity) {
      return null;
    }

    const stripe = requireStripe();
    const balance = await stripe.balance.retrieve();
    if (!balance.livemode) {
      throw new Error("Stripe returned a non-live balance");
    }

    let currency: string | null = null;
    const trackCurrency = (nextCurrency: string | null): void => {
      if (!nextCurrency) {
        return;
      }
      if (currency && currency !== nextCurrency) {
        throw new Error("Stripe revenue contains multiple currencies");
      }
      currency = nextCurrency;
    };

    const last30Days = args.now - 30 * DAY_MS;
    let grossRevenueCents = 0;
    let grossLast30DaysCents = 0;
    let paidCount = 0;
    let checkoutStartingAfter: string | undefined;

    while (true) {
      const params: Stripe.Checkout.SessionListParams = {
        limit: 100,
        status: "complete",
      };
      if (checkoutStartingAfter) {
        params.starting_after = checkoutStartingAfter;
      }

      const page = await stripe.checkout.sessions.list(params);
      for (const session of page.data) {
        if (session.payment_status !== "paid" || session.amount_total === null) {
          continue;
        }

        trackCurrency(session.currency);
        grossRevenueCents += session.amount_total;
        paidCount += 1;
        if (session.created * 1000 >= last30Days) {
          grossLast30DaysCents += session.amount_total;
        }
      }

      if (!page.has_more) {
        break;
      }
      const lastSession = page.data[page.data.length - 1];
      if (!lastSession) {
        break;
      }
      checkoutStartingAfter = lastSession.id;
    }

    let refundedCents = 0;
    let refundedLast30DaysCents = 0;
    let refundCount = 0;
    let refundStartingAfter: string | undefined;

    while (true) {
      const params: Stripe.RefundListParams = { limit: 100 };
      if (refundStartingAfter) {
        params.starting_after = refundStartingAfter;
      }

      const page = await stripe.refunds.list(params);
      for (const refund of page.data) {
        if (refund.status !== "succeeded") {
          continue;
        }

        trackCurrency(refund.currency);
        refundedCents += refund.amount;
        refundCount += 1;
        if (refund.created * 1000 >= last30Days) {
          refundedLast30DaysCents += refund.amount;
        }
      }

      if (!page.has_more) {
        break;
      }
      const lastRefund = page.data[page.data.length - 1];
      if (!lastRefund) {
        break;
      }
      refundStartingAfter = lastRefund.id;
    }

    return {
      currency: currency ?? "eur",
      grossRevenueCents,
      refundedCents,
      netRevenueCents: grossRevenueCents - refundedCents,
      grossLast30DaysCents,
      refundedLast30DaysCents,
      netLast30DaysCents: grossLast30DaysCents - refundedLast30DaysCents,
      paidCount,
      refundCount,
      livemode: balance.livemode,
      fetchedAt: Date.now(),
    };
  },
});
