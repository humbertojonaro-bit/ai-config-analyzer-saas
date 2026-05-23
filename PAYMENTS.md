# Payment Setup

The SaaS preview supports three payment choices in the billing UI:

- Card + wallets through Stripe Checkout
- PayPal through PayPal Checkout
- Invoice / bank transfer through manual approval

In the current preview, all payment flows are simulated so the product can be tested safely without live credentials. To collect real money, wire the existing routes to live payment providers.

## Stripe

Use Stripe for card payments, Apple Pay, and Google Pay.

Required environment variables:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_TEAM_PRICE_ID=
```

Production behavior:

1. `POST /api/billing/checkout` receives `{ plan, paymentMethod: "card" }`.
2. The server creates a Stripe Checkout Session using the matching Stripe price ID.
3. The frontend redirects to the Stripe Checkout URL.
4. `POST /api/webhooks/stripe` verifies the webhook signature.
5. Subscription events update the user plan to `pro`, `team`, or `free`.

Recommended Stripe webhook events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## PayPal

Use PayPal for customers who prefer PayPal balance or PayPal-funded payments.

Required environment variables:

```env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
```

Production behavior:

1. `POST /api/billing/checkout` receives `{ plan, paymentMethod: "paypal" }`.
2. The server creates a PayPal order or subscription.
3. The frontend redirects to the PayPal approval URL.
4. `POST /api/webhooks/paypal` verifies the PayPal webhook.
5. Approved subscription events update the user plan.

## Invoice / bank transfer

Use invoice payment for B2B customers that need ACH, wire transfer, procurement approval, or manual billing.

Required environment variable:

```env
BILLING_CONTACT_EMAIL=
```

Production behavior:

1. `POST /api/billing/checkout` receives `{ plan, paymentMethod: "invoice" }`.
2. The server creates an invoice request record or sends an email to the billing contact.
3. The customer receives manual payment instructions.
4. After payment is confirmed, an admin updates the customer plan.

## Current preview behavior

The preview intentionally does not process real payments. It returns simulated checkout payloads and uses `/api/billing/simulate-upgrade` to activate plans. This lets you demonstrate the product flow before connecting real financial accounts.

