# @cgk/jobs - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

Background job abstraction for the CGK platform. Provides queue-based job processing with retries, scheduling, and tenant isolation.

---

## Quick Reference

```typescript
import { defineJob, createJobQueue, processJobs } from '@cgk/jobs'
import type { Job, JobResult } from '@cgk/jobs'
```

---

## Key Patterns

### Pattern 1: Defining Jobs

```typescript
import { defineJob } from '@cgk/jobs'

export const syncInventoryJob = defineJob({
  name: 'sync-inventory',
  handler: async (job) => {
    const { productId } = job.payload

    // Sync inventory logic...

    return { success: true, data: { synced: true } }
  },
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    initialDelay: 1000,
  },
})
```

### Pattern 2: Creating and Enqueuing Jobs

```typescript
import { createJobQueue } from '@cgk/jobs'

const queue = createJobQueue({ name: 'default' })

// Enqueue a job
await queue.enqueue('sync-inventory', { productId: '123' })

// Schedule for later
await queue.enqueue('send-email',
  { to: 'user@example.com', template: 'welcome' },
  { delay: 60000 } // 1 minute delay
)

// With tenant context
await queue.enqueue('process-order',
  { orderId: 'order_123' },
  { tenantId: 'rawdog' }
)
```

### Pattern 3: Processing Jobs

```typescript
import { processJobs, createJobQueue } from '@cgk/jobs'

const queue = createJobQueue({ name: 'default' })
const handlers = new Map()

// Register handlers
handlers.set('sync-inventory', syncInventoryJob.handler)
handlers.set('send-email', sendEmailJob.handler)

const processor = processJobs({
  queue,
  handlers,
  maxConcurrency: 5,
  onError: (job, error) => console.error(`Job ${job.id} failed:`, error),
  onComplete: (job, result) => console.log(`Job ${job.id} completed`),
})

// Start processing
processor.start()

// Stop gracefully
process.on('SIGTERM', () => processor.stop())
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | Type definitions | `Job`, `JobStatus`, `JobResult` |
| `define.ts` | Job definition | `defineJob` |
| `queue.ts` | Queue implementation | `createJobQueue` |
| `processor.ts` | Job processor | `processJobs` |
| `utils.ts` | Utilities | `createJobId`, `calculateRetryDelay` |

---

## Exports Reference

### Factory Functions

```typescript
defineJob<T, R>(definition: JobDefinition<T, R>): JobDefinition<T, R>
createJobQueue(config: JobQueueConfig): JobQueue
processJobs(config: ProcessorConfig): JobProcessor
```

### Types

- `Job<T>` - Job with payload
- `JobStatus` - pending, running, completed, failed, etc.
- `JobResult<T>` - Handler return type
- `JobOptions` - Enqueue options (delay, priority, etc.)

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk/core` | Shared types |
| `@cgk/db` | Job persistence |

---

## Common Gotchas

### 1. Jobs must return JobResult

```typescript
// WRONG - Returns nothing
handler: async (job) => {
  await doWork()
}

// CORRECT - Return success/failure
handler: async (job) => {
  await doWork()
  return { success: true }
}
```

### 2. Handle tenant context

```typescript
handler: async (job) => {
  if (job.tenantId) {
    return withTenant(job.tenantId, async () => {
      // Tenant-scoped work
      return { success: true }
    })
  }
  return { success: true }
}
```

### 3. Idempotency

Jobs may be retried - ensure handlers are idempotent.

```typescript
handler: async (job) => {
  // Check if already processed
  const existing = await checkIfProcessed(job.id)
  if (existing) return { success: true }

  // Process and mark as complete
  await processAndMark(job.id)
  return { success: true }
}
```

---

## Integration Points

### Used by:
- Order processing
- Inventory sync
- Email sending
- Creator payouts

### Uses:
- `@cgk/core` - Types
- `@cgk/db` - Persistence
