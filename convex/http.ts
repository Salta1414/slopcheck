import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await request.text();

    try {
      await ctx.runAction(internal.payments.verifyAndHandleWebhook, {
        body,
        signature,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook failed";
      console.error("Stripe webhook error:", message);
      return new Response(message, { status: 400 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/x/share/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const appUrl = (process.env.APP_URL ?? "https://slopcheck.dev").replace(
      /\/$/,
      "",
    );

    if (!state) {
      return Response.redirect(`${appUrl}/?x_share_error=1`, 303);
    }

    try {
      const result = await ctx.runAction(
        internal.xShareCallback.completeXShare,
        {
          state,
          code: code ?? undefined,
          error: error ?? undefined,
        },
      );
      const destination = new URL(`/scans/${result.scanId}`, `${appUrl}/`);

      if (result.status === "verified") {
        destination.searchParams.set("x_shared", "1");
      } else if (result.status === "canceled") {
        destination.searchParams.set("x_share_canceled", "1");
      } else if (result.status === "failed") {
        destination.searchParams.set("x_share_error", "1");
      }

      return Response.redirect(destination.toString(), 303);
    } catch (err) {
      console.error(
        "X share callback failed:",
        err instanceof Error ? err.message : "unknown error",
      );
      return Response.redirect(`${appUrl}/?x_share_error=1`, 303);
    }
  }),
});

export default http;
