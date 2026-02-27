# Payment Processing Expert - CGK Platform

## Design Principles
1. **Tenant-Managed Credentials** - Each tenant owns their own Stripe/Wise accounts
2. **Idempotency First** - UUID v4 keys for all payment operations
3. **Webhook Security** - Always verify signatures before processing
4. **Financial Audit Trail** - Log every financial transaction with immutable records

## Architecture Overview

### Tenant-Owned Payment Accounts
**CRITICAL**: Tenants manage their own payment provider accounts. The platform only provides encryption infrastructure.

```
TENANT A (rawdog):
├── Stripe: sk_live_xxx (THEIR account, encrypted in DB)
├── Wise: api_xxx (THEIR account, encrypted in DB)
└── Payouts to creators from THEIR Stripe Connect

PLATFORM provides:
├── INTEGRATION_ENCRYPTION_KEY (encrypts all credentials)
├── Service client factories (getTenantStripeClient, getTenantWiseClient)
└── Background job infrastructure
```

### Credential Storage
```sql
-- In tenant_{slug} schema
CREATE TABLE IF NOT EXISTS tenant_stripe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  secret_key_encrypted TEXT NOT NULL,           -- Encrypted with INTEGRATION_ENCRYPTION_KEY
  publishable_key TEXT NOT NULL,                -- Not sensitive, stored plain
  webhook_secret_encrypted TEXT,                -- Encrypted webhook signing secret
  connect_account_id TEXT,                      -- Stripe Connect platform account ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_wise_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  api_key_encrypted TEXT NOT NULL,              -- Encrypted with INTEGRATION_ENCRYPTION_KEY
  profile_id TEXT,                              -- Wise profile for payouts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Payment Patterns

### Get Tenant Stripe Client
```typescript
import { getTenantStripeClient, requireTenantStripeClient } from '@cgk-platform/integrations'

// In API routes - returns null if not configured
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  // Option 1: Handle missing config gracefully
  const stripe = await getTenantStripeClient(tenantId)
  if (!stripe) {
    return Response.json(
      { error: 'Stripe not configured. Please add credentials in Settings.' },
      { status: 400 }
    )
  }

  // Option 2: Throw if not configured
  const stripe = await requireTenantStripeClient(tenantId)

  // Use tenant's own Stripe account
  const customer = await stripe.customers.create({
    email: 'customer@example.com',
    metadata: { tenantId }  // Track tenant for debugging
  })

  return Response.json({ customer })
}
```

**Client caching**: Stripe clients are cached for 5 minutes per tenant to avoid repeated decryption.

### Idempotency Keys
**CRITICAL**: All payment operations MUST use idempotency keys to prevent duplicate charges.

```typescript
import { randomUUID } from 'crypto'

// Generate idempotency key (UUID v4)
const idempotencyKey = randomUUID()

// Create payment intent with idempotency key
const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: totalCents,
    currency: 'usd',
    customer: customerId,
    metadata: {
      tenantId,
      orderId,
      creatorId: creatorId || undefined
    }
  },
  {
    idempotencyKey  // Prevents duplicate charges if request retries
  }
)

// Store idempotency key in database
await withTenant(tenantId, async () => {
  await sql`
    INSERT INTO payment_attempts (
      id,
      idempotency_key,
      order_id,
      amount_cents,
      currency,
      status,
      payment_intent_id,
      created_at
    ) VALUES (
      ${randomUUID()},
      ${idempotencyKey},
      ${orderId},
      ${totalCents},
      ${currency},
      'pending',
      ${paymentIntent.id},
      NOW()
    )
  `
})
```

### Webhook Signature Verification
**CRITICAL**: Always verify webhook signatures before processing events.

```typescript
import Stripe from 'stripe'
import { getTenantStripeClient } from '@cgk-platform/integrations'

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return Response.json({ error: 'No signature' }, { status: 400 })
  }

  const body = await req.text()

  // Determine which tenant this webhook belongs to
  // Option 1: Parse webhook to get tenant from metadata
  let event: Stripe.Event
  try {
    // Parse without verification first (to get tenant context)
    const tempEvent = JSON.parse(body) as Stripe.Event
    const tenantId = tempEvent.data.object.metadata?.tenantId

    if (!tenantId) {
      return Response.json({ error: 'No tenant in metadata' }, { status: 400 })
    }

    // Get tenant's Stripe client (includes webhook secret)
    const stripe = await requireTenantStripeClient(tenantId)

    // Get webhook secret from tenant config
    const webhookSecret = await getTenantWebhookSecret(tenantId)
    if (!webhookSecret) {
      return Response.json({ error: 'Webhook secret not configured' }, { status: 400 })
    }

    // NOW verify signature with tenant's webhook secret
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Process verified event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
      break
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object as Stripe.PaymentIntent)
      break
    // ... other event types
  }

  return Response.json({ received: true })
}

async function getTenantWebhookSecret(tenantId: string): Promise<string | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT webhook_secret_encrypted
      FROM tenant_stripe_config
      WHERE organization_id = (
        SELECT id FROM public.organizations WHERE slug = ${tenantId}
      )
      LIMIT 1
    `
  })

  const row = result.rows[0]
  if (!row) return null

  // Decrypt using platform's INTEGRATION_ENCRYPTION_KEY
  return decrypt(row.webhook_secret_encrypted)
}
```

### Financial Audit Trail
**CRITICAL**: Log every financial transaction with immutable records.

```sql
-- Audit table in tenant schema
CREATE TABLE IF NOT EXISTS balance_transactions (
  id TEXT PRIMARY KEY,
  creator_id TEXT REFERENCES creators(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  type TEXT NOT NULL,  -- 'credit', 'debit', 'payout', 'refund'
  description TEXT,
  reference_type TEXT,  -- 'order', 'payout', 'adjustment'
  reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEVER allow updates or deletes - append-only
CREATE INDEX IF NOT EXISTS idx_balance_transactions_creator_id
  ON balance_transactions(creator_id);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at
  ON balance_transactions(created_at DESC);
```

```typescript
// Record financial transaction (append-only)
async function recordBalanceTransaction(
  tenantId: string,
  creatorId: string,
  amountCents: number,
  type: 'credit' | 'debit' | 'payout' | 'refund',
  referenceType: string,
  referenceId: string,
  description: string,
  metadata: Record<string, any> = {}
) {
  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO balance_transactions (
        id,
        creator_id,
        amount_cents,
        currency,
        type,
        description,
        reference_type,
        reference_id,
        metadata,
        created_at
      ) VALUES (
        ${randomUUID()},
        ${creatorId},
        ${amountCents},
        'USD',
        ${type},
        ${description},
        ${referenceType},
        ${referenceId},
        ${JSON.stringify(metadata)},
        NOW()
      )
    `
  })
}
```

## Stripe Connect Patterns

### Creating Connected Accounts
```typescript
import { getTenantStripeClient } from '@cgk-platform/integrations'

async function createConnectedAccount(tenantId: string, email: string) {
  const stripe = await requireTenantStripeClient(tenantId)

  const account = await stripe.accounts.create({
    type: 'express',  // Or 'standard' for full control
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    metadata: { tenantId }
  })

  // Generate account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `https://${tenantId}.cgk.com/settings/payouts?refresh=true`,
    return_url: `https://${tenantId}.cgk.com/settings/payouts?success=true`,
    type: 'account_onboarding'
  })

  return { account, onboardingUrl: accountLink.url }
}
```

### Creator Payouts
```typescript
async function payoutToCreator(
  tenantId: string,
  creatorId: string,
  amountCents: number,
  description: string
) {
  const stripe = await requireTenantStripeClient(tenantId)

  // Get creator's connected account ID
  const creator = await withTenant(tenantId, async () => {
    const result = await sql`
      SELECT stripe_account_id FROM creators WHERE id = ${creatorId} LIMIT 1
    `
    return result.rows[0]
  })

  if (!creator?.stripe_account_id) {
    throw new Error('Creator has no connected Stripe account')
  }

  // Create transfer to connected account
  const idempotencyKey = randomUUID()
  const transfer = await stripe.transfers.create(
    {
      amount: amountCents,
      currency: 'usd',
      destination: creator.stripe_account_id,
      description,
      metadata: { tenantId, creatorId }
    },
    { idempotencyKey }
  )

  // Record in audit trail
  await recordBalanceTransaction(
    tenantId,
    creatorId,
    -amountCents,  // Negative for debit
    'payout',
    'stripe_transfer',
    transfer.id,
    description,
    { stripeTransferId: transfer.id, idempotencyKey }
  )

  return transfer
}
```

## Wise Integration Patterns

### International Payouts
```typescript
import { getTenantWiseClient } from '@cgk-platform/integrations'

async function payoutViaWise(
  tenantId: string,
  creatorId: string,
  amountCents: number,
  currency: string,
  bankDetails: {
    accountNumber: string
    routingNumber: string
    recipientName: string
  }
) {
  const wise = await getTenantWiseClient(tenantId)
  if (!wise) {
    throw new Error('Wise not configured')
  }

  // Create recipient
  const recipient = await wise.createRecipient({
    currency,
    type: 'aba',  // For US, use appropriate type for country
    profile: wise.profileId,
    accountHolderName: bankDetails.recipientName,
    legalType: 'PRIVATE',
    details: {
      accountNumber: bankDetails.accountNumber,
      routingNumber: bankDetails.routingNumber
    }
  })

  // Create quote
  const quote = await wise.createQuote({
    profile: wise.profileId,
    source: 'USD',
    target: currency,
    targetAmount: amountCents / 100,  // Wise uses decimal amounts
    rateType: 'FIXED'
  })

  // Create transfer
  const idempotencyKey = randomUUID()
  const transfer = await wise.createTransfer({
    targetAccount: recipient.id,
    quote: quote.id,
    customerTransactionId: idempotencyKey,
    details: {
      reference: `Payout to ${bankDetails.recipientName}`
    }
  })

  // Record in audit trail
  await recordBalanceTransaction(
    tenantId,
    creatorId,
    -amountCents,
    'payout',
    'wise_transfer',
    transfer.id,
    `International payout via Wise`,
    { wiseTransferId: transfer.id, idempotencyKey, currency }
  )

  return transfer
}
```

## Common Gotchas
1. **Missing idempotency keys** → Duplicate charges on retries
2. **Not verifying webhook signatures** → Security vulnerability
3. **Using platform credentials instead of tenant's** → Wrong account charged
4. **Float arithmetic for money** → Use INTEGER cents to avoid precision errors
5. **No audit trail** → Can't debug financial discrepancies
6. **Mutating financial records** → Use append-only balance_transactions
7. **Missing metadata.tenantId** → Can't route webhooks to correct tenant
8. **Not caching Stripe clients** → Repeated decryption on every request
9. **Hardcoded webhook secrets** → Must be per-tenant from database
10. **No error handling for missing credentials** → 500 errors instead of helpful messages

## Decision Tree
```
Which payment provider?
  ├─ Domestic US payout? → Stripe Connect (faster, lower fees)
  ├─ International payout? → Wise (supports 80+ countries)
  └─ Customer payment? → Stripe (card processing)

How to handle missing credentials?
  ├─ Critical operation? → Use requireTenantStripeClient (throws)
  ├─ Optional operation? → Use getTenantStripeClient (returns null)
  └─ User setup flow? → Redirect to /settings/integrations

Webhook signature verification?
  ├─ Parse body to JSON → Extract tenantId from metadata
  ├─ Get tenant's webhook secret from DB (encrypted)
  ├─ Decrypt secret
  ├─ Use stripe.webhooks.constructEvent(body, signature, secret)
  └─ Process event only if verification succeeds

Recording financial transaction?
  ├─ Generate unique ID (randomUUID)
  ├─ Insert into balance_transactions (append-only)
  ├─ NEVER update or delete existing records
  └─ Include metadata with idempotency key, reference IDs
```

## Background Jobs for Payments

### Payment Success Handler
```typescript
import { task } from '@trigger.dev/sdk/v3'

export const handlePaymentSuccess = task({
  id: 'payments/success',
  run: async (payload: {
    tenantId: string
    paymentIntentId: string
    orderId: string
    amountCents: number
  }) => {
    const { tenantId, paymentIntentId, orderId, amountCents } = payload

    // Update order status
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE orders
        SET
          payment_status = 'paid',
          payment_intent_id = ${paymentIntentId},
          updated_at = NOW()
        WHERE id = ${orderId}
      `
    })

    // Send confirmation email
    await tasks.trigger('emails/order-confirmation', {
      tenantId,
      orderId
    })

    // Update analytics
    await tasks.trigger('analytics/revenue-event', {
      tenantId,
      orderId,
      amountCents
    })
  }
})
```

### Payout Scheduler
```typescript
export const scheduledPayouts = task({
  id: 'payouts/scheduled',
  run: async (payload: { tenantId: string }) => {
    const { tenantId } = payload

    // Get creators with pending balance >= threshold
    const creators = await withTenant(tenantId, async () => {
      return sql`
        SELECT
          c.id,
          c.stripe_account_id,
          SUM(bt.amount_cents) as balance_cents
        FROM creators c
        JOIN balance_transactions bt ON bt.creator_id = c.id
        WHERE c.payout_enabled = true
        GROUP BY c.id, c.stripe_account_id
        HAVING SUM(bt.amount_cents) >= 5000  -- $50 minimum
      `
    })

    // Trigger payout for each creator
    for (const creator of creators.rows) {
      await tasks.trigger('payouts/execute', {
        tenantId,
        creatorId: creator.id,
        amountCents: creator.balance_cents
      })
    }
  }
})
```

## Testing Payment Flows

### Use Stripe Test Mode
```typescript
// In development/staging, use test keys
const stripe = new Stripe(
  process.env.NODE_ENV === 'production'
    ? secretKey
    : testSecretKey,
  { apiVersion: '2025-02-24.acacia' }
)

// Test card numbers
// Success: 4242 4242 4242 4242
// Decline: 4000 0000 0000 0002
// Requires authentication: 4000 0025 0000 3155
```

### Mock Webhook Events
```bash
# Use Stripe CLI to forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

## References
- Stripe client factory: `/packages/integrations/src/stripe.ts`
- Wise client factory: `/packages/integrations/src/wise.ts`
- Payment jobs: `/packages/jobs/src/tasks/payments/`
- Credential encryption: `/packages/integrations/src/crypto.ts`
- Balance transactions: `/packages/db/src/migrations/tenant/012_balance_transactions.sql`
- Webhook handlers: `/apps/admin/src/app/api/webhooks/stripe/route.ts`

---

*This skill prevents duplicate charges, security vulnerabilities, and financial audit gaps.*
