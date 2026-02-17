# @cgk-platform/jobs

Background job abstraction for the CGK platform - supports Trigger.dev, Inngest, or local execution.

## Installation

```bash
pnpm add @cgk-platform/jobs
```

## Features

- **Vendor-Agnostic** - Switch between Trigger.dev, Inngest, or local
- **Type-Safe Events** - Strongly-typed job payloads
- **Tenant Isolation** - All events require tenantId
- **Retry Logic** - Configurable retries with backoff
- **Job Scheduling** - Delay and cron-based scheduling
- **Observability** - Built-in logging and monitoring
- **Development Mode** - Local execution for testing

## Quick Start

### Send a Job

```typescript
import { sendJob } from '@cgk-platform/jobs'

await sendJob('order.created', {
  tenantId: 'tenant_123', // Required
  orderId: 'order_456',
  totalAmount: 9999,
  currency: 'USD',
  customerEmail: 'customer@example.com',
})
```

### Create Job Client

```typescript
import { createJobClient } from '@cgk-platform/jobs'

const client = createJobClient({
  provider: 'trigger.dev', // or 'inngest' or 'local'
  config: {
    apiKey: process.env.TRIGGER_SECRET_KEY,
    apiUrl: process.env.TRIGGER_API_URL,
  },
})

await client.sendEvent('order.created', {
  tenantId: 'tenant_123',
  orderId: 'order_456',
})
```

### Define a Job Handler

```typescript
import { defineJob } from '@cgk-platform/jobs'

export const processOrder = defineJob({
  id: 'process-order',
  event: 'order.created',
  handler: async (event, context) => {
    const { tenantId, orderId } = event.payload
    
    // Process order
    await sendOrderConfirmation(orderId)
    await updateInventory(orderId)
    
    return { success: true, orderId }
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },
})
```

### Schedule a Delayed Job

```typescript
import { scheduleJob } from '@cgk-platform/jobs'

// Send email 24 hours after order
await scheduleJob('email.send', {
  tenantId: 'tenant_123',
  type: 'order_followup',
  recipientEmail: 'customer@example.com',
  orderId: 'order_456',
}, {
  delay: 24 * 60 * 60 * 1000, // 24 hours in ms
})
```

### Cron Jobs

```typescript
import { defineCronJob } from '@cgk-platform/jobs'

export const dailyReport = defineCronJob({
  id: 'daily-report',
  schedule: '0 9 * * *', // 9 AM daily
  handler: async (context) => {
    const tenants = await getAllTenants()
    
    for (const tenant of tenants) {
      await generateDailyReport(tenant.id)
    }
  },
})
```

## Supported Job Events

### Commerce
- `order.created` - New order placed
- `order.fulfilled` - Order shipped
- `order.delivered` - Order delivered
- `order.refunded` - Order refunded

### Email
- `email.send` - Send email
- `email.review_request` - Request review

### Analytics
- `analytics.track` - Track event
- `analytics.page_view` - Track page view

### Webhooks
- `webhook.received` - Incoming webhook
- `webhook.process` - Process webhook payload

## Job Providers

### Trigger.dev (Recommended)

```typescript
createJobClient({
  provider: 'trigger.dev',
  config: {
    apiKey: process.env.TRIGGER_SECRET_KEY,
    apiUrl: process.env.TRIGGER_API_URL,
  },
})
```

Features:
- Dashboard for monitoring
- Automatic retries
- Run history
- Scheduled jobs

### Inngest

```typescript
createJobClient({
  provider: 'inngest',
  config: {
    eventKey: process.env.INNGEST_EVENT_KEY,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  },
})
```

Features:
- Event-driven architecture
- Built-in retries
- Function chaining
- Visual workflow builder

### Local (Development)

```typescript
createJobClient({
  provider: 'local',
})
```

Features:
- Immediate execution
- No external dependencies
- Easy debugging
- Fast iteration

Set in environment:
```bash
JOB_PROVIDER=local  # or 'trigger.dev' or 'inngest'
```

## Key Exports

### Client
- `createJobClient(config)` - Create job client
- `sendJob(event, payload)` - Send job
- `scheduleJob(event, payload, options)` - Schedule delayed job

### Job Definition
- `defineJob(config)` - Define job handler
- `defineCronJob(config)` - Define cron job
- `defineWorkflow(steps)` - Define multi-step workflow

### Utilities
- `getJobStatus(id)` - Get job status
- `cancelJob(id)` - Cancel pending job
- `retryJob(id)` - Manually retry failed job

### Types
- `JobEvent` - Event name type
- `JobPayload<Event>` - Typed payload for event
- `JobContext` - Job execution context
- `RetryConfig` - Retry configuration

## Job Context

Each job handler receives:

```typescript
type JobContext = {
  jobId: string
  runId: string
  attempt: number
  maxAttempts: number
  tenantId: string
  logger: Logger
}
```

## Retry Configuration

```typescript
{
  retry: {
    maxAttempts: 3,
    backoff: 'exponential', // or 'linear' or 'fixed'
    initialDelay: 1000,
    maxDelay: 60000,
  }
}
```

## Best Practices

1. **Always include tenantId** - Required for tenant isolation
2. **Keep jobs idempotent** - Jobs may be retried
3. **Use small payloads** - Large data should be fetched in job
4. **Set appropriate retries** - Not all jobs need retries
5. **Log liberally** - Use context.logger for debugging

## License

MIT
