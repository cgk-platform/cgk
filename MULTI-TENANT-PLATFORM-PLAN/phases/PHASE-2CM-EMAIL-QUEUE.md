# PHASE-2CM-EMAIL-QUEUE: Email Queue Architecture

**Duration**: Week 9-10 (5 days)
**Depends On**: Phase 1 (database, auth), Phase 5A (job provider setup)
**Parallel With**: PHASE-2CM-SENDER-DNS, PHASE-2CM-TEMPLATES
**Blocks**: All email-sending functionality

---

## Goal

Implement a unified email queue system with visual admin UI for each email-sending function. Each queue supports multi-sequence emails, atomic claim patterns to prevent race conditions, exponential backoff retries, and integration with the unified communications hub.

**CRITICAL**: The queue architecture supports the same patterns used in RAWDOG but with **tenant isolation** and **configurable sender addresses**.

---

## Success Criteria

- [ ] Each email-sending function has its own queue with visual admin UI
- [ ] Queue entries track status flow: `pending` → `scheduled` → `processing` → `sent`/`failed`
- [ ] Multi-sequence support (request → reminder → follow-up)
- [ ] Atomic claim pattern prevents race conditions in concurrent processing
- [ ] Exponential backoff retry with configurable max attempts
- [ ] Bulk actions available (skip, reschedule, retry)
- [ ] All queues isolated by tenant

---

## Deliverables

### Core Queue Database Schema

```sql
-- Base queue table pattern (one per function)
CREATE TABLE review_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Order/customer context
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  product_title TEXT,

  -- Fulfillment tracking
  fulfilled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_number TEXT,

  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending: waiting for trigger event
    -- awaiting_delivery: fulfilled, waiting for delivery confirmation
    -- scheduled: ready to send at scheduled_at
    -- processing: currently being sent (claimed by worker)
    -- sent: successfully sent
    -- skipped: manually skipped or auto-skipped (review submitted)
    -- failed: all retries exhausted

  -- Scheduling
  trigger_event TEXT NOT NULL DEFAULT 'fulfilled', -- fulfilled, delivered
  scheduled_at TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 3,

  -- Sequence tracking
  sequence_number INTEGER NOT NULL DEFAULT 1,
  sequence_id UUID, -- Groups related emails

  -- Execution tracking
  trigger_run_id TEXT, -- Current processor run (for claim)
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,

  -- Incentive tracking (review-specific)
  incentive_offered BOOLEAN DEFAULT false,
  force_incentive BOOLEAN DEFAULT false,
  incentive_code TEXT,

  -- Skip tracking
  skip_reason TEXT,
  skipped_by TEXT,
  skipped_at TIMESTAMPTZ,

  -- Template tracking
  template_type TEXT, -- reviewRequest, incentiveRequest, reminder, etc.

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, order_id, sequence_number)
);

-- Indexes for queue operations
CREATE INDEX idx_review_email_queue_tenant ON review_email_queue(tenant_id);
CREATE INDEX idx_review_email_queue_status ON review_email_queue(status);
CREATE INDEX idx_review_email_queue_scheduled ON review_email_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX idx_review_email_queue_email ON review_email_queue(customer_email);
CREATE INDEX idx_review_email_queue_order ON review_email_queue(order_id);
CREATE INDEX idx_review_email_queue_sequence ON review_email_queue(sequence_id);
```

### Queue Tables Per Function

| Table | Purpose | Sequences |
|-------|---------|-----------|
| `review_email_queue` | Review request/reminder emails | request → reminder |
| `creator_email_queue` | Creator communications | approval → onboarding → reminders |
| `subscription_email_queue` | Subscription lifecycle emails | Single emails |
| `esign_email_queue` | E-sign notifications | signing → reminder → complete |
| `treasury_email_queue` | Treasury approval requests | request → reminder |
| `team_invitation_queue` | Team member invitations | invite → reminder |

### Status Flow Diagram

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │ (trigger event)
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌─────────────────┐       ┌─────────────┐
     │awaiting_delivery│       │  scheduled  │
     └────────┬────────┘       └──────┬──────┘
              │ (delivery               │ (scheduled_at reached)
              │  confirmed)             │
              └────────────┬────────────┘
                           ▼
                    ┌─────────────┐
                    │ processing  │ ◄─── Claimed by worker
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │   sent   │      │  failed  │      │  skipped │
   └──────────┘      └────┬─────┘      └──────────┘
                          │ (retry)
                          └──────► back to scheduled
                                   (if attempts < max)
```

### Atomic Claim Pattern (CRITICAL)

```typescript
// packages/communications/queue/claim.ts

/**
 * Atomically claim entries for processing.
 * Uses FOR UPDATE SKIP LOCKED to prevent race conditions.
 */
export async function claimScheduledEntries(
  tenantId: string,
  runId: string,
  limit: number = 50
): Promise<QueueEntry[]> {
  const entries = await withTenant(tenantId, async () => {
    return sql`
      UPDATE review_email_queue
      SET
        status = 'processing',
        trigger_run_id = ${runId},
        updated_at = now()
      WHERE id IN (
        SELECT id FROM review_email_queue
        WHERE tenant_id = ${tenantId}
          AND status = 'scheduled'
          AND scheduled_at <= now()
        ORDER BY scheduled_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `
  })

  return entries.rows
}

/**
 * Check if entry is already claimed by another worker.
 * Returns null if already processing.
 */
export async function markAsProcessing(
  entryId: string,
  runId: string
): Promise<QueueEntry | null> {
  const result = await sql`
    UPDATE review_email_queue
    SET
      status = 'processing',
      trigger_run_id = ${runId},
      updated_at = now()
    WHERE id = ${entryId}
      AND status = 'scheduled'
    RETURNING *
  `

  return result.rows[0] || null
}
```

### Duplicate Prevention Pattern

```typescript
// packages/communications/queue/sequence.ts

/**
 * Create follow-up entry with duplicate prevention.
 * Uses ON CONFLICT DO NOTHING to handle race conditions.
 */
export async function createFollowUpEntry(
  tenantId: string,
  orderId: string,
  sequenceNumber: number,
  scheduledAt: Date,
  metadata: Record<string, unknown>
): Promise<QueueEntry | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      INSERT INTO review_email_queue (
        tenant_id, order_id, sequence_number,
        status, scheduled_at, metadata
      )
      VALUES (
        ${tenantId}, ${orderId}, ${sequenceNumber},
        'scheduled', ${scheduledAt}, ${JSON.stringify(metadata)}
      )
      ON CONFLICT (tenant_id, order_id, sequence_number) DO NOTHING
      RETURNING *
    `
  })

  return result.rows[0] || null // null = already exists
}

/**
 * Skip all pending entries for an order (e.g., review submitted).
 */
export async function skipPendingEntriesForOrder(
  tenantId: string,
  orderId: string,
  reason: string
): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE review_email_queue
      SET
        status = 'skipped',
        skip_reason = ${reason},
        skipped_at = now(),
        updated_at = now()
      WHERE tenant_id = ${tenantId}
        AND order_id = ${orderId}
        AND status IN ('pending', 'awaiting_delivery', 'scheduled')
    `
  })

  return result.rowCount
}
```

### Exponential Backoff Retry

```typescript
// packages/communications/queue/retry.ts

/**
 * Get entries ready for retry with exponential backoff.
 */
export async function getRetryableEntries(
  tenantId: string,
  limit: number = 20
): Promise<QueueEntry[]> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND status = 'failed'
        AND attempts < max_attempts
        AND last_attempt_at < now() - (INTERVAL '1 minute' * POWER(2, attempts))
      ORDER BY last_attempt_at ASC
      LIMIT ${limit}
    `
  })

  return result.rows
}

/**
 * Mark entry as failed and update retry tracking.
 */
export async function markAsFailed(
  entryId: string,
  errorMessage: string
): Promise<void> {
  await sql`
    UPDATE review_email_queue
    SET
      status = CASE
        WHEN attempts + 1 >= max_attempts THEN 'failed'
        ELSE 'failed' -- Will be picked up by retry job
      END,
      attempts = attempts + 1,
      last_attempt_at = now(),
      error_message = ${errorMessage},
      updated_at = now()
    WHERE id = ${entryId}
  `
}
```

### API Routes per Queue

```
/api/admin/reviews/email-queue/
├── route.ts              - GET list with filters, stats
├── [id]/route.ts         - GET details, PATCH update
├── [id]/skip/route.ts    - POST skip entry
├── [id]/retry/route.ts   - POST retry entry
├── bulk/route.ts         - POST bulk skip/reschedule
└── stats/route.ts        - GET queue statistics

/api/admin/creators/communications/queue/
├── route.ts
├── [id]/route.ts
└── ... (same pattern)

/api/admin/subscriptions/emails/queue/
├── route.ts
└── ... (same pattern)
```

### Package Structure

```
packages/communications/
├── queue/
│   ├── types.ts           - QueueEntry, QueueStatus types
│   ├── claim.ts           - Atomic claim operations
│   ├── sequence.ts        - Multi-sequence management
│   ├── retry.ts           - Exponential backoff retry
│   ├── stats.ts           - Queue statistics queries
│   ├── review-queue.ts    - Review-specific queue operations
│   ├── creator-queue.ts   - Creator-specific queue operations
│   └── subscription-queue.ts - Subscription queue operations
├── processors/
│   ├── base-processor.ts  - Abstract queue processor
│   ├── review-processor.ts
│   ├── creator-processor.ts
│   └── subscription-processor.ts
└── index.ts
```

### Background Job Tasks

```typescript
// apps/admin/src/jobs/email-queues/

// Review Email Queue Processor (every 5 minutes)
export const processReviewEmailQueue = job({
  id: 'process-review-email-queue',
  schedule: { cron: '*/5 * * * *' },
  run: async ({ tenantId }) => {
    const runId = crypto.randomUUID()
    const entries = await claimScheduledEntries(tenantId, runId, 50)

    for (const entry of entries) {
      // Check if review already submitted
      const reviewExists = await checkReviewExists(entry.orderId)
      if (reviewExists) {
        await skipEntry(entry.id, 'review_already_submitted')
        continue
      }

      // Get sender address for notification type
      const sender = await getSenderForNotification(
        tenantId,
        'review_request'
      )

      // Send email via Resend
      const result = await sendReviewEmail(entry, sender)

      if (result.success) {
        await markAsSent(entry.id, result.messageId)

        // Schedule follow-up if sequence not complete
        if (entry.sequenceNumber < 2) {
          await createFollowUpEntry(
            tenantId,
            entry.orderId,
            entry.sequenceNumber + 1,
            addDays(new Date(), 3),
            entry.metadata
          )
        }
      } else {
        await markAsFailed(entry.id, result.error)
      }

      // Rate limit: 0.55s between sends (Resend allows 2 req/sec)
      await sleep(550)
    }
  }
})
```

### Queue UI Components

#### Queue List Page
```typescript
interface QueueListProps {
  queueType: 'review' | 'creator' | 'subscription' | 'esign' | 'treasury'
}

// Features:
// - Status filter (pending, scheduled, processing, sent, failed, skipped)
// - Date range filter
// - Email search
// - Order number search
// - Bulk actions (skip selected, retry selected)
// - Stats header (pending count, sent today, failed count)
```

#### Queue Entry Detail Modal
```typescript
interface QueueEntryDetailProps {
  entry: QueueEntry
  onSkip: () => void
  onRetry: () => void
}

// Shows:
// - Full entry details (order, customer, product)
// - Status history (pending → scheduled → processing → sent)
// - Attempt history with error messages
// - Sequence info (1 of 2, 2 of 2)
// - Related entries in sequence
// - Action buttons (skip, retry, reschedule)
```

---

## Constraints

- Claim operations MUST use `FOR UPDATE SKIP LOCKED`
- Never use transactions with Neon pooled connections (each sql call may go to different connection)
- Rate limit email sends to stay within Resend limits (2 req/sec = 550ms delay)
- Sequence entries MUST use `ON CONFLICT DO NOTHING`
- All queue entries MUST include `tenant_id`
- Background jobs MUST include `tenantId` in payload

---

## Pattern References

**RAWDOG code to reference:**
- `/src/lib/reviews/email-queue/db.ts` - 947 lines of queue patterns
- `/src/lib/reviews/email-queue/schema.ts` - Multi-sequence table design
- `/src/trigger/review-email-queue.ts` - Queue processor with claim pattern
- `/src/trigger/creator-email-queue.ts` - Creator queue processor

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to use a single generic queue table or separate tables per function
2. Optimal batch size for claim operations (50 vs 100)
3. Whether to implement dead-letter queue for permanently failed emails
4. How to handle timezone-aware scheduling

---

## Tasks

### [PARALLEL] Database Schema
- [ ] Create `review_email_queue` table with all indexes
- [ ] Create `creator_email_queue` table
- [ ] Create `subscription_email_queue` table
- [ ] Create `esign_email_queue` table
- [ ] Create `treasury_email_queue` table
- [ ] Create `team_invitation_queue` table

### [PARALLEL] Core Queue Package
- [ ] Implement `QueueEntry` and `QueueStatus` types
- [ ] Implement atomic `claimScheduledEntries()` function
- [ ] Implement `markAsProcessing()` with claim check
- [ ] Implement `createFollowUpEntry()` with duplicate prevention
- [ ] Implement `skipPendingEntriesForOrder()`
- [ ] Implement `getRetryableEntries()` with exponential backoff
- [ ] Implement `markAsSent()` and `markAsFailed()`
- [ ] Implement `getQueueStats()` for dashboard

### [SEQUENTIAL after core] Function-Specific Queues
- [ ] Implement review queue operations
- [ ] Implement creator queue operations
- [ ] Implement subscription queue operations
- [ ] Implement esign queue operations
- [ ] Implement treasury queue operations

### [SEQUENTIAL after queues] Background Processors
- [ ] Implement base processor abstraction
- [ ] Implement review email queue processor
- [ ] Implement creator email queue processor
- [ ] Implement subscription email queue processor
- [ ] Implement retry processor for failed entries

### [SEQUENTIAL after processors] API Routes
- [ ] Implement queue list endpoint with filters
- [ ] Implement queue entry detail endpoint
- [ ] Implement skip endpoint
- [ ] Implement retry endpoint
- [ ] Implement bulk actions endpoint
- [ ] Implement stats endpoint

### [SEQUENTIAL after API] UI Components
- [ ] Build `QueueListPage` component
- [ ] Build `QueueFilters` component
- [ ] Build `QueueStatsHeader` component
- [ ] Build `QueueEntryRow` component
- [ ] Build `QueueEntryDetail` modal
- [ ] Build `BulkActionsBar` component

---

## Definition of Done

- [ ] All queue tables created with proper indexes
- [ ] Atomic claim prevents concurrent processing (verified by test)
- [ ] Exponential backoff retry works correctly
- [ ] Multi-sequence emails schedule follow-ups automatically
- [ ] Queue UIs show real-time status for each function
- [ ] Bulk actions work (skip, retry, reschedule)
- [ ] All queues isolated by tenant
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for claim/retry logic pass
- [ ] Integration test for email sequence flow passes
