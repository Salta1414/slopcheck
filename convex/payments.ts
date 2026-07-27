"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function requireStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set on Convex");
  }
  return new Stripe(key);
}

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function priceId(): string {
  const id = process.env.STRIPE_PRICE_FULL_REVIEW;
  if (!id) {
    throw new Error("STRIPE_PRICE_FULL_REVIEW is not set on Convex");
  }
  return id;
}

/**
 * Create Stripe Checkout Session for a claimed scan (€5 unlock).
 */
export const createCheckoutSession = action({
  args: {
    scanId: v.id("scans"),
  },
  returns: v.object({
    url: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; sessionId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId: Id<"users"> = await ctx.runMutation(
      internal.users.ensureUserInternal,
      {},
    );

    const scan = await ctx.runQuery(internal.scans.getScanInternal, {
      scanId: args.scanId,
    });
    if (!scan) throw new Error("Scan not found");
    if (scan.userId !== userId) throw new Error("Unauthorized");
    if (
      scan.status !== "preeval_ready" &&
      scan.status !== "awaiting_payment" &&
      scan.status !== "failed"
    ) {
      if (scan.status === "ready" || scan.status === "paid" || scan.status === "full_review_running") {
        throw new Error("This scan is already unlocked or processing");
      }
      throw new Error("Scan is not ready for payment yet");
    }

    const stripe = requireStripe();
    const base = appUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId(), quantity: 1 }],
      success_url: `${base}/scans/${args.scanId}?paid=1`,
      cancel_url: `${base}/scans/${args.scanId}?canceled=1`,
      customer_email: identity.email ?? undefined,
      client_reference_id: args.scanId,
      metadata: {
        scanId: args.scanId,
        userId,
        clerkId: identity.subject,
      },
      // Account has Managed Payments on by default; we sell a simple digital unlock.
      // Product also has tax_code=txcd_10000000 — disable managed payments for this flow.
      managed_payments: { enabled: false },
      // Do NOT pass payment_method_types — use dynamic payment methods
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    await ctx.runMutation(internal.scanInternal.createPaymentRecord, {
      scanId: args.scanId,
      userId,
      stripeSessionId: session.id,
      amountCents: 500,
      currency: "eur",
    });

    await ctx.runMutation(internal.scanInternal.markAwaitingPayment, {
      scanId: args.scanId,
    });

    return { url: session.url, sessionId: session.id };
  },
});

/**
 * Verify Stripe signature (Node) then process checkout.session.completed.
 */
export const verifyAndHandleWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set on Convex");
    }

    const stripe = requireStripe();
    const event = stripe.webhooks.constructEvent(
      args.body,
      args.signature,
      secret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const scanId =
        session.metadata?.scanId ?? session.client_reference_id ?? undefined;

      await ctx.runAction(internal.payments.handleCheckoutCompleted, {
        stripeSessionId: session.id,
        scanId,
      });
    }

    return null;
  },
});

/**
 * Called after verified checkout.session.completed
 */
export const handleCheckoutCompleted = internalAction({
  args: {
    stripeSessionId: v.string(),
    scanId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(
      internal.scanInternal.markPaidAndQueueReview,
      {
        stripeSessionId: args.stripeSessionId,
        scanId: args.scanId
          ? (args.scanId as Id<"scans">)
          : undefined,
      },
    );

    if (!result || result.alreadyPaid) {
      return null;
    }

    await ctx.scheduler.runAfter(0, internal.reviewActions.runFullReview, {
      scanId: result.scanId,
    });

    return null;
  },
});