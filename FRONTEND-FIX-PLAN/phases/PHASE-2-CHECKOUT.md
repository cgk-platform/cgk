# Phase 2: Storefront Checkout Payment Integration

> **Priority**: P0 - Critical
> **Blocking**: Cannot complete purchases with custom commerce provider
> **Estimated Time**: 3-4 hours

---

## Problem Statement

The checkout UI at `/apps/storefront/src/app/checkout/` exists but the payment step shows a placeholder: "Order placement will be implemented with Stripe integration". Stripe Elements needs to be integrated.

---

## Current State

- Checkout flow exists with steps (shipping, payment, review)
- Cart functionality works
- Shopify checkout redirects work
- **Custom checkout payment does NOT work**

---

## Files to Create/Modify

### 1. Create PaymentIntent API Route

**Location**: `/apps/storefront/src/app/api/checkout/create-payment-intent/route.ts`

```typescript
// POST - Create Stripe PaymentIntent
// Body: { cartId, currency }
// Returns: { clientSecret, paymentIntentId }

import { NextResponse } from 'next/server'
import { getTenantStripeClient } from '@cgk-platform/integrations'
import { withTenant, sql } from '@cgk-platform/db'

export async function POST(request: Request) {
  const tenantSlug = request.headers.get('x-tenant-slug')
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  }

  const { cartId, currency = 'usd' } = await request.json()

  // Get cart total
  const cart = await withTenant(tenantSlug, async () => {
    return sql`SELECT total_cents FROM carts WHERE id = ${cartId}`
  })

  if (!cart.rows[0]) {
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
  }

  // Get tenant's Stripe client
  const stripe = await getTenantStripeClient(tenantSlug)
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: cart.rows[0].total_cents,
    currency,
    metadata: { cartId, tenantSlug }
  })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  })
}
```

### 2. Create Confirm Order API Route

**Location**: `/apps/storefront/src/app/api/checkout/confirm-order/route.ts`

```typescript
// POST - Confirm payment and create order
// Body: { paymentIntentId, cartId, shippingAddress, billingAddress }
// Returns: { orderId, orderNumber }
```

### 3. Create StripeProvider Component

**Location**: `/apps/storefront/src/components/checkout/StripeProvider.tsx`

```typescript
'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'

interface StripeProviderProps {
  children: React.ReactNode
}

export function StripeProvider({ children }: StripeProviderProps) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)

  useEffect(() => {
    // Get publishable key from tenant config
    fetch('/api/checkout/stripe-config')
      .then(res => res.json())
      .then(({ publishableKey }) => {
        if (publishableKey) {
          setStripePromise(loadStripe(publishableKey))
        }
      })
  }, [])

  if (!stripePromise) {
    return <div>Loading payment...</div>
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  )
}
```

### 4. Create Stripe Config API Route

**Location**: `/apps/storefront/src/app/api/checkout/stripe-config/route.ts`

```typescript
// GET - Return tenant's Stripe publishable key
```

### 5. Update PaymentStep Component

**Location**: `/apps/storefront/src/components/checkout/PaymentStep.tsx`

Modify to include:
- Stripe CardElement for card input
- useStripe() and useElements() hooks
- Payment confirmation flow

---

## Dependencies to Add

Add to `/apps/storefront/package.json`:

```json
{
  "dependencies": {
    "@stripe/react-stripe-js": "^2.4.0",
    "@stripe/stripe-js": "^2.4.0"
  }
}
```

Then run: `pnpm install`

---

## Integration Flow

1. Customer reaches payment step
2. Frontend calls `/api/checkout/create-payment-intent`
3. Stripe PaymentIntent created with cart total
4. CardElement rendered with clientSecret
5. Customer enters card details
6. Frontend confirms payment via Stripe.js
7. Frontend calls `/api/checkout/confirm-order`
8. Order created in database
9. Redirect to order confirmation page

---

## Verification

```bash
cd /Users/holdenthemic/Documents/cgk/apps/storefront
pnpm install  # Install Stripe dependencies
npx tsc --noEmit
```

---

## Completion Checklist

- [x] `@stripe/react-stripe-js` and `@stripe/stripe-js` added to package.json (already present)
- [x] `api/checkout/create-payment-intent/route.ts` created (already existed, verified working)
- [x] `api/checkout/confirm-order/route.ts` created
- [x] `api/checkout/stripe-config/route.ts` created
- [x] `components/checkout/StripeProvider.tsx` created
- [x] `components/checkout/PaymentForm.tsx` created with PaymentElement
- [x] Checkout components.tsx updated with Stripe integration
- [x] Order confirmation page created at `/order-confirmation/[orderId]`
- [x] TypeScript check passes
- [x] Uses tenant's Stripe credentials via `getTenantStripeClient()`

**Completed**: 2026-02-16 by Claude Opus 4.5
