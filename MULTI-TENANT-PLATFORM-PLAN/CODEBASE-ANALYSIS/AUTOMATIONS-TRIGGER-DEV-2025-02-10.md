# RAWDOG Trigger.dev Tasks Analysis
**Generated**: 2025-02-10
**Coverage**: 199+ tasks across 75 files

---

## Source Codebase Path

**Trigger.dev Tasks Location**: `/Users/holdenthemic/Documents/rawdog-web/src/trigger/`

All task file references in this document are relative to the RAWDOG codebase. Use full paths when referencing from the new project.

---

## Executive Summary

The RAWDOG codebase contains **199+ Trigger.dev tasks** organized across 75 files in `/Users/holdenthemic/Documents/rawdog-web/src/trigger/`. Tasks handle background processing for order sync, review emails, creator communications, payouts, attribution, video processing, and system monitoring.

**CRITICAL**: Uses `@trigger.dev/sdk` v4 (NOT v2 deprecated `client.defineJob`)

---

## Task Categories

### 1. A/B Testing & Optimization (11 tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `ab-hourly-metrics-aggregation` | ab-metrics-aggregation | Scheduled | Every hour :15 | Aggregate Redis counters to daily metrics |
| `ab-nightly-metrics-reconciliation` | ab-metrics-aggregation | Scheduled | 2 AM daily | Re-aggregate previous day's events |
| `ab-aggregate-test-metrics` | ab-metrics-aggregation | On-demand | Manual | Full reconciliation of test metrics |
| `ab-sync-redis-to-postgres` | ab-metrics-aggregation | Scheduled | Every 6 hours | Sync Redis → Postgres |
| `ab-daily-metrics-summary` | ab-metrics-aggregation | Scheduled | 8 AM daily | Slack summary of running tests |
| `ab-optimization` | ab-optimization | Scheduled | Every 15 min | Update MAB/Thompson allocations |
| `ab-optimize-test` | ab-optimization | On-demand | Manual | Optimize single test |
| `ab-optimization-summary` | ab-optimization | Scheduled | 9 AM daily | Daily optimization report |
| `ab-order-reconciliation` | ab-order-reconciliation | Scheduled | Every hour :15 | Catch missed orders |
| `ab-order-reconciliation-manual` | ab-order-reconciliation | On-demand | Manual | Reconcile specific orders |
| `ab-test-scheduler` | ab-test-scheduler | Scheduled | Every 5 min | Process test transitions |

---

### 2. Attribution & Analytics (17 tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `attribution-daily-metrics` | attribution-daily-metrics | Scheduled | 2:10 AM | Aggregate daily metrics |
| `attribution-export-scheduler` | attribution-exports | Scheduled | Every 15 min | Run export jobs |
| `attribution-fairing-bridge` | attribution-fairing-bridge | Scheduled | Every hour :15 | Sync Fairing surveys |
| `attribution-ml-training` | attribution-ml-training | Scheduled | 4 AM daily | Train ML model (30 min timeout) |
| `attribution-order-reconciliation` | attribution-order-reconciliation | Scheduled | Every hour :45 | Catch missing attribution |
| `attribution-order-reconciliation-manual` | attribution-order-reconciliation | On-demand | Manual | Reconcile specific orders |
| `attribution-recalculate-recent` | attribution-recalculate | Scheduled | 4 AM daily | Recalculate last 3 days |
| `sync-tiktok-spend-daily` | attribution-tiktok-sync | Scheduled | 3 AM daily | Sync TikTok ad spend |
| `attribution-vta-sync` | attribution-vta-sync | Scheduled | 2:30 AM | Sync VTA data |
| `attribution-process-unattributed` | attribution-unattributed | Scheduled | Every hour :30 | Retry 50 unattributed |
| `attribution-webhook-queue` | attribution-webhook-queue | Scheduled | Every 5 min | Process webhook queue |

---

### 3. Creator Communications (15 tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `check-approval-reminders` | approval-reminders | Scheduled | 9 AM daily | Remind approved creators |
| `process-creator-email-queue` | creator-email-queue | Scheduled | Every 5 min | Process 20 pending emails |
| `schedule-creator-welcome-sequence` | creator-email-queue | On-demand | Manual | Queue 4-email welcome |
| `cancel-creator-pending-emails` | creator-email-queue | On-demand | Manual | Cancel pending emails |
| `retry-failed-creator-emails` | creator-email-queue | On-demand | Manual | Retry failed emails |
| `queue-creator-email` | creator-email-queue | On-demand | Manual | Queue single email |
| `queue-project-email` | creator-email-queue | On-demand | Manual | Queue project email |
| `queue-payment-email` | creator-email-queue | On-demand | Manual | Queue payment email |
| `on-creator-setup-complete` | creator-email-queue | On-demand | Manual | Cancel setup sequence |
| `creator-product-delivery-reminders` | creator-reminders | Scheduled | 10 AM daily | 5-day post-delivery reminder |
| `creator-deadline-reminders` | creator-reminders | Scheduled | 9 AM daily | 3-day and 1-day warnings |
| `creator-no-response-reminders` | creator-reminders | Scheduled | 2 PM daily | 2-day no-response reminder |
| `creator-abandoned-application-reminders` | creator-reminders | Scheduled | Every hour :15 | 1h SMS, 24h email, 48h final |
| `send-creator-reminder` | creator-reminders | On-demand | Manual | Manual reminder |

---

### 4. Payout & Payment Processing (12+ tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `on-payment-available` | payment-automation | On-demand | Triggered | Notify payment available |
| `on-payout-initiated` | payment-automation | On-demand | Triggered | Notify payout started |
| `on-payout-complete` | payment-automation | On-demand | Triggered | Notify complete, sync expenses |
| `on-payout-failed` | payment-automation | On-demand | Triggered | Notify failure, log |
| `monthly-payment-summary` | payment-automation | Scheduled | 9 AM 1st of month | Monthly earnings summary |
| `check-payments-becoming-available` | payment-automation | Scheduled | 8 AM daily | Trigger availability notifications |
| `process-international-payout` | payment-automation | On-demand | Manual | Orchestrate international payout |
| `check-pending-international-payouts` | payment-automation | Scheduled | Every hour | Check top-up, execute transfer |
| `process-domestic-payout` | payment-automation | On-demand | Manual | Orchestrate US payout |
| `check-pending-domestic-payouts` | payment-automation | Scheduled | Every hour :30 | Check domestic top-ups |
| `on-topup-succeeded` | payment-automation | On-demand | Webhook | Handle Stripe top-up success |
| `daily-expense-sync` | payment-automation | Scheduled | 6 AM daily | Sync payouts to expenses |
| `monthly-pl-snapshot` | payment-automation | Scheduled | 2 AM 2nd of month | Generate P&L snapshot |

---

### 5. Review Email Queue (4+ tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `review-email-queue-processor` | review-email-queue | Scheduled | Every 5 min | Process 50 scheduled emails |
| `review-email-awaiting-delivery-fallback` | review-email-queue | Scheduled | 12 PM daily | Promote awaiting entries |
| `review-email-retry-failed` | review-email-queue | Scheduled | Every 15 min | Retry failed (5 max) |
| `send-queued-review-email` | review-email-queue | On-demand | Manual | Manual resend |

---

### 6. Digests & Notifications (4 tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `admin-daily-digest` | daily-digests | Scheduled | 8 AM Mon-Fri | Admin summary |
| `at-risk-projects-alert` | daily-digests | Scheduled | 9 AM, 2 PM Mon-Fri | Project due alerts |
| `creator-weekly-digest` | daily-digests | Scheduled | 10 AM Monday | Creator weekly summary |

---

### 7. Video & Media Processing (6+ tasks)

| Task ID | File | Type | Purpose |
|---------|------|------|---------|
| `creator-file-processing` | creator-file-processing | On-demand | Create Mux asset (5 min max) |
| `creator-file-batch-processing` | creator-file-processing | On-demand | Batch 50 files (30 min max) |
| `dam-ingest-project` | dam-ingest | On-demand | Ingest project to DAM |
| `dam-bulk-ingest` | dam-ingest | On-demand | Backfill all projects |
| `detect-asset-faces` | dam-face-detection | On-demand | Face detection |
| `batch-detect-faces` | dam-face-detection | On-demand | Queue batch detection |
| `scan-all-for-faces` | dam-face-detection | On-demand | Find images, queue batch |

---

### 8. Subscriptions & Billing (9+ tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `subscription-daily-billing` | subscription-billing | Scheduled | 6 AM daily | Process all due (1 hour max) |
| `subscription-process-billing` | subscription-billing | On-demand | Manual | Process single |
| `subscription-batch-billing` | subscription-billing | On-demand | Manual | Batch process |
| `subscription-retry-failed-billing` | subscription-billing | On-demand | Manual | Retry after payment update |
| `subscription-catchup-billing` | subscription-billing | On-demand | Manual | Process specific date |
| `subscription-shadow-validation` | subscription-billing | Scheduled | 7 AM daily | Compare Loop vs custom |
| `subscription-analytics-snapshot` | subscription-billing | Scheduled | 8 AM daily | Record MRR, churn |
| `subscription-upcoming-reminder` | subscription-billing | Scheduled | 10 AM daily | 3-day billing reminder |

---

### 9. System Monitoring (2 tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `ops-health-check-full` | health-checks | Scheduled | Every 5 min | Check all services |
| `ops-health-check-critical` | health-checks | Scheduled | Every 1 min | Critical-path only |

---

### 10. Alerts & Automation (8+ tasks)

| Task ID | File | Type | Purpose |
|---------|------|------|---------|
| `critical-alert` | admin-alerts | Manual | Slack + SMS alert |
| `system-error-alert` | admin-alerts | Manual | Auto-severity alert |
| `high-value-submission-alert` | admin-alerts | Manual | $500+ projects |
| `creator-complaint-alert` | admin-alerts | Manual | Urgent complaints |
| `security-alert` | admin-alerts | Manual | Suspicious logins |
| `api-failure-alert` | admin-alerts | Manual | Service failures |
| `unusual-activity-alert` | admin-alerts | Manual | High volume patterns |
| `milestone-alert` | admin-alerts | Manual | Celebrate milestones |

---

### 11. Brand Context & DAM (5+ tasks)

| Task ID | File | Type | Schedule | Purpose |
|---------|------|------|----------|---------|
| `process-brand-document` | brand-context-ingest | On-demand | - | Extract, chunk, embed |
| `refresh-brand-embeddings` | brand-context-ingest | On-demand | - | Refresh 50 chunks |
| `cleanup-brand-context-cache` | brand-context-ingest | Scheduled | Every 6h | Delete expired cache |
| `detect-stale-brand-content` | brand-context-ingest | Scheduled | Mon 9 AM | Flag 90-day stale |
| `sync-url-brand-content` | brand-context-ingest | On-demand | - | Re-fetch URLs |

---

### 12. SMS Queue (3+ tasks)

| Task ID | File | Type | Purpose |
|---------|------|------|---------|
| `send-sms` | sms-queue | On-demand | Send with consent check (5 attempts) |
| `send-bulk-sms` | sms-queue | On-demand | Queue for multiple recipients |
| `retry-dead-letter-sms` | sms-queue | On-demand | Retry failed (1h cooldown) |

---

### 13. Additional Tasks (40+)

- `bri-*` tasks (8+): Brand Research Integration (Gmail, Slack, Meetings)
- `dam-*` tasks (4+): DAM notifications, rights, Mux backfill
- `flow-execution`, `workflow-engine`: Automation flows
- `esign-reminders`: E-signature reminders
- `escalations`: Escalation management
- `gift-card-emails`: Gift card delivery
- `mature-commissions`: Commission maturation
- `onboarding-automation`: Onboarding workflows
- `ops-cleanup`: Database cleanup
- `project-automation`: Project state transitions
- `scheduled-reports`: Custom reports
- `slack-*` tasks (3+): Slack integrations
- `stripe-token-refresh`: Token rotation
- `w9-compliance-reminders`: Tax form reminders
- `google-drive-sync`: Drive sync
- `klaviyo-sync`: Email platform sync
- `video-sync`, `video-transcription`: Video processing
- `agent-memory-decay`: AI agent cleanup

---

## Error Handling Patterns

### Retry Strategies
1. **Exponential Backoff**: `factor: 2, minTimeout: 1-10s, maxTimeout: 30-60s`
2. **Fixed Retries**: 2-5 max attempts depending on criticality
3. **No Retry**: `maxAttempts: 1` for batch operations

### Logging & Alerting
- Slack channels: `#admin-alerts`, `#creator-projects`, `#analytics`, `#rawdog-critical`
- SMS alerts: Critical issues → admin phone
- Database logging: `ops_errors` table
- Redis-backed failure tracking with cooldown

### Rate Limiting
- 0.55s between Resend API calls (2 req/sec limit)
- Delays between batch operations (100-500ms)

---

## Inngest Migration Guide

### SDK Changes
```typescript
// Trigger.dev v4
import { task, schedules } from '@trigger.dev/sdk/v3'
export const myTask = task({ id: 'my-task', run: async (payload) => {} })

// Inngest
import { inngest } from '@/inngest/client'
export const myTask = inngest.createFunction(
  { id: 'my-task' },
  { event: 'my-task' },
  async ({ event, step }) => {}
)
```

### Scheduled Tasks
```typescript
// Trigger.dev
schedules.task({ id: 'task', cron: '0 8 * * *', run: ... })

// Inngest
inngest.createFunction(
  { id: 'task' },
  { cron: '0 8 * * *' },
  async ({ step }) => {}
)
```

### Task Triggers
```typescript
// Trigger.dev
await taskName.trigger({ payload })

// Inngest
await inngest.send({ name: 'task-name', data: payload })
```

---

## Critical Observations

1. **High Volume**: 40+ scheduled cron jobs
2. **Multi-Channel**: Email + SMS + Slack + Portal notifications
3. **Atomic SQL**: Heavy ON CONFLICT for idempotency
4. **Redis State**: Counters, metrics, failure tracking
5. **Expense Integration**: All payouts sync to unified P&L
6. **Staggered Timing**: Jobs offset (2:10, 2:30, 3:00, 4:00 AM)
7. **Creator-Centric**: Heavy notification focus

---

## File Locations

**Base Path**: `/Users/holdenthemic/Documents/rawdog-web/src/trigger/`

All tasks in this directory:
- `ab-*.ts` - A/B testing (6 files)
- `attribution-*.ts` - Attribution (8 files)
- `creator-*.ts` - Creator comms (4 files)
- `payment-automation.ts` - Payouts
- `review-email-queue.ts` - Review emails
- `daily-digests.ts` - Daily digests
- `health-checks.ts` - System monitoring
- `subscription-billing.ts` - Subscriptions
- `dam-*.ts` - Digital assets (5 files)
- `bri-*.ts` - AI agent (8 files)
- `sms-queue.ts` - SMS handling

**To list all task files**:
```bash
ls -la /Users/holdenthemic/Documents/rawdog-web/src/trigger/
```
