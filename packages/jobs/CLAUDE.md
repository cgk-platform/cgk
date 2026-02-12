# @cgk/jobs - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-11
> **Provider**: Trigger.dev v4 (recommended)

---

## Purpose

Vendor-agnostic background job infrastructure for the CGK platform. Supports Trigger.dev (recommended), Inngest, or local execution for development.

**CRITICAL**: All events require `tenantId` for tenant isolation.

---

## Quick Reference

```typescript
// Send a job (recommended)
import { sendJob } from '@cgk/jobs'

await sendJob('order.created', {
  tenantId: 'rawdog',  // REQUIRED
  orderId: 'order_123',
  totalAmount: 9999,
  currency: 'USD',
})

// Create a client with specific provider
import { createJobClient } from '@cgk/jobs'

const client = createJobClient({
  provider: 'trigger.dev',
  triggerDev: { secretKey: process.env.TRIGGER_SECRET_KEY },
})
```

---

## Key Patterns

### Pattern 1: Sending Jobs (ALWAYS use sendJob)

```typescript
import { sendJob, sendJobs } from '@cgk/jobs'

// Single job
await sendJob('payout.requested', {
  tenantId: 'rawdog',  // REQUIRED
  payoutId: 'payout_123',
  creatorId: 'creator_456',
  amount: 50000,
  currency: 'USD',
  payoutType: 'domestic',
})

// Batch jobs
await sendJobs([
  { event: 'email.send', payload: { tenantId, to, templateId, data } },
  { event: 'slack.notify', payload: { tenantId, channel, message } },
])

// With options
await sendJob('review.reminder', {
  tenantId: 'rawdog',
  orderId: 'order_123',
  reminderNumber: 1,
}, {
  delay: 86400000,  // 24 hours
  idempotencyKey: `reminder-${orderId}-1`,
})
```

### Pattern 2: Defining Trigger.dev Tasks

```typescript
// src/trigger/order-created.ts
import { task } from '@trigger.dev/sdk/v3'
import { withTenant } from '@cgk/db'
import type { OrderCreatedPayload, TenantEvent } from '@cgk/jobs'

export const orderCreatedTask = task({
  id: 'order-created',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload: TenantEvent<OrderCreatedPayload>) => {
    const { tenantId, orderId, totalAmount } = payload

    // CRITICAL: Always use tenant context
    await withTenant(tenantId, async () => {
      const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`
      // Process order...
    })

    return { processed: true, orderId }
  },
})
```

### Pattern 3: Using Job Middleware

```typescript
import { createJobHandler, withTenantContext } from '@cgk/jobs'

// Automatic tenant context + logging + error classification
const handler = createJobHandler(async (ctx) => {
  const { tenantId, orderId } = ctx.payload
  // Database operations are automatically scoped to tenant
  const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`
  return order
})

// Custom middleware composition
import { composeMiddleware, withLogging, withTimeout } from '@cgk/jobs'

const enhancedHandler = composeMiddleware(
  withLogging(),
  withTimeout(30000),
)(handler)
```

### Pattern 4: Scheduled Jobs

```typescript
import { schedules } from '@trigger.dev/sdk/v3'
import { sendJob, SCHEDULES } from '@cgk/jobs'

// Pre-defined schedules
console.log(SCHEDULES['ab.hourlyMetrics'])  // { cron: '15 * * * *' }

// Define scheduled task
export const dailyMetrics = schedules.task({
  id: 'daily-metrics-aggregate',
  cron: SCHEDULES['attribution.dailyMetrics'].cron,
  run: async () => {
    // Get all active tenants
    const tenants = await sql`SELECT id FROM organizations WHERE status = 'active'`

    // Queue metrics for each tenant
    for (const tenant of tenants.rows) {
      await sendJob('ab.metricsAggregate', {
        tenantId: tenant.id,
        period: 'daily',
      })
    }
  },
})
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public API | All exports |
| `provider.ts` | Provider interface | `JobProvider`, `validateTenantId`, `SCHEDULES` |
| `client.ts` | Job client | `createJobClient`, `sendJob`, `getJobClient` |
| `events.ts` | Event types | `JobEvents`, `TenantEvent`, 80+ payload types |
| `middleware.ts` | Job middleware | `withTenantContext`, `withLogging`, etc. |
| `providers/local.ts` | Local provider | `createLocalProvider` |
| `providers/trigger-dev.ts` | Trigger.dev | `createTriggerDevProvider` |
| `providers/inngest.ts` | Inngest | `createInngestProvider` |

---

## Event Categories

```typescript
import { EVENT_CATEGORIES, TOTAL_EVENT_COUNT } from '@cgk/jobs'

// 80+ events across 13 categories
EVENT_CATEGORIES.commerce      // order.*, customer.*, product.*, inventory.*
EVENT_CATEGORIES.reviews       // review.*, survey.*
EVENT_CATEGORIES.creators      // creator.*, project.*
EVENT_CATEGORIES.payouts       // payout.*, payment.*, treasury.*, expense.*
EVENT_CATEGORIES.attribution   // touchpoint.*, conversion.*, attribution.*
EVENT_CATEGORIES.abTesting     // ab.*
EVENT_CATEGORIES.media         // video.*, dam.*
EVENT_CATEGORIES.subscriptions // subscription.*
EVENT_CATEGORIES.notifications // email.*, sms.*, slack.*, push.*
EVENT_CATEGORIES.system        // system.*
EVENT_CATEGORIES.workflows     // workflow.*
EVENT_CATEGORIES.brandContext  // brandContext.*
EVENT_CATEGORIES.googleFeed    // googleFeed.*
EVENT_CATEGORIES.webhooks      // webhook.*
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk/core` | Shared types |
| `@cgk/db` | Tenant context (`withTenant`) |

| Peer Dependency | When |
|-----------------|------|
| `@trigger.dev/sdk` | Using Trigger.dev provider |
| `inngest` | Using Inngest provider |

---

## Common Gotchas

### 1. Missing tenantId

```typescript
// WRONG - TypeScript will catch this
await sendJob('order.created', {
  orderId: 'order_123',  // Error: missing tenantId
})

// CORRECT
await sendJob('order.created', {
  tenantId: 'rawdog',  // REQUIRED
  orderId: 'order_123',
})
```

### 2. Database without tenant context

```typescript
// WRONG - Queries wrong schema
run: async (payload) => {
  const order = await sql`SELECT * FROM orders`  // Public schema!
}

// CORRECT - Use withTenant
run: async (payload) => {
  await withTenant(payload.tenantId, async () => {
    const order = await sql`SELECT * FROM orders`  // Tenant schema
  })
}
```

### 3. Not using middleware

```typescript
// WRONG - Manual logging, no error handling
run: async (payload) => {
  console.log('Starting...')
  try { /* ... */ }
  catch (e) { console.error(e) }
}

// CORRECT - Use createJobHandler
const handler = createJobHandler(async (ctx) => {
  // Automatic logging, timing, error classification
  return process(ctx.payload)
})
```

### 4. Forgetting to start Trigger.dev

```bash
# Development requires the dev server
npx trigger dev  # Run in separate terminal!
```

---

## CLI Commands

```bash
# Setup jobs provider
npx @cgk/cli setup:jobs

# With specific provider
npx @cgk/cli setup:jobs --provider trigger.dev

# Verify configuration
npx @cgk/cli setup:jobs --verify-only
```

---

## Provider Comparison

| Feature | Trigger.dev | Inngest | Local |
|---------|------------|---------|-------|
| Production Ready | ✅ | ✅ | ❌ |
| triggerAndWait | ✅ | ❌ (use step.invoke) | ✅ |
| Step Functions | ✅ | ✅ | ❌ |
| Cron/Scheduled | ✅ | ✅ | ❌ |
| Dev Server | `npx trigger dev` | `npx inngest-cli dev` | Auto |
| Self-Hostable | ✅ | ✅ | N/A |

---

## Environment Variables

```bash
# Trigger.dev (recommended)
TRIGGER_SECRET_KEY=tr_dev_xxx
TRIGGER_PROJECT_REF=your-project

# Inngest
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=signkey_xxx

# Local (development only)
JOBS_PROVIDER=local
```

---

## Integration Points

### Used by:
- Order processing (commerce flows)
- Review email automation
- Creator communications
- Payout processing
- Attribution tracking
- A/B test optimization
- Video transcription
- DAM asset processing

### Uses:
- `@cgk/db` - Tenant context
- `@cgk/core` - Types

---

## Testing

```typescript
import { createJobClient, setJobClient } from '@cgk/jobs'

// Use local provider for tests
const testClient = createJobClient({ provider: 'local' })
setJobClient(testClient)

// Mock handler
testClient.provider.registerHandler('order.created', async (ctx) => {
  // Test implementation
})

// Send job
await sendJob('order.created', {
  tenantId: 'test_tenant',
  orderId: 'test_order',
})
```
