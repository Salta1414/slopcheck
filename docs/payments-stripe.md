# Payments — Stripe

## Model

**Einmalzahlung €5** für Full UI Review eines Scans (digitales Unlock).

Empfohlen laut Stripe-Fit: **Stripe Checkout (hosted)** — Redirect, wenig Custom-UI, gute Conversion.

Docs: [Stripe Checkout (hosted)](https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted)

## Flow

```
User hat preeval_ready Scan
  → „Unlock for €5“
  → Convex Action erstellt Checkout Session
       metadata: { scanId, userId, clerkId }
       mode: payment
       line_item: €5 EUR (Price ID oder price_data)
       success_url: /scans/{scanId}?paid=1
       cancel_url: /scans/{scanId}
  → Redirect zu Stripe
  → Webhook checkout.session.completed
       → Convex HTTP Action
       → payments.status = paid
       → scan.status = paid
       → schedule full_review action
  → User landet auf Success → sieht Review wenn ready
```

## Warum Hosted Checkout

- Schnell für MVP
- Apple Pay / Google Pay / lokale Methods out of the box
- Weniger PCI / UI-Arbeit (Comic-Look bleibt auf unserer Site, Payment ist Stripe)

Später optional: Embedded Checkout, wenn wir Payment im Squishy-UI behalten wollen.

## Webhook Truth

**Nie** nur Success-URL vertrauen. Unlock nur nach:

`checkout.session.completed` (verified signature) → Convex Mutation.

## Data (Convex)

```
payments {
  scanId,
  userId,
  stripeSessionId,
  stripePaymentIntentId?,
  amountCents: 500,
  currency: "eur",
  status: "created" | "paid" | "failed" | "refunded",
  createdAt,
  paidAt?
}
```

## Product Setup

- Stripe Product: `Slopcheck Full Review`
- Price: `500` EUR cents, one-time
- Tax: später Stripe Tax wenn nötig (DE/EU)

## Edge Cases

- Double-click Checkout → idempotent session per scan (1 open session)
- Webhook vor Return → UI pollt `scan.status`
- Refund → Report kann locked bleiben (Policy entscheiden)

## Env

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_FULL_REVIEW=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # falls später Elements
```
