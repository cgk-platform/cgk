# Phase 7: Backend Fixes

> **Priority**: P3 - Low
> **Impact**: Technical debt, edge case fixes
> **Estimated Time**: 1-2 hours
> **Can Run In Parallel**: Yes

---

## Tasks in This Phase

1. Fix Wise webhook signature verification
2. (Optional) Implement unified payment provider interface

---

## Task 1: Fix Wise Webhook Signature

**Problem**: `/packages/payments/src/webhooks.ts` uses HMAC instead of RSA-SHA256 for Wise webhook verification.

**Location**: `/Users/holdenthemic/Documents/cgk/packages/payments/src/webhooks.ts`

### Current (Incorrect)
```typescript
// Uses HMAC - WRONG for Wise
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex')
```

### Required Fix
Wise webhooks are signed with RSA-SHA256. Need to:

1. Fetch or configure Wise's public key
2. Verify signature using RSA-SHA256

```typescript
import { createVerify } from 'crypto'

// Or for Edge Runtime compatibility, use Web Crypto API
async function verifyWiseWebhook(
  payload: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  // For Node.js
  const verifier = createVerify('RSA-SHA256')
  verifier.update(payload)
  return verifier.verify(publicKey, signature, 'base64')

  // For Edge Runtime - use Web Crypto API
  // const key = await crypto.subtle.importKey(...)
  // return await crypto.subtle.verify(...)
}
```

### Wise Public Key

Wise provides their public key for webhook verification. It should be:
1. Stored in environment variable `WISE_WEBHOOK_PUBLIC_KEY`
2. Or fetched from Wise API on first use and cached

Reference: https://docs.wise.com/api-docs/features/webhooks#signature-verification

---

## Task 2: Unified Payment Provider Interface (Optional)

**Problem**: `/packages/payments/src/provider.ts` has a `createPaymentProvider()` function that throws "not implemented" for all methods.

**Current State**: Direct clients (`createStripeClient()`, `createWiseClient()`) work fine. The unified interface is just not implemented.

**Decision**: This is optional. The direct clients are used throughout the codebase and work correctly. Only implement if you want a unified abstraction.

### If Implementing

```typescript
// packages/payments/src/provider.ts

import { createStripeClient } from './stripe'
import { createWiseClient } from './wise'

export function createPaymentProvider(tenantSlug: string, type: 'stripe' | 'wise') {
  if (type === 'stripe') {
    return {
      async createPayment(amount: number, currency: string) {
        const stripe = await createStripeClient(tenantSlug)
        return stripe.paymentIntents.create({ amount, currency })
      },
      // ... other methods
    }
  }

  if (type === 'wise') {
    return {
      async createPayout(recipient: string, amount: number, currency: string) {
        const wise = await createWiseClient(tenantSlug)
        // ... implementation
      },
      // ... other methods
    }
  }

  throw new Error(`Unknown payment provider: ${type}`)
}
```

---

## Verification

```bash
cd /Users/holdenthemic/Documents/cgk/packages/payments
npx tsc --noEmit
```

---

## Completion Checklist

### Wise Webhook (Required)
- [x] Update `verifyWiseWebhook()` to use RSA-SHA256
- [x] Add `WISE_WEBHOOK_PUBLIC_KEY` environment variable support
- [x] Use Edge-compatible crypto (Web Crypto API) if needed
- [x] TypeScript check passes

### Unified Provider (Optional)
- [x] Implement `createPaymentProvider()` - routes to StripeProvider
- [x] Added clear documentation about when to use direct providers vs unified interface

**Status**: ✅ COMPLETE (2026-02-16)
