# PHASE-5C: Creator Job Migrations

> **STATUS**: ✅ COMPLETE (2026-02-12)
> **Completed By**: Wave 3A Agents

**Duration**: 4-5 days (Week 20)
**Depends On**: PHASE-5A (Jobs Infrastructure Setup)
**Parallel With**: PHASE-5B, PHASE-5D (after 5A complete)
**Blocks**: None

---

## Goal

Migrate all creator-related Trigger.dev tasks to Inngest, including payout processing, creator communications, application workflows, and reminder systems. This covers approximately 30 tasks that handle the creator lifecycle.

---

## Success Criteria

- [x] All 15 creator communication tasks migrated
- [x] All 12+ payout processing tasks migrated
- [x] Creator application workflow complete (apply → notify → track)
- [x] Welcome email sequence working (4-email series)
- [x] Reminder system operational (product delivery, deadlines, no-response)
- [x] Payout orchestration supporting Stripe + Wise
- [x] Monthly payment summaries generating
- [x] **Daily creator metrics aggregation running at 3 AM**
- [x] **Weekly creator summary generating on Sundays**
- [x] **Monthly creator report generating on 1st of month**

---

## Deliverables

### Payout Processing Functions (12+ tasks)
- `onPaymentAvailable` - Notify creator when payment unlocks
- `onPayoutInitiated` - Notify payout started
- `onPayoutComplete` - Notify complete, sync to expenses
- `onPayoutFailed` - Notify failure, log error
- `monthlyPaymentSummary` - 9 AM 1st of month earnings summary
- `checkPaymentsBecomeAvailable` - 8 AM daily availability check
- `processInternationalPayout` - Wise payout orchestration
- `checkPendingInternationalPayouts` - Hourly Wise status check
- `processDomesticPayout` - Stripe payout orchestration
- `checkPendingDomesticPayouts` - Hourly :30 Stripe check
- `onTopupSucceeded` - Stripe webhook handler
- `dailyExpenseSync` - 6 AM sync to unified expenses
- `monthlyPLSnapshot` - 2 AM 2nd of month P&L generation

### Creator Communication Functions (15 tasks)
- `checkApprovalReminders` - 9 AM daily approved creator reminders
- `processCreatorEmailQueue` - Every 5 min, process 20 pending
- `scheduleCreatorWelcomeSequence` - Queue 4-email welcome series
- `cancelCreatorPendingEmails` - Cancel pending on status change
- `retryFailedCreatorEmails` - Retry failed sends
- `queueCreatorEmail` - Queue single email
- `queueProjectEmail` - Queue project-specific email
- `queuePaymentEmail` - Queue payment notification
- `onCreatorSetupComplete` - Cancel setup sequence emails
- `creatorProductDeliveryReminders` - 10 AM 5-day post-delivery
- `creatorDeadlineReminders` - 9 AM 3-day and 1-day warnings
- `creatorNoResponseReminders` - 2 PM 2-day no-response
- `creatorAbandonedApplicationReminders` - 1h SMS, 24h email, 48h final
- `sendCreatorReminder` - Manual reminder trigger

### Creator Application Processing
- `processCreatorApplication` - Application received workflow:
  - Send confirmation email
  - Notify admin via Slack
  - Track in Meta CAPI
  - Create pipeline entry

### Creator Analytics Aggregation Functions (3 tasks)
- `aggregateCreatorDailyMetrics` - 3 AM daily snapshot generation
- `generateWeeklyCreatorSummary` - Sunday 6 AM weekly aggregation
- `generateMonthlyCreatorReport` - 4 AM 1st of month comprehensive report

---

## Constraints

- Payout processing MUST NOT duplicate transactions (idempotency required)
- Email sequences MUST be cancellable mid-stream
- SMS reminders MUST check consent before sending
- All payouts MUST sync to unified expense tracking
- International payouts MUST handle currency conversion

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "Inngest step.waitForEvent patterns" - Event-driven workflows
- Context7 MCP: "Inngest concurrency limiting" - Prevent duplicate processing

**RAWDOG code to reference:**
- `src/trigger/payment-automation.ts` - Current payout orchestration
- `src/trigger/creator-email-queue.ts` - Email queue patterns
- `src/trigger/creator-reminders.ts` - Reminder scheduling logic
- `src/trigger/approval-reminders.ts` - Approval workflow

**Spec documents:**
- `AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` - Task schedules and purposes

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Email sequence cancellation strategy (soft cancel vs hard delete)
2. Payout idempotency key format (request ID vs hash)
3. Reminder deduplication window (24h vs 48h)
4. Failure notification escalation (immediate vs batched)

---

## Tasks

### [PARALLEL] Payout Processing Migration
- [ ] Migrate payout event handlers:
  - `payout/requested` → initiate flow
  - `payout/approved` → process payment
  - `payout/complete` → finalize, notify
  - `payout/failed` → error handling
- [ ] Migrate payout orchestration:
  - Step: Get request details
  - Step: Select provider (Stripe/Wise)
  - Step: Execute transfer
  - Step: Update status
  - Step: Record in ledger
  - Step: Send confirmation
- [ ] Migrate scheduled payout jobs:
  - Hourly international check
  - Hourly :30 domestic check
  - 8 AM availability check
  - 6 AM expense sync
  - Monthly summary (9 AM 1st)
  - Monthly P&L (2 AM 2nd)

### [PARALLEL] Creator Communications Migration
- [ ] Migrate email queue processing (every 5 min)
- [ ] Migrate welcome sequence scheduling
- [ ] Migrate reminder systems:
  - Product delivery (10 AM)
  - Deadlines (9 AM)
  - No-response (2 PM)
  - Abandoned applications (1h/24h/48h)
- [ ] Migrate Slack notifications for new applications

### [SEQUENTIAL after migrations] Payout Validation
- [ ] Test Stripe Connect payout flow end-to-end
- [ ] Test Wise payout flow end-to-end
- [ ] Verify expense sync accuracy
- [ ] Confirm email delivery rates
- [ ] Test sequence cancellation

---

## Cron Schedule Reference

| Task | Schedule | Inngest Cron |
|------|----------|--------------|
| Creator email queue | Every 5 min | `*/5 * * * *` |
| Approval reminders | Daily 9 AM | `0 9 * * *` |
| Product delivery reminders | Daily 10 AM | `0 10 * * *` |
| Deadline reminders | Daily 9 AM | `0 9 * * *` |
| No-response reminders | Daily 2 PM | `0 14 * * *` |
| Abandoned app reminders | Every hour :15 | `15 * * * *` |
| Check payments available | Daily 8 AM | `0 8 * * *` |
| International payout check | Every hour | `0 * * * *` |
| Domestic payout check | Every hour :30 | `30 * * * *` |
| Daily expense sync | Daily 6 AM | `0 6 * * *` |
| Monthly payment summary | 9 AM 1st | `0 9 1 * *` |
| Monthly P&L snapshot | 2 AM 2nd | `0 2 2 * *` |
| **Creator daily metrics aggregation** | Daily 3 AM | `0 3 * * *` |
| **Creator weekly summary** | Sunday 6 AM | `0 6 * * 0` |
| **Creator monthly report** | 4 AM 1st | `0 4 1 * *` |

---

## Creator Analytics Aggregation Jobs

**NEW**: These jobs aggregate creator metrics for the admin analytics dashboard.

### Daily Metrics Aggregation (`aggregateCreatorDailyMetrics`)
**Schedule**: Daily 3 AM
**Purpose**: Calculate per-creator daily metrics and create daily snapshot
**Tasks**:
- Calculate response times for each creator
- Count messages sent/received
- Track project activity (started, submitted, approved)
- Update `creator_response_metrics` table
- Create daily entry in `creator_analytics_snapshots`

### Weekly Creator Summary (`generateWeeklyCreatorSummary`)
**Schedule**: Sunday 6 AM
**Purpose**: Generate weekly aggregations and identify at-risk creators
**Tasks**:
- Create weekly snapshot aggregation
- Calculate week-over-week trends
- Identify at-risk creators (declining activity)
- Generate top performer highlights
- Optional: Slack notification to admins

### Monthly Creator Report (`generateMonthlyCreatorReport`)
**Schedule**: 1st of month 4 AM
**Purpose**: Comprehensive monthly analytics
**Tasks**:
- Application funnel analysis for month
- Earnings breakdown by tier/country
- Creator health assessment with churn analysis
- Create monthly snapshot entry
- Optional: Email PDF report to admins

See [PHASE-4G-CREATOR-ADMIN-ANALYTICS.md](./PHASE-4G-CREATOR-ADMIN-ANALYTICS.md) for database schema and API details.

---

## Payout Provider Selection Logic

```
IF creator.country == 'US' AND creator.stripeConnected:
  → Stripe Connect (instant/standard)
ELIF creator.wiseRecipientId:
  → Wise Business API
ELSE:
  → Queue for manual review
```

Inngest function must implement this selection with step-based execution:
1. Step: Check Stripe Connect status
2. Step: Check Wise recipient status
3. Step: Route to appropriate provider
4. Step: Execute transfer
5. Step: Update unified balance

---

## Definition of Done

- [ ] All 30 creator tasks responding to events
- [ ] Payout flow tested for US (Stripe) and international (Wise)
- [ ] Email sequences sending correctly
- [ ] Reminders triggering at scheduled times
- [ ] Expense sync verified against manual audit
- [ ] Monthly reports generating accurately
- [ ] `npx tsc --noEmit` passes
- [ ] No duplicate payouts in test period
