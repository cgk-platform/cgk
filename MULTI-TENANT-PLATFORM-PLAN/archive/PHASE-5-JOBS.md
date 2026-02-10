# Phase 5: Background Jobs Migration

**Duration**: 3 weeks
**Focus**: Migrate from Trigger.dev to Inngest
**Scope**: **199 Trigger.dev tasks** (not 72 as previously estimated)

---

## CRITICAL: Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| **AUTOMATIONS-TRIGGER-DEV** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` |
| PLAN.md | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PLAN.md` |
| PROMPT.md | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PROMPT.md` |

The codebase analysis identified **199 Trigger.dev tasks** across these categories:
- A/B Testing & Optimization: 11 tasks
- Attribution & Analytics: 17 tasks
- Creator Communications: 15 tasks
- Payout & Payment Processing: 12+ tasks
- Review Email Queue: 4+ tasks
- Digests & Notifications: 4 tasks
- Video & Media Processing: 6+ tasks
- Subscriptions & Billing: 9+ tasks
- System Monitoring: 2 tasks
- Alerts & Automation: 8+ tasks
- And more...

---

## Why This Migration Matters

**Current Pain Points (from PLAN.md)**:
1. Separate worker process required (`npm run dev:all`)
2. Tasks feel "disconnected" from main application
3. Proprietary SDK creates vendor lock-in
4. Cold starts and execution delays
5. $50-100/month at current usage

**Target State**:
- No separate worker process
- Event-driven, integrated with main app
- Vendor-agnostic abstraction layer
- Serverless execution on Vercel

---

## Required Skills for This Phase

| Skill | Usage |
|-------|-------|
| Context7 MCP | **REQUIRED** - Inngest SDK documentation and patterns |
| `obra/superpowers@test-driven-development` | TDD for job implementations |
| `obra/superpowers@executing-plans` | Systematic migration execution |

### Pre-Phase Checklist
```bash
# Verify skills are installed
npx skills list | grep -E "(documentation-lookup|test-driven|executing-plans)"

# If missing, install:
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@test-driven-development -g -y
npx skills add obra/superpowers@executing-plans -g -y
```

### Inngest Migration Workflow
1. Use Context7 MCP to fetch Inngest SDK documentation
2. Follow systematic migration with `obra/superpowers@executing-plans`
3. Use TDD for each migrated job function
4. Run parallel systems during transition for validation

---

## Objectives

1. Set up Inngest infrastructure
2. Migrate existing Trigger.dev tasks
3. Implement event-driven architecture
4. Ensure zero-downtime migration

---

## Why Inngest Over Trigger.dev

| Feature | Trigger.dev | Inngest |
|---------|-------------|---------|
| Architecture | Worker-based | Serverless-first |
| Model | Queue + cron | Event-driven |
| Vercel Integration | External | Native |
| Pricing | Per-worker | Per-execution |
| DX | Good | Excellent |
| Long-running | Checkpoints | Steps |

---

## Week 1: Inngest Setup & Core Migrations

### Infrastructure Setup

```typescript
// packages/inngest/src/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'multi-tenant-platform',
  schemas: new EventSchemas().fromRecord<Events>(),
})

// Event types
export type Events = {
  // Commerce
  'shopify/order.created': { data: { orderId: string; tenantId: string } }
  'shopify/order.updated': { data: { orderId: string; tenantId: string } }
  'shopify/customer.created': { data: { customerId: string; tenantId: string } }

  // Reviews
  'review/submitted': { data: { reviewId: string; tenantId: string } }
  'review/email.scheduled': { data: { orderId: string; sequence: number; tenantId: string } }

  // Creators
  'creator/applied': { data: { creatorId: string; tenantId: string } }
  'payout/requested': { data: { requestId: string; creatorId: string } }
  'payout/approved': { data: { requestId: string } }

  // Attribution
  'attribution/touchpoint': { data: { visitorId: string; tenantId: string } }
  'attribution/conversion': { data: { orderId: string; tenantId: string } }

  // Scheduled
  'cron/daily-metrics': { data: { tenantId: string } }
  'cron/review-reminders': { data: { tenantId: string } }
  'cron/payout-processing': { data: {} }
}
```

### Order Sync Function

```typescript
// apps/admin/src/inngest/functions/order-sync.ts
import { inngest } from '@repo/inngest'
import { withTenant } from '@repo/db'
import { getShopifyClient } from '@repo/shopify'

export const syncOrder = inngest.createFunction(
  { id: 'sync-shopify-order', retries: 3 },
  { event: 'shopify/order.created' },
  async ({ event, step }) => {
    const { orderId, tenantId } = event.data

    // Step 1: Fetch from Shopify
    const order = await step.run('fetch-order', async () => {
      const client = await getShopifyClient(tenantId)
      return client.getOrder(orderId)
    })

    // Step 2: Save to database
    await step.run('save-order', async () => {
      return withTenant(tenantId, () => saveOrder(order))
    })

    // Step 3: Process attribution
    await step.run('process-attribution', async () => {
      return processOrderAttribution(tenantId, order)
    })

    // Step 4: Credit creator if discount used
    if (order.discountCodes?.length) {
      await step.run('credit-creator', async () => {
        return creditCreatorCommission(tenantId, order)
      })
    }

    // Step 5: Schedule review email
    await step.run('schedule-review', async () => {
      const deliveryDate = order.fulfillments?.[0]?.deliveredAt
      if (deliveryDate) {
        await inngest.send({
          name: 'review/email.scheduled',
          data: {
            orderId: order.id,
            sequence: 1,
            tenantId,
          },
          // Send 5 days after delivery
          ts: new Date(deliveryDate).getTime() + 5 * 24 * 60 * 60 * 1000,
        })
      }
    })

    return { success: true, orderId: order.id }
  }
)
```

### Review Email Queue

```typescript
// apps/admin/src/inngest/functions/review-emails.ts
export const sendReviewEmail = inngest.createFunction(
  {
    id: 'send-review-email',
    retries: 3,
    rateLimit: {
      limit: 10,
      period: '1s',
      key: 'event.data.tenantId',
    },
  },
  { event: 'review/email.scheduled' },
  async ({ event, step }) => {
    const { orderId, sequence, tenantId } = event.data

    // Check if already reviewed
    const hasReviewed = await step.run('check-reviewed', async () => {
      return checkOrderReviewed(tenantId, orderId)
    })

    if (hasReviewed) {
      return { skipped: true, reason: 'already_reviewed' }
    }

    // Get order details
    const order = await step.run('get-order', async () => {
      return getOrderWithProducts(tenantId, orderId)
    })

    // Determine incentive
    const incentive = await step.run('calculate-incentive', async () => {
      return calculateReviewIncentive(order, sequence)
    })

    // Send email
    await step.run('send-email', async () => {
      return sendReviewRequestEmail(order, incentive)
    })

    // Schedule follow-up if sequence 1
    if (sequence === 1) {
      await step.run('schedule-followup', async () => {
        await inngest.send({
          name: 'review/email.scheduled',
          data: { orderId, sequence: 2, tenantId },
          // 7 days later
          ts: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
      })
    }

    return { success: true, sequence }
  }
)
```

---

## Week 2: Payment & Creator Migrations

### Payout Processing

```typescript
// apps/admin/src/inngest/functions/payout-processing.ts
export const processPayoutRequest = inngest.createFunction(
  { id: 'process-payout', retries: 2 },
  { event: 'payout/approved' },
  async ({ event, step }) => {
    const { requestId } = event.data

    // Get request details
    const request = await step.run('get-request', async () => {
      return getWithdrawalRequest(requestId)
    })

    // Select provider
    const provider = await step.run('select-provider', async () => {
      return selectPayoutProvider(request)
    })

    // Execute payout
    const result = await step.run('execute-payout', async () => {
      return executePayout(provider, request)
    })

    if (!result.success) {
      // Mark as failed
      await step.run('mark-failed', async () => {
        await updateWithdrawalStatus(requestId, 'failed', result.error)
      })

      throw new Error(result.error)
    }

    // Mark as completed
    await step.run('mark-completed', async () => {
      await updateWithdrawalStatus(requestId, 'completed', null, result.transferId)
    })

    // Record in ledger
    await step.run('record-ledger', async () => {
      await recordWithdrawalTransaction(request)
    })

    // Send confirmation
    await step.run('send-confirmation', async () => {
      await sendPayoutConfirmationEmail(request.creatorId, request.amountCents)
    })

    return { success: true, transferId: result.transferId }
  }
)
```

### Creator Application Processing

```typescript
// apps/admin/src/inngest/functions/creator-application.ts
export const processCreatorApplication = inngest.createFunction(
  { id: 'process-creator-application' },
  { event: 'creator/applied' },
  async ({ event, step }) => {
    const { creatorId, tenantId } = event.data

    // Get application details
    const application = await step.run('get-application', async () => {
      return getCreatorApplication(creatorId)
    })

    // Send confirmation email
    await step.run('send-confirmation', async () => {
      return sendApplicationReceivedEmail(application)
    })

    // Notify admin
    await step.run('notify-admin', async () => {
      return sendSlackNotification({
        channel: '#creator-applications',
        text: `New application from ${application.name}`,
        tenant: tenantId,
      })
    })

    // Track in Meta CAPI
    await step.run('track-meta', async () => {
      return trackMetaConversion('Lead', {
        email: application.email,
        tenant: tenantId,
      })
    })

    return { success: true }
  }
)
```

---

## Week 3: Attribution & Scheduled Jobs

### Attribution Processing

```typescript
// apps/admin/src/inngest/functions/attribution.ts
export const processAttribution = inngest.createFunction(
  { id: 'process-attribution', retries: 2 },
  { event: 'attribution/conversion' },
  async ({ event, step }) => {
    const { orderId, tenantId } = event.data

    // Get conversion details
    const conversion = await step.run('get-conversion', async () => {
      return getConversion(tenantId, orderId)
    })

    // Find touchpoints
    const touchpoints = await step.run('find-touchpoints', async () => {
      return findTouchpoints(tenantId, conversion)
    })

    // Calculate attribution (all models)
    const results = await step.run('calculate-attribution', async () => {
      return calculateAllModels(touchpoints, conversion)
    })

    // Store results
    await step.run('store-results', async () => {
      return storeAttributionResults(tenantId, orderId, results)
    })

    // Send to GA4
    await step.run('send-ga4', async () => {
      return sendGA4Purchase(conversion, touchpoints)
    })

    // Send to Meta CAPI
    await step.run('send-meta', async () => {
      return sendMetaPurchase(conversion, touchpoints)
    })

    return { success: true, models: Object.keys(results) }
  }
)
```

### Daily Metrics Aggregation

```typescript
// apps/admin/src/inngest/functions/daily-metrics.ts
export const aggregateDailyMetrics = inngest.createFunction(
  { id: 'aggregate-daily-metrics' },
  { cron: '0 2 * * *' }, // 2 AM UTC daily
  async ({ step }) => {
    // Get all active tenants
    const tenants = await step.run('get-tenants', async () => {
      return getActiveTenants()
    })

    // Process each tenant
    for (const tenant of tenants) {
      await step.run(`metrics-${tenant.slug}`, async () => {
        const yesterday = subDays(new Date(), 1)

        // Revenue metrics
        const revenue = await aggregateRevenue(tenant.slug, yesterday)

        // Attribution metrics
        const attribution = await aggregateAttribution(tenant.slug, yesterday)

        // Customer metrics
        const customers = await aggregateCustomers(tenant.slug, yesterday)

        // Store daily snapshot
        await storeDailyMetrics(tenant.slug, {
          date: yesterday,
          revenue,
          attribution,
          customers,
        })
      })
    }

    return { success: true, tenantsProcessed: tenants.length }
  }
)
```

### Webhook Queue Processing

```typescript
// apps/admin/src/inngest/functions/webhook-queue.ts
export const processWebhookQueue = inngest.createFunction(
  { id: 'process-webhook-queue' },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    // Get pending webhooks
    const webhooks = await step.run('get-pending', async () => {
      return getPendingWebhooks(100)
    })

    if (webhooks.length === 0) {
      return { processed: 0 }
    }

    // Process each webhook
    let processed = 0
    let failed = 0

    for (const webhook of webhooks) {
      try {
        await step.run(`webhook-${webhook.id}`, async () => {
          await processWebhook(webhook)
          await markWebhookProcessed(webhook.id)
        })
        processed++
      } catch (error) {
        await step.run(`webhook-fail-${webhook.id}`, async () => {
          await incrementWebhookRetry(webhook.id, error.message)
        })
        failed++
      }
    }

    return { processed, failed }
  }
)
```

---

## Migration Strategy

### Phase 1: Parallel Run (Week 1)
- Deploy Inngest alongside Trigger.dev
- New events go to both systems
- Monitor for parity

### Phase 2: Cutover (Week 2)
- Disable Trigger.dev for new events
- Keep Trigger.dev running for in-flight jobs
- Monitor Inngest performance

### Phase 3: Cleanup (Week 3)
- Remove Trigger.dev code
- Archive old task definitions
- Update documentation

---

## Success Criteria

- [ ] All **199 Trigger.dev tasks** migrated (see AUTOMATIONS-TRIGGER-DEV-2025-02-10.md)
- [ ] Zero-downtime migration with parallel run period
- [ ] Event-driven architecture working for all categories
- [ ] Vendor-agnostic abstraction layer in place (can swap providers)
- [ ] Rate limiting configured per tenant
- [ ] Monitoring and alerting in place
- [ ] Cost reduction validated (no separate worker costs)
- [ ] No more `npm run dev:all` required

---

## Dependencies for Next Phase

Phase 6 (MCP) requires:
- [x] Event system working
- [x] Tenant context in jobs
