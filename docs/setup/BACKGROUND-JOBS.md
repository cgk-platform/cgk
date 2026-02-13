# Background Jobs Setup Guide

This guide walks you through setting up background job processing for your CGK platform.

**Estimated setup time**: 10-15 minutes

## Prerequisites

- CGK platform cloned and dependencies installed
- Node.js 22+ installed
- pnpm installed (`npm install -g pnpm`)

## Quick Start

```bash
# Run the setup wizard
npx @cgk-platform/cli setup:jobs
```

This interactive wizard will guide you through provider selection and configuration.

## Provider Options

### Trigger.dev (Recommended)

**Why Trigger.dev is recommended:**
- Proven at scale with 199+ tasks in RAWDOG production
- Excellent developer experience (`npx trigger dev`)
- Built-in retries with exponential backoff
- `triggerAndWait()` for workflow orchestration
- Cloud-hosted with self-host option
- Familiar SDK patterns for the team

### Inngest (Alternative)

**When to choose Inngest:**
- Prefer event-driven architecture
- Need step functions for complex workflows
- Want an alternative to Trigger.dev

### Local (Development Only)

**Use only for:**
- Local development without external services
- Testing and debugging
- CI/CD pipelines

**NOT for production** - jobs are processed in-memory and lost on restart.

---

## Trigger.dev Setup (Detailed)

### Step 1: Create Account

1. Go to [trigger.dev](https://trigger.dev)
2. Sign up with GitHub or email
3. Create a new project

### Step 2: Get API Keys

1. In your Trigger.dev dashboard, select your project
2. Go to **Settings → API Keys**
3. Copy the **Secret Key** (starts with `tr_`)
4. Optionally copy the **Project Ref**

### Step 3: Configure Environment

Add to your `.env.local`:

```bash
# Trigger.dev Configuration
TRIGGER_SECRET_KEY=tr_dev_your_secret_key_here
TRIGGER_PROJECT_REF=your-project-ref  # Optional but recommended
```

Or run the setup wizard:

```bash
npx @cgk-platform/cli setup:jobs --provider trigger.dev
```

### Step 4: Start Dev Server

In a separate terminal:

```bash
npx trigger dev
```

This starts the Trigger.dev dev server which processes jobs locally.

### Step 5: Verify Setup

```bash
npx @cgk-platform/cli setup:jobs --verify-only
```

### Creating Tasks with Trigger.dev

Tasks are defined in `src/trigger/` directory:

```typescript
// src/trigger/order-created.ts
import { task } from '@trigger.dev/sdk/v3'
import { withTenant } from '@cgk-platform/db'

export const orderCreatedTask = task({
  id: 'order-created',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload: {
    tenantId: string  // REQUIRED
    orderId: string
    totalAmount: number
  }) => {
    const { tenantId, orderId } = payload

    // CRITICAL: All database operations use tenant context
    await withTenant(tenantId, async () => {
      // Process order...
    })

    return { processed: true }
  },
})
```

### Sending Jobs

```typescript
import { sendJob } from '@cgk-platform/jobs'

await sendJob('order.created', {
  tenantId: 'rawdog',  // REQUIRED - tenant isolation
  orderId: 'order_123',
  totalAmount: 9999,
  currency: 'USD',
})
```

---

## Inngest Setup (Detailed)

### Step 1: Create Account

1. Go to [inngest.com](https://www.inngest.com)
2. Sign up with GitHub or email
3. Create a new app

### Step 2: Get API Keys

1. In your Inngest dashboard, select your app
2. Go to **Settings → Keys**
3. Copy the **Event Key** and **Signing Key**

### Step 3: Configure Environment

Add to your `.env.local`:

```bash
# Inngest Configuration
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=signkey_your_signing_key_here
```

### Step 4: Start Dev Server

```bash
npx inngest-cli dev
```

### Creating Functions with Inngest

```typescript
// src/inngest/order-created.ts
import { inngest } from './client'
import { withTenant } from '@cgk-platform/db'

export const orderCreatedFn = inngest.createFunction(
  { id: 'order-created' },
  { event: 'order.created' },
  async ({ event, step }) => {
    const { tenantId, orderId } = event.data

    // CRITICAL: All database operations use tenant context
    await withTenant(tenantId, async () => {
      // Process order...
    })

    return { processed: true }
  }
)
```

---

## Local Provider Setup

For development without external services:

```bash
npx @cgk-platform/cli setup:jobs --provider local
```

Or set manually:

```bash
# .env.local
JOBS_PROVIDER=local
```

**Important**: Local provider processes jobs in-memory. Jobs are lost on restart.

---

## Environment Variables Reference

### Trigger.dev

| Variable | Required | Description |
|----------|----------|-------------|
| `TRIGGER_SECRET_KEY` | Yes | API secret key (starts with `tr_`) |
| `TRIGGER_PROJECT_REF` | No | Project reference ID |
| `TRIGGER_API_URL` | No | Custom API URL (for self-hosted) |

### Inngest

| Variable | Required | Description |
|----------|----------|-------------|
| `INNGEST_EVENT_KEY` | Yes | Event key for sending events |
| `INNGEST_SIGNING_KEY` | Yes | Signing key for handlers |
| `INNGEST_BASE_URL` | No | Custom API URL (default: https://inn.gs) |

### Local

| Variable | Required | Description |
|----------|----------|-------------|
| `JOBS_PROVIDER` | No | Set to `local` to force local mode |

---

## CLI Commands Reference

### `setup:jobs`

Configure background job provider:

```bash
# Interactive setup
npx @cgk-platform/cli setup:jobs

# Specify provider
npx @cgk-platform/cli setup:jobs --provider trigger.dev
npx @cgk-platform/cli setup:jobs --provider inngest
npx @cgk-platform/cli setup:jobs --provider local

# Verify existing setup
npx @cgk-platform/cli setup:jobs --verify-only

# Skip environment setup (just verify)
npx @cgk-platform/cli setup:jobs --skip-env
```

---

## Tenant Isolation (CRITICAL)

**Every job event MUST include tenantId.** This is enforced at the type level.

```typescript
// CORRECT - tenantId included
await sendJob('order.created', {
  tenantId: 'rawdog',  // REQUIRED
  orderId: 'order_123',
})

// WRONG - Will fail type checking
await sendJob('order.created', {
  orderId: 'order_123',  // TypeScript error: missing tenantId
})
```

In job handlers, always use tenant context for database operations:

```typescript
run: async (payload) => {
  const { tenantId, orderId } = payload

  // CRITICAL: Wrap all DB operations
  await withTenant(tenantId, async () => {
    const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`
    // ... process order
  })
}
```

---

## Event Types

The `@cgk-platform/jobs` package exports all event types:

```typescript
import type {
  JobEvents,
  OrderCreatedPayload,
  PayoutRequestedPayload,
  // ... 80+ event types
} from '@cgk-platform/jobs'
```

Categories:
- **Commerce**: `order.created`, `order.fulfilled`, `customer.created`, etc.
- **Reviews**: `review.submitted`, `survey.response`, `survey.lowNps`, etc.
- **Creators**: `creator.applied`, `project.created`, `payout.requested`, etc.
- **Attribution**: `touchpoint.recorded`, `conversion.attributed`, etc.
- **A/B Testing**: `ab.testCreated`, `ab.optimize`, etc.
- **Video/DAM**: `video.uploadCompleted`, `dam.assetUploaded`, etc.
- **System**: `system.healthCheck`, `system.alert`, etc.

---

## Scheduled Jobs

Define scheduled jobs using cron expressions:

```typescript
// Trigger.dev
import { schedules } from '@trigger.dev/sdk/v3'

export const dailyMetrics = schedules.task({
  id: 'daily-metrics',
  cron: '0 2 * * *',  // 2 AM daily
  run: async () => {
    // Note: For scheduled jobs that need to run for multiple tenants,
    // fetch tenant list and process each
    const tenants = await getTenantList()
    for (const tenant of tenants) {
      await sendJob('ab.metricsAggregate', {
        tenantId: tenant.id,
        period: 'daily',
      })
    }
  },
})
```

Pre-defined schedules are exported:

```typescript
import { SCHEDULES } from '@cgk-platform/jobs'

console.log(SCHEDULES['ab.hourlyMetrics'])  // { cron: '15 * * * *' }
console.log(SCHEDULES['attribution.dailyMetrics'])  // { cron: '10 2 * * *' }
```

---

## Troubleshooting

### "Not configured" error

```
[JobClient] Not configured - set TRIGGER_SECRET_KEY
```

**Fix**: Add the API key to `.env.local`:
```bash
TRIGGER_SECRET_KEY=tr_dev_your_key
```

### Jobs not processing

**For Trigger.dev:**
1. Ensure `npx trigger dev` is running
2. Check the Trigger.dev dashboard for errors
3. Verify your secret key is correct

**For Inngest:**
1. Ensure `npx inngest-cli dev` is running
2. Check the Inngest dashboard for events
3. Verify both event key and signing key are set

### Missing tenantId error

```
[JobProvider] Event "order.created" requires tenantId in payload
```

**Fix**: Always include `tenantId` in event payloads:
```typescript
await sendJob('order.created', {
  tenantId: 'your-tenant',  // Add this!
  orderId: '...',
})
```

### Connection timeout

```
[TriggerDevProvider] API error 504: Gateway Timeout
```

**Fix**: Check your network connection and firewall settings. Trigger.dev API should be accessible.

---

## Next Steps

After setting up jobs:

1. **Create your first task**: Add a task file in `src/trigger/`
2. **Test locally**: Send a job and verify it processes
3. **Deploy**: Push to production (API keys set in Vercel/hosting)
4. **Monitor**: Use provider dashboard to monitor jobs

For more information:
- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [CGK Tenant Isolation Rules](/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/TENANT-ISOLATION.md)
