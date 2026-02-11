# @cgk/communications - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2026-02-10

---

## Purpose

Email communications package for the CGK platform. Provides:
- Email sender management and domain verification
- Email templates with variable substitution
- Email queue architecture with atomic claim patterns
- Queue processors for background job processing
- Notification routing

---

## Quick Reference

```typescript
// Email Queue
import {
  claimScheduledEntries,
  markAsSent,
  markAsFailed,
  createReviewQueueEntry,
  getQueueStats,
} from '@cgk/communications/queue'

// Processors
import {
  createReviewProcessor,
  createRetryProcessor,
} from '@cgk/communications/processors'

// Sender Management
import {
  getSenderForNotification,
  createDomain,
  verifyDomainWithResend,
} from '@cgk/communications/sender'
```

---

## Key Patterns

### Pattern 1: Atomic Queue Claim (CRITICAL)

**When to use**: Processing email queue entries

```typescript
import { claimScheduledEntries, markAsSent, markAsFailed } from '@cgk/communications'

// Claim entries - uses FOR UPDATE SKIP LOCKED
const runId = crypto.randomUUID()
const entries = await claimScheduledEntries(tenantId, 'review', runId, 50)

for (const entry of entries) {
  const result = await sendEmail(entry)
  if (result.success) {
    await markAsSent(tenantId, 'review', entry.id, result.messageId)
  } else {
    await markAsFailed(tenantId, 'review', entry.id, result.error)
  }
}
```

### Pattern 2: Review Email Processor

**When to use**: Background job for review email queue

```typescript
import { createReviewProcessor } from '@cgk/communications/processors'

const runProcessor = createReviewProcessor({
  tenantId: 'rawdog',
  sendEmail: async (entry) => {
    // Send via Resend
    const result = await resend.emails.send({...})
    return { success: true, messageId: result.id }
  }
})

// Run every 5 minutes via job scheduler
const result = await runProcessor()
// { processed: 45, sent: 42, failed: 2, skipped: 1 }
```

### Pattern 3: Multi-Sequence Emails

**When to use**: Review request -> reminder sequences

```typescript
import { createReviewQueueEntry, createReviewFollowUp } from '@cgk/communications'

// Initial entry
const entry = await createReviewQueueEntry({
  tenantId,
  orderId,
  orderNumber,
  customerEmail,
  triggerEvent: 'fulfilled',
  delayDays: 3,
})

// After first email sent, schedule follow-up
const followUp = await createReviewFollowUp(
  tenantId,
  entry,
  addDays(new Date(), 3),
  'reviewReminder'
)
```

### Pattern 4: Exponential Backoff Retry

**When to use**: Retrying failed entries

```typescript
import { getRetryableEntries, scheduleRetry, calculateRetryDelay } from '@cgk/communications'

// Get entries ready for retry (respects backoff)
const retryable = await getRetryableEntries(tenantId, 'review', 20)

for (const entry of retryable) {
  await scheduleRetry(tenantId, 'review', entry.id)
}

// Backoff: 1min, 2min, 4min, 8min, 16min...
```

### Pattern 5: Bulk Actions

**When to use**: Admin bulk operations

```typescript
import { performBulkAction } from '@cgk/communications'

const result = await performBulkAction(
  tenantId,
  'review',
  'skip',
  ['entry_1', 'entry_2', 'entry_3'],
  { skipReason: 'Customer unsubscribed', skippedBy: 'admin_123' }
)
// { success: true, affectedCount: 3, errors: [] }
```

---

## Queue Types

| Queue | Purpose | Table |
|-------|---------|-------|
| `review` | Review request/reminder | `review_email_queue` |
| `creator` | Creator communications | `creator_email_queue` |
| `subscription` | Subscription lifecycle | `subscription_email_queue` |
| `esign` | E-sign notifications | `esign_email_queue` |
| `treasury` | Treasury approvals | `treasury_email_queue` |
| `team_invitation` | Team invites | `team_invitation_queue` |

---

## Status Flow

```
pending -> awaiting_delivery (if trigger=delivered)
        -> scheduled (if ready)

awaiting_delivery -> scheduled (delivery confirmed)

scheduled -> processing (claimed by worker)

processing -> sent | failed | skipped

failed -> scheduled (retry if attempts < max)
```

---

## File Map

| Path | Purpose |
|------|---------|
| `queue/types.ts` | Queue entry types and interfaces |
| `queue/claim.ts` | Atomic claim operations |
| `queue/sequence.ts` | Multi-sequence management |
| `queue/retry.ts` | Exponential backoff retry |
| `queue/stats.ts` | Queue statistics |
| `queue/bulk-actions.ts` | Bulk operations |
| `queue/review-queue.ts` | Review-specific operations |
| `processors/base-processor.ts` | Abstract processor class |
| `processors/review-processor.ts` | Review email processor |
| `processors/retry-processor.ts` | Failed entry retry processor |
| `sender/` | Domain/sender management |
| `templates/` | Email templates |

---

## Common Gotchas

### 1. Always use tenant context

```typescript
// WRONG - No tenant isolation
await sql`SELECT * FROM review_email_queue`

// CORRECT - Wrapped in tenant context
await withTenant(tenantId, () =>
  sql`SELECT * FROM review_email_queue`
)
```

### 2. Rate limit email sends

```typescript
// Resend allows 2 req/sec
// Wait 550ms between sends
for (const entry of entries) {
  await sendEmail(entry)
  await sleep(550)
}
```

### 3. Handle stale processing entries

```typescript
// Reset entries stuck in 'processing' for too long
await resetStaleProcessingEntries(tenantId, 'review', 10) // 10 min threshold
```

### 4. Use ON CONFLICT for duplicates

```typescript
// Follow-up entries use ON CONFLICT DO NOTHING
// Returns null if entry already exists
const followUp = await createFollowUpEntry(...)
if (!followUp) {
  // Already scheduled
}
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk/db` | Database access with tenant isolation |
| `@cgk/core` | Shared types |

---

## API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/admin/email-queues/[type]` | List queue entries |
| `GET /api/admin/email-queues/[type]/[id]` | Entry details |
| `POST /api/admin/email-queues/[type]/[id]/skip` | Skip entry |
| `POST /api/admin/email-queues/[type]/[id]/retry` | Retry entry |
| `POST /api/admin/email-queues/[type]/bulk` | Bulk actions |
| `GET /api/admin/email-queues/[type]/stats` | Queue statistics |

---

## Testing

```bash
pnpm --filter @cgk/communications test
pnpm --filter @cgk/communications test:watch
```

---

## Integration Points

### Used by:
- `apps/admin` - Queue management UI
- Background jobs - Email processing

### Uses:
- `@cgk/db` - Database access
- `@cgk/core` - Types
