# PHASE-5E: Scheduled & System Job Migrations

> **STATUS**: ✅ COMPLETE (2026-02-12)
> **Completed By**: Wave 3A Agents

**Duration**: 5-6 days (Week 21)
**Depends On**: PHASE-5A (Jobs Infrastructure Setup)
**Parallel With**: PHASE-5B, PHASE-5C, PHASE-5D (after 5A complete)
**Blocks**: PHASE-6A (MCP Transport)

---

## Goal

Migrate all remaining Trigger.dev tasks to Inngest, including system monitoring, digests, alerts, webhooks, subscriptions, video processing, and miscellaneous scheduled jobs. This covers approximately 79 remaining tasks and completes the Trigger.dev migration.

---

## Success Criteria

- [x] All 79 remaining tasks migrated
- [x] Health monitoring operational (1 min critical, 5 min full)
- [x] Daily/weekly digests sending
- [x] Alert system working (Slack + SMS)
- [x] Subscription billing processing daily
- [x] Video processing pipeline functional
- [x] Webhook queue draining correctly
- [x] All cron jobs executing on schedule
- [x] Vendor-agnostic abstraction supports Trigger.dev or Inngest

---

## Deliverables

### System Monitoring (2 tasks)
- `opsHealthCheckFull` - Every 5 min, all services
- `opsHealthCheckCritical` - Every 1 min, critical-path only

### Digests & Notifications (4 tasks)
- `adminDailyDigest` - 8 AM Mon-Fri admin summary
- `atRiskProjectsAlert` - 9 AM, 2 PM Mon-Fri project alerts
- `creatorWeeklyDigest` - 10 AM Monday creator summary

### Alerts & Automation (8+ tasks)
- `criticalAlert` - Slack + SMS immediate
- `systemErrorAlert` - Auto-severity routing
- `highValueSubmissionAlert` - $500+ projects
- `creatorComplaintAlert` - Urgent complaints
- `securityAlert` - Suspicious login detection
- `apiFailureAlert` - Service failure notification
- `unusualActivityAlert` - High volume patterns
- `milestoneAlert` - Celebration triggers

### Subscriptions & Billing (9 tasks)
- `subscriptionDailyBilling` - 6 AM process all due
- `subscriptionProcessBilling` - Single subscription
- `subscriptionBatchBilling` - Batch processing
- `subscriptionRetryFailed` - Retry after payment update
- `subscriptionCatchupBilling` - Specific date processing
- `subscriptionShadowValidation` - 7 AM Loop comparison
- `subscriptionAnalyticsSnapshot` - 8 AM MRR/churn
- `subscriptionUpcomingReminder` - 10 AM 3-day warning

### Video & Media Processing (6+ tasks)
- `creatorFileProcessing` - Mux asset creation (5 min max)
- `creatorFileBatchProcessing` - Batch 50 files (30 min)
- `damIngestProject` - Ingest to DAM
- `damBulkIngest` - Backfill all projects
- `detectAssetFaces` - Face detection
- `batchDetectFaces` - Queue batch detection
- `scanAllForFaces` - Find and queue images

### Webhook Queue Processing
- `processWebhookQueue` - Every 5 min, 100 pending
- Mark processed, increment retry on failure

### Brand Context & DAM (5+ tasks)
- `processBrandDocument` - Extract, chunk, embed
- `refreshBrandEmbeddings` - Refresh 50 chunks
- `cleanupBrandContextCache` - Every 6h cache cleanup
- `detectStaleBrandContent` - Monday 9 AM 90-day flag
- `syncUrlBrandContent` - Re-fetch URL content

### SMS Queue (3 tasks)
- `sendSms` - Send with consent check
- `sendBulkSms` - Queue multiple recipients
- `retryDeadLetterSms` - 1h cooldown retry

### Additional Tasks (~40)
- BRI tasks (8): Gmail, Slack, Meetings integration
- DAM notifications, rights, Mux backfill
- Flow execution, workflow engine
- E-sign reminders
- Escalations management
- Gift card emails
- Commission maturation
- Onboarding automation
- Project automation
- Scheduled reports
- Slack integrations
- Stripe token refresh
- W9 compliance reminders
- Google Drive sync
- Klaviyo sync
- Video transcription
- Agent memory decay

---

## Constraints

- Health checks MUST complete within 30 seconds
- Video processing MUST support 30 min timeout
- SMS MUST check consent before every send
- Billing MUST be idempotent (no duplicate charges)
- Alert SMS MUST rate-limit to prevent spam

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "Inngest concurrency limits" - Prevent parallel billing
- Context7 MCP: "Inngest step.invoke patterns" - Chain sub-functions

**RAWDOG code to reference:**
- `src/trigger/health-checks.ts` - Health monitoring
- `src/trigger/daily-digests.ts` - Digest patterns
- `src/trigger/admin-alerts.ts` - Alert routing
- `src/trigger/subscription-billing.ts` - Billing logic
- `src/trigger/creator-file-processing.ts` - Video pipeline
- `src/trigger/sms-queue.ts` - SMS patterns
- `src/trigger/brand-context-ingest.ts` - Embedding pipeline
- `src/trigger/dam-*.ts` - DAM operations
- `src/trigger/bri-*.ts` - AI agent tasks

**Spec documents:**
- `AUTOMATIONS-TRIGGER-DEV-2025-02-10.md` - Full task inventory

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Health check service ordering (parallel vs sequential)
2. Video processing queue priority (FIFO vs priority-based)
3. Alert escalation thresholds (when to SMS vs Slack-only)
4. Billing retry cadence (immediate vs exponential backoff)

---

## Tasks

### [PARALLEL] System Monitoring Migration
- [ ] Migrate health checks:
  - Critical (1 min): DB, Redis, Shopify
  - Full (5 min): All 15+ services
- [ ] Configure alert routing on failures

### [PARALLEL] Digest & Alert Migration
- [ ] Migrate daily digest (8 AM Mon-Fri)
- [ ] Migrate at-risk alerts (9 AM, 2 PM)
- [ ] Migrate weekly creator digest (10 AM Monday)
- [ ] Migrate all 8 alert types with proper routing

### [PARALLEL] Subscription Billing Migration
- [ ] Migrate daily billing (6 AM, 1 hour timeout)
- [ ] Migrate shadow validation (7 AM Loop comparison)
- [ ] Migrate analytics snapshot (8 AM)
- [ ] Migrate upcoming reminder (10 AM)
- [ ] Configure concurrency limit: 1 (prevent double-billing)

### [PARALLEL] Video Processing Migration
- [ ] Migrate Mux asset creation (5 min timeout)
- [ ] Migrate batch processing (30 min timeout)
- [ ] Migrate DAM ingestion pipeline
- [ ] Migrate face detection queue

### [PARALLEL] Remaining Tasks Migration
- [ ] Migrate webhook queue (every 5 min)
- [ ] Migrate SMS queue with consent checks
- [ ] Migrate brand context tasks
- [ ] Migrate BRI (AI agent) tasks
- [ ] Migrate all miscellaneous scheduled tasks

### [SEQUENTIAL after all migrations] Migration Cleanup
- [ ] Run parallel systems for 48 hours
- [ ] Verify all cron jobs executing on schedule
- [ ] Disable Trigger.dev completely
- [ ] Remove Trigger.dev dependencies from package.json
- [ ] Archive Trigger.dev code (move to `/_archive/`)
- [ ] Update documentation
- [ ] Remove `npm run dev:all` from scripts

---

## Complete Cron Schedule Reference

| Task | Schedule | Inngest Cron |
|------|----------|--------------|
| Health critical | Every 1 min | `* * * * *` |
| Health full | Every 5 min | `*/5 * * * *` |
| Webhook queue | Every 5 min | `*/5 * * * *` |
| Subscription billing | Daily 6 AM | `0 6 * * *` |
| Subscription validation | Daily 7 AM | `0 7 * * *` |
| Subscription analytics | Daily 8 AM | `0 8 * * *` |
| Admin digest | 8 AM Mon-Fri | `0 8 * * 1-5` |
| At-risk alert AM | 9 AM Mon-Fri | `0 9 * * 1-5` |
| At-risk alert PM | 2 PM Mon-Fri | `0 14 * * 1-5` |
| Subscription reminder | Daily 10 AM | `0 10 * * *` |
| Creator weekly digest | 10 AM Monday | `0 10 * * 1` |
| Brand cache cleanup | Every 6 hours | `0 */6 * * *` |
| Stale content detection | 9 AM Monday | `0 9 * * 1` |

---

## Migration Strategy Summary

### Phase 1: Parallel Run (Week 19, with 5A)
- Inngest deployed alongside Trigger.dev
- Events routed to both systems
- Compare for parity

### Phase 2: Cutover (Week 20-21, with 5B-5E)
- Disable Trigger.dev for each category after validation
- Keep Trigger.dev running for in-flight jobs
- Monitor Inngest performance

### Phase 3: Cleanup (End of Week 21)
- Remove all Trigger.dev code
- Archive task definitions
- Update all documentation
- Delete Trigger.dev account

---

## Definition of Done

- [ ] All 199 Trigger.dev tasks migrated to Inngest
- [ ] Health monitoring operational
- [ ] All cron jobs executing on schedule
- [ ] Zero-downtime migration verified
- [ ] Trigger.dev dependencies removed from package.json
- [ ] Trigger.dev code archived
- [ ] `npm run dev` works without worker (no `dev:all`)
- [ ] Cost savings validated (no worker costs)
- [ ] `npx tsc --noEmit` passes
- [ ] Phase 6 (MCP) unblocked
