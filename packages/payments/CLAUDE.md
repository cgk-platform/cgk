# @cgk-platform/payments - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Stripe and Wise payment abstraction for the CGK platform. Provides unified payment processing, creator payouts, and webhook handling.

---

## Quick Reference

```typescript
import { createStripeClient, createWiseClient } from '@cgk-platform/payments'
import { createPaymentProvider, type PaymentProvider } from '@cgk-platform/payments'
```

---

## Key Patterns

### Pattern 1: Stripe Payments

```typescript
import { createStripeClient } from '@cgk-platform/payments'

const stripe = createStripeClient({
  secretKey: process.env.STRIPE_SECRET_KEY!,
})

// Create a payment intent
const intent = await stripe.createPaymentIntent({
  amount: 2999, // $29.99 in cents
  currency: 'usd',
  metadata: { orderId: 'order_123' },
})
```

### Pattern 2: Wise Payouts

```typescript
import { createWiseClient } from '@cgk-platform/payments'

const wise = createWiseClient({
  apiToken: process.env.WISE_API_TOKEN!,
  profileId: process.env.WISE_PROFILE_ID!,
})

// Create a payout quote
const quote = await wise.createQuote({
  sourceCurrency: 'USD',
  targetCurrency: 'EUR',
  sourceAmount: 100,
})

// Create and fund transfer
const transfer = await wise.createTransfer({
  targetAccount: recipientId,
  quoteId: quote.id,
  customerTransactionId: 'payout_123',
})
await wise.fundTransfer(transfer.id)
```

### Pattern 3: Unified Provider

```typescript
import { createPaymentProvider } from '@cgk-platform/payments'

const payments = createPaymentProvider({
  provider: 'stripe',
  secretKey: process.env.STRIPE_SECRET_KEY!,
})

const result = await payments.createPaymentIntent({
  amount: 5000,
  currency: 'usd',
})

if (result.success) {
  // Use result.clientSecret for frontend
}
```

### Pattern 4: Webhook Handling

```typescript
import { verifyStripeWebhook } from '@cgk-platform/payments'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  const event = verifyStripeWebhook(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Handle successful payment
      break
  }
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Unified types | `PaymentIntent`, `PaymentResult` |
| `provider.ts` | Unified provider | `createPaymentProvider` |
| `stripe/index.ts` | Stripe client | `createStripeClient` |
| `wise/index.ts` | Wise client | `createWiseClient` |
| `webhooks.ts` | Webhook verification | `verifyStripeWebhook` |

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `stripe` | Stripe API client |
| `@cgk-platform/core` | Shared types |
| `@cgk-platform/db` | Transaction logging |

---

## Common Gotchas

### 1. Stripe amounts are in cents

```typescript
// WRONG - This charges $29.99, not $0.30
await stripe.createPaymentIntent({ amount: 29.99, currency: 'usd' })

// CORRECT - Amounts in smallest currency unit
await stripe.createPaymentIntent({ amount: 2999, currency: 'usd' })
```

### 2. Wise sandbox vs production

```typescript
// Use sandbox for development
createWiseClient({
  apiToken: token,
  profileId: profileId,
  sandbox: process.env.NODE_ENV !== 'production',
})
```

### 3. Always verify webhooks

Never trust webhook payloads without signature verification.

---

## Integration Points

### Used by:
- `apps/checkout` - Payment processing
- `@cgk-platform/jobs` - Payout processing jobs
- Creator payout system

### Uses:
- `@cgk-platform/core` - Types
- `@cgk-platform/db` - Transaction records
