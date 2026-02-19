# AGENT-07: Communications Package Audit
**Date**: 2026-02-19  
**Auditor**: Agent-07 (Communications Specialist)  
**Scope**: `packages/communications/src/`, `packages/slack/src/`, `apps/admin/src/` (communications-related UI/API routes)  
**Phase Docs Audited**: PHASE-2CM-EMAIL-QUEUE, PHASE-2CM-INBOUND-EMAIL, PHASE-2CM-RESEND-ONBOARDING, PHASE-2CM-SENDER-DNS, PHASE-2CM-SLACK-INTEGRATION, PHASE-2CM-SMS, PHASE-2CM-TEMPLATE-LIBRARY, PHASE-2CM-TEMPLATES

---

## Executive Summary

All 8 communications phases are marked `STATUS: COMPLETE` in their phase docs, but **significant gaps exist between documented "complete" status and actual implementation**. The pattern across all phases is:

- **Backend (packages)**: 95%+ complete — data models, DB ops, API routes, and business logic are solid
- **Frontend UI**: 40–60% complete — multiple UI pages explicitly "deferred to frontend phase" but never returned to
- **Scheduled/background jobs**: Stub-only implementations; Slack reports scheduler has no trigger.dev job; digest jobs are stubs with `console.log` placeholders

**Critical finding**: Phase docs mark items `[x]` DONE where the phase notes say "deferred to UI phase." This creates false confidence in completion status.

---

## Phase-by-Phase Audit

---

### 📦 PHASE-2CM-EMAIL-QUEUE

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ⚠️ PARTIAL

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| Queue tables (review, creator, subscription, esign, treasury, team_invitation) | ✅ DONE | `packages/communications/src/queue/types.ts` exports all 6 QueueType values; API route `/api/admin/email-queues/[queueType]` validates all 6 |
| Atomic claim pattern (prevents race conditions) | ✅ DONE | `src/queue/claim.ts` exists; phase doc confirms `[x]` |
| Exponential backoff retry | ✅ DONE | `src/queue/retry.ts` exists; phase doc confirms `[x]` |
| Multi-sequence email tracking | ✅ DONE | `src/queue/sequence.ts` exists; phase doc confirms `[x]` |
| Queue stats endpoint | ✅ DONE | `src/queue/stats.ts`; `/api/admin/email-queues/[queueType]` handles GET |
| Bulk actions endpoint (skip, retry, reschedule) | ✅ DONE | `src/queue/bulk-actions.ts`; phase doc `[x]` |
| Review email queue processor | ✅ DONE | `src/processors/review-processor.ts` |
| Base processor abstraction | ✅ DONE | `src/processors/base-processor.ts` |
| Retry processor for failed entries | ✅ DONE | `src/processors/retry-processor.ts` |
| Creator email queue processor | ⚠️ PARTIAL | Phase doc explicitly: `[ ] Implement creator email queue processor (placeholder - uses base processor)` |
| Subscription email queue processor | ⚠️ PARTIAL | Phase doc: `[ ] Implement subscription email queue processor (placeholder - uses base processor)` |
| Review Queue UI page | ❌ NOT DONE | Phase doc: `deferred to UI phase`; no page at `/admin/commerce/reviews/email-queue` |
| Creator Queue UI page | ⚠️ PARTIAL | `/admin/creators/communications/queue/page.tsx` EXISTS but only uses `getQueueEntries` from `@/lib/creator-communications/db` (local lib, not generic) |
| Subscription Queue UI page | ❌ NOT DONE | Phase doc: `deferred to UI phase`; no page exists |
| E-Sign Queue UI page | ❌ NOT DONE | No page at `/admin/esign/email-queue` |
| Treasury Queue UI page | ❌ NOT DONE | No page at `/admin/treasury/email-queue` |
| Team Invitation Queue UI page | ❌ NOT DONE | No page exists |
| `QueueListPage` component | ❌ NOT DONE | Phase doc: `deferred to UI phase` |
| `QueueFilters` component | ❌ NOT DONE | Phase doc: `deferred to UI phase` |
| `QueueStatsHeader` component | ❌ NOT DONE | Phase doc: `deferred to UI phase` |
| `QueueEntryRow` component | ❌ NOT DONE | Phase doc: `deferred to UI phase` |
| `QueueEntryDetail` modal | ❌ NOT DONE | Phase doc: `deferred to UI phase` |
| `BulkActionsBar` component | ❌ NOT DONE | Phase doc: `deferred to UI phase` |
| Integration test for email sequence flow | ❌ NOT DONE | Phase doc: `[ ] Integration test for email sequence flow passes (requires database)` |

#### TODO List — EMAIL-QUEUE Gaps

```
TODO-EQ-01: Implement creator email queue processor (full implementation, not placeholder)
  File: packages/communications/src/processors/creator-processor.ts
  Base on: src/processors/review-processor.ts
  Must handle: approval → onboarding → reminder sequence

TODO-EQ-02: Implement subscription email queue processor
  File: packages/communications/src/processors/subscription-processor.ts
  Must handle: created → renewal reminder → cancellation sequences

TODO-EQ-03: Build shared QueueListPage component
  File: apps/admin/src/components/communications/QueueListPage.tsx
  Props: queueType, tenantId
  Features: filter by status, date range, email search; pagination

TODO-EQ-04: Build QueueFilters component
  File: apps/admin/src/components/communications/QueueFilters.tsx
  Props: filters, onChange
  Controls: status dropdown, date range, email search input

TODO-EQ-05: Build QueueStatsHeader component
  File: apps/admin/src/components/communications/QueueStatsHeader.tsx
  Shows: pending, scheduled, sent, failed, skipped counts

TODO-EQ-06: Build QueueEntryRow component
  File: apps/admin/src/components/communications/QueueEntryRow.tsx
  Shows: email, status badge, scheduled_at, attempt count, actions (skip/retry)

TODO-EQ-07: Build QueueEntryDetail modal
  File: apps/admin/src/components/communications/QueueEntryDetail.tsx
  Shows: full entry detail, sequence info, error message, history

TODO-EQ-08: Build BulkActionsBar component
  File: apps/admin/src/components/communications/BulkActionsBar.tsx
  Actions: bulk skip, bulk retry, bulk reschedule

TODO-EQ-09: Create Review Queue admin page
  File: apps/admin/src/app/admin/commerce/reviews/email-queue/page.tsx
  Uses: QueueListPage with queueType='review'

TODO-EQ-10: Create Subscription Queue admin page
  File: apps/admin/src/app/admin/commerce/subscriptions/email-queue/page.tsx
  Uses: QueueListPage with queueType='subscription'

TODO-EQ-11: Create E-Sign Queue admin page
  File: apps/admin/src/app/admin/esign/email-queue/page.tsx
  Uses: QueueListPage with queueType='esign'

TODO-EQ-12: Create Treasury Queue admin page
  File: apps/admin/src/app/admin/treasury/email-queue/page.tsx
  Uses: QueueListPage with queueType='treasury'

TODO-EQ-13: Create Team Invitation Queue admin page
  File: apps/admin/src/app/admin/settings/team/email-queue/page.tsx
  Uses: QueueListPage with queueType='team_invitation'

TODO-EQ-14: Add queue nav links to each section's sidebar
  Files: Each respective admin section layout/nav

TODO-EQ-15: Write integration test for full review email sequence
  File: packages/communications/src/__tests__/queue-sequence.integration.test.ts
  Tests: pending → scheduled → processing → sent → follow-up sequence
```

---

### 📦 PHASE-2CM-INBOUND-EMAIL

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ⚠️ PARTIAL

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| Inbound webhook endpoint (`/api/webhooks/resend/inbound`) | ✅ DONE | Phase doc `[x]`; `src/inbound/` directory exists |
| Resend webhook signature verification | ✅ DONE | Phase doc `[x]` |
| Route by TO address → tenant lookup | ✅ DONE | Phase doc `[x]` |
| Treasury approval parser (keyword detection) | ✅ DONE | Phase doc `[x]`; `src/inbound/` impl confirmed |
| Receipt processor with Vercel Blob upload | ✅ DONE | Phase doc `[x]` |
| Thread matcher for support/reply emails | ✅ DONE | Phase doc `[x]` |
| Creator reply handler | ✅ DONE | Phase doc `[x]` |
| Auto-reply detection and ignoring | ✅ DONE | Phase doc `[x]` |
| `inbound_email_logs` table | ✅ DONE | Phase doc `[x]` |
| `treasury_communications` table | ✅ DONE | Phase doc `[x]` |
| Inbound email list API endpoint | ✅ DONE | Phase doc `[x]` |
| Inbound email detail API endpoint | ✅ DONE | Phase doc `[x]` |
| Reprocess endpoint | ✅ DONE | Phase doc `[x]` |
| Receipt list/detail endpoints | ✅ DONE | Phase doc `[x]` |
| Receipt → expense linking endpoint | ✅ DONE | Phase doc `[x]` |
| Treasury communications endpoint | ✅ DONE | Phase doc `[x]` |
| Treasury CommunicationLog component | ✅ DONE | `apps/admin/src/components/admin/treasury/CommunicationLog.tsx` exists and renders communications |
| Slack/dashboard notifications for inbound | ❌ NOT DONE | Phase doc: `[ ] Implement Slack/dashboard notifications (deferred to Phase 2CM-NOTIFICATIONS)` |
| Inbound email list admin UI page | ❌ NOT DONE | Phase doc: `deferred to frontend phase`; no page found |
| Inbound email detail modal | ❌ NOT DONE | Phase doc: `deferred to frontend phase` |
| Receipt queue admin page with thumbnails | ❌ NOT DONE | Phase doc: `deferred to frontend phase` |
| Receipt categorization modal | ❌ NOT DONE | Phase doc: `deferred to frontend phase` |
| Treasury communications timeline (standalone) | ⚠️ PARTIAL | `CommunicationLog.tsx` exists but is embedded in draw request detail; no standalone timeline page |
| Manual approval override UI | ❌ NOT DONE | Phase doc: `deferred to frontend phase` |
| All inbound emails visible in admin UI | ❌ NOT DONE | Success criterion from DoD; no list page exists |
| Integration test for inbound → treasury approval | ❌ NOT DONE | Phase doc: `[ ]` |

#### TODO List — INBOUND-EMAIL Gaps

```
TODO-IE-01: Build inbound email list page
  File: apps/admin/src/app/admin/communications/inbound/page.tsx
  Features: list all inbound emails, filter by type/status/date, search by from_address
  API: GET /api/admin/communications/inbound (already implemented)

TODO-IE-02: Build inbound email detail modal/drawer
  File: apps/admin/src/components/communications/InboundEmailDetail.tsx
  Shows: from/to/subject, body text, attachments, linked_record, processing_status
  Actions: reprocess button if failed, link to related record

TODO-IE-03: Build receipt queue admin page
  File: apps/admin/src/app/admin/treasury/receipts/page.tsx
  Features: list receipts, thumbnail preview, status filter, link to expense
  API: GET /api/admin/treasury/receipts (already implemented)

TODO-IE-04: Build receipt categorization modal
  File: apps/admin/src/components/treasury/ReceiptCategoryModal.tsx
  Features: show receipt preview, category picker, amount, date, notes
  API: POST /api/admin/treasury/receipts/[id]/link-expense

TODO-IE-05: Build treasury draw request detail page with full comms timeline
  File: apps/admin/src/app/admin/treasury/requests/[id]/page.tsx
  Shows: request details + CommunicationLog timeline + manual override
  The CommunicationLog component already exists — just needs a page to embed it

TODO-IE-06: Build manual treasury approval override UI
  File: apps/admin/src/components/treasury/ManualApprovalOverride.tsx
  Actions: approve/reject with reason, overrides email-parsed decision
  API: needs endpoint POST /api/admin/treasury/requests/[id]/manual-approve

TODO-IE-07: Implement Slack notifications for inbound emails
  File: packages/communications/src/inbound/notify.ts
  Trigger on: treasury approval received, receipt parsed, support email received
  Use: packages/slack notifications system already in place

TODO-IE-08: Add "Communications" section to main admin sidebar
  Route: /admin/communications/inbound
  Scope: shows all inbound email types across categories

TODO-IE-09: Write integration test for inbound → treasury approval flow
  File: packages/communications/src/__tests__/inbound-treasury.integration.test.ts
  Tests: webhook receipt → keyword parse → treasury_communications insert → status update
```

---

### 📦 PHASE-2CM-RESEND-ONBOARDING

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ✅ DONE (minor gap)

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| All onboarding API routes (verify-api-key, domains, addresses, inbound, routing, complete) | ✅ DONE | All routes confirmed in `apps/admin/src/app/api/admin/onboarding/email/` |
| `email-setup-wizard.tsx` component | ✅ DONE | Confirmed at `apps/admin/src/components/onboarding/email/email-setup-wizard.tsx` |
| `email-setup-banner.tsx` (incomplete setup warning) | ✅ DONE | Confirmed |
| Step 5a: Resend account setup component | ✅ DONE | `steps/resend-account-step.tsx` |
| Step 5b: Domain configuration component | ✅ DONE | `steps/domain-config-step.tsx` |
| Step 5c: Sender address step component | ✅ DONE | `steps/sender-address-step.tsx` |
| Step 5d: Inbound email step component | ✅ DONE | `steps/inbound-email-step.tsx` |
| Step 5e: Notification routing step component | ✅ DONE | `steps/notification-routing-step.tsx` |
| Email setup integrated into main tenant onboarding wizard | ✅ DONE | `email-setup-wizard.tsx` is the only consumer of all steps |
| Skip option with admin banner | ✅ DONE | `email-setup-banner.tsx` confirmed |
| Tenant cannot send emails until setup complete | ✅ DONE | Phase doc `[x]`; blocking logic in onboarding package |
| E2E test for full email setup flow | ❌ NOT DONE | Phase doc: `[ ] E2E test for full email setup flow passes` |

#### TODO List — RESEND-ONBOARDING Gaps

```
TODO-RO-01: Write E2E test for tenant email onboarding flow
  File: apps/admin/e2e/onboarding-email-setup.spec.ts (or vitest integration)
  Tests: API key validation → domain add → DNS check → sender create → test email → complete
  Note: Phase doc acknowledges E2E infrastructure not yet set up
```

---

### 📦 PHASE-2CM-SENDER-DNS

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ✅ DONE (minor gaps)

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| `domains.ts` - domain CRUD | ✅ DONE | `packages/communications/src/sender/domains.ts` |
| `addresses.ts` - sender address management | ✅ DONE | `src/sender/addresses.ts` |
| `routing.ts` - notification type → sender routing | ✅ DONE | `src/sender/routing.ts` |
| `dns-instructions.ts` - DNS setup generation | ✅ DONE | `src/sender/dns-instructions.ts` |
| `verification.ts` - Resend domain verification wrapper | ✅ DONE | `src/sender/verification.ts` |
| Domain list/add API endpoints | ✅ DONE | Phase doc `[x]` |
| Domain verification endpoint | ✅ DONE | Phase doc `[x]` |
| DNS instructions endpoint | ✅ DONE | Phase doc `[x]` |
| Sender address CRUD endpoints | ✅ DONE | Phase doc `[x]` |
| Test email endpoint | ✅ DONE | Phase doc `[x]` |
| Notification routing endpoints | ✅ DONE | Phase doc `[x]` |
| Domains & Addresses tab UI | ✅ DONE | `apps/admin/src/app/admin/settings/email/domains/page.tsx` |
| Add Domain modal with subdomain support | ✅ DONE | `settings/email/components/add-domain-modal.tsx` |
| DNS Instructions component (step-by-step) | ✅ DONE | `settings/email/components/dns-instructions-panel.tsx` |
| Sender Address list per domain | ✅ DONE | `settings/email/components/sender-address-list.tsx` |
| Add Sender Address modal | ✅ DONE | `settings/email/components/add-sender-address-modal.tsx` |
| Notification Routing tab UI | ✅ DONE | `settings/email/components/routing-list.tsx` |
| Test Email modal | ✅ DONE | `settings/email/components/test-email-modal.tsx` |
| `getSenderForNotification()` integrated into all email sending | ✅ DONE | Phase doc `[x]` |
| No hardcoded sender addresses | ✅ DONE | Phase doc `[x]` |
| Unit tests for routing logic | ❌ NOT DONE | Phase doc: `[ ] Unit tests for routing logic pass (deferred - testing infrastructure not yet set up)` |
| E2E test for domain addition and verification | ❌ NOT DONE | Phase doc: `[ ] E2E test for domain addition and verification passes (deferred - E2E not yet set up)` |

#### TODO List — SENDER-DNS Gaps

```
TODO-SD-01: Write unit tests for routing logic
  File: packages/communications/src/__tests__/sender-routing.test.ts
  Tests: notification type maps to correct sender; fallback when no match; tenant isolation

TODO-SD-02: Write E2E test for domain addition and verification flow
  File: apps/admin/e2e/email-domain-setup.spec.ts
  Tests: add domain → show DNS instructions → verify domain → create sender → test email
```

---

### 📦 PHASE-2CM-SLACK-INTEGRATION

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ⚠️ PARTIAL (significant gaps in UI, scheduler, and super admin area)

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| Slack OAuth connect flow | ✅ DONE | `/api/admin/integrations/slack/connect/route.ts`; `settings/integrations/slack/page.tsx` |
| Bot/user token AES-256-CBC encryption | ✅ DONE | Phase doc `[x]`; slack package `client.ts` |
| OAuth state protected with Redis TTL | ✅ DONE | Phase doc `[x]` |
| Disconnect and reconnect | ✅ DONE | `/api/admin/integrations/slack/disconnect/route.ts` |
| Channel list fetch and cache | ✅ DONE | `/api/admin/notifications/slack/channels/route.ts` + refresh route |
| 40+ notification types configurable | ✅ DONE | `NOTIFICATION_TYPES` from `@cgk-platform/slack/types` used in settings page |
| Channel mapping per notification type | ✅ DONE | `/api/admin/notifications/slack/mappings/route.ts` |
| Enable/disable per notification type | ✅ DONE | `settings/notifications/slack/page.tsx` has toggle |
| Test message for every type | ✅ DONE | `/api/admin/notifications/slack/test/route.ts` |
| Block Kit message templates | ✅ DONE | Phase doc `[x]`; slack package has Block Kit builders |
| Slack template CRUD API | ✅ DONE | `/api/admin/notifications/slack/templates/[type]/route.ts`; reset route exists |
| Notification log API | ✅ DONE | `/api/admin/notifications/slack/logs/route.ts` |
| User mention resolution by email | ✅ DONE | `packages/slack/src/` has user lookup; `bri/slack-users/page.tsx` |
| User ↔ Slack account linking UI | ✅ DONE | `/admin/bri/slack-users/page.tsx` with search and link |
| Scheduled reports backend (CRUD + send) | ✅ DONE | `packages/slack/src/reports.ts`; `getDueReports()`, `sendReport()`, `shouldRunReport()` all implemented |
| Reports API (create, read, update, delete, send-now) | ✅ DONE | `/api/admin/notifications/slack/reports/route.ts` and sub-routes |
| Scheduled reports UI page (tenant-facing) | ❌ NOT DONE | No page found at any route; phase doc shows it as DONE `[x]` but no admin page exists to create/manage/view reports |
| Report metrics drag-and-drop customization | ❌ NOT DONE | API supports metrics config but no UI exists |
| "Send Now" for reports from UI | ❌ NOT DONE | API endpoint exists (`reports/[id]/send/route.ts`) but no UI page calls it |
| Slack template customization UI page | ❌ NOT DONE | API exists for templates CRUD; no UI page for editing Block Kit templates |
| Scheduled reports cron job (trigger.dev) | ❌ NOT DONE | `getDueReports()` exists in reports.ts but no trigger.dev job registers it; `packages/jobs/src/handlers/scheduled/` has digests/alerts but no slack-reports job |
| Super admin ops Slack connection UI | ❌ NOT DONE | `packages/slack/src/alerts.ts` has `savePlatformWorkspace()` and `getPlatformWorkspace()` but no admin API routes or UI pages call them |
| Super admin ops Slack API routes | ❌ NOT DONE | No routes found for `platform_slack_workspace` in admin app |
| Cross-tenant alert routing by severity | ⚠️ PARTIAL | Alert jobs in `packages/jobs/src/handlers/scheduled/alerts.ts` define routing logic but use `console.log` placeholders instead of actual Slack calls; no trigger.dev job connects them to `slack/alerts.ts` |
| Analytics Slack alerts tab | ✅ DONE | `apps/admin/src/app/admin/analytics/components/tabs/slack-notifications-tab.tsx` exists and functional |
| Multi-tenant isolation | ✅ DONE | All queries use `withTenant()` |

#### TODO List — SLACK-INTEGRATION Gaps

```
TODO-SI-01: Build Slack scheduled reports management UI page
  File: apps/admin/src/app/admin/settings/notifications/slack/reports/page.tsx
  Features:
    - List existing reports (name, channel, frequency, last_run, status)
    - Create new report button → modal/form
    - Edit report (metrics, schedule, channel, timezone)
    - Delete report
    - "Send Now" button per report
    - Enable/disable toggle per report
  API: All endpoints exist at /api/admin/notifications/slack/reports/

TODO-SI-02: Build Slack template customization UI page
  File: apps/admin/src/app/admin/settings/notifications/slack/templates/page.tsx
  Features:
    - List all notification types with custom/default indicator
    - Click to edit: Block Kit JSON editor (Monaco or CodeMirror)
    - Live preview using mock data
    - Reset to default button
    - Test send button
  API: All endpoints exist at /api/admin/notifications/slack/templates/[type]/

TODO-SI-03: Create trigger.dev job for Slack scheduled reports
  File: packages/jobs/src/handlers/scheduled/slack-reports.ts
  Implementation:
    - Import getDueReports() from @cgk-platform/slack
    - Schedule: runs every hour (cron: '0 * * * *')
    - For each due report: call sendReport() with correct tenantId
    - Log results (success/failure) to tenant_slack_reports.last_run_status
  Register in: packages/jobs/src/index.ts

TODO-SI-04: Create super admin Slack ops API routes
  Files:
    - apps/admin/src/app/api/admin/platform/slack/route.ts (GET/POST workspace)
    - apps/admin/src/app/api/admin/platform/slack/test/route.ts (POST connection test)
    - apps/admin/src/app/api/admin/platform/slack/alerts/route.ts (GET alert log)
  Uses: savePlatformWorkspace(), getPlatformWorkspace() from @cgk-platform/slack/alerts

TODO-SI-05: Build super admin Slack ops UI page
  File: apps/admin/src/app/admin/platform/slack/page.tsx (or settings equivalent)
  Features:
    - Connect platform ops Slack workspace (separate from tenant workspaces)
    - Configure alert severity channels (critical, errors, warnings, info, deployments)
    - Configure mention groups for critical/error alerts
    - Alert log viewer (cross-tenant)
    - Test alert send

TODO-SI-06: Wire up alert jobs to actual Slack calls (not console.log placeholders)
  Files: packages/jobs/src/handlers/scheduled/alerts.ts, digests.ts
  For each job handler that has `console.log('[Alert] Sending Slack...')`:
    - Replace with actual `sendPlatformAlert()` call from @cgk-platform/slack/alerts
    - Or use tenant's slack notifications for tenant-scoped alerts
  Also wire: packages/jobs/src/handlers/scheduled/digests.ts (atRiskProjectsAlertJob → Slack)

TODO-SI-07: Add Slack reports link to notification settings nav
  File: apps/admin/src/app/admin/settings/notifications/slack/page.tsx
  Add: Tab or section link to /settings/notifications/slack/reports

TODO-SI-08: Add Slack templates link to notification settings nav
  Same file as SI-07; add link to /settings/notifications/slack/templates
```

---

### 📦 PHASE-2CM-SMS

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ⚠️ PARTIAL (backend complete; all UI is pending)

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| `tenant_sms_settings` table + encryption | ✅ DONE | Phase doc `[x]` |
| `notification_channel_settings` table | ✅ DONE | Phase doc `[x]` |
| `sms_templates` table + character count validation | ✅ DONE | Phase doc `[x]` |
| `sms_opt_outs` table | ✅ DONE | Phase doc `[x]` |
| `sms_queue` table + indexes | ✅ DONE | Phase doc `[x]` |
| Twilio provider wrapper | ✅ DONE | `packages/communications/src/sms/` |
| SMS queue operations (claim, send, mark status) | ✅ DONE | Phase doc `[x]` |
| Opt-out management functions | ✅ DONE | Phase doc `[x]` |
| TCPA compliance (quiet hours, opt-out check) | ✅ DONE | Phase doc `[x]` |
| SMS template CRUD operations | ✅ DONE | `src/sms/templates.ts` confirmed; full CRUD + variable substitution |
| Variable substitution for SMS | ✅ DONE | `substituteVariables()` in templates.ts |
| Character count and segment calculation | ✅ DONE | Phase doc `[x]` |
| SMS queue processor job | ✅ DONE | Phase doc `[x]` |
| Atomic claim pattern for SMS queue | ✅ DONE | Phase doc `[x]` |
| Retry logic with exponential backoff | ✅ DONE | Phase doc `[x]` |
| Twilio webhook handler (delivery status) | ✅ DONE | Phase doc `[x]` |
| SMS settings API endpoints | ✅ DONE | `/api/admin/sms/` routes confirmed |
| Template management API endpoints | ✅ DONE | Phase doc `[x]` |
| Queue list/detail API endpoints | ✅ DONE | Phase doc `[x]` |
| Opt-out management API endpoints | ✅ DONE | `/api/admin/sms/opt-outs/route.ts` and `[phone]/route.ts` confirmed |
| Test SMS endpoint | ✅ DONE | Phase doc `[x]` |
| SMS status page (basic) | ⚠️ PARTIAL | `/admin/integrations/sms/page.tsx` shows connection status and test-send, but NO Twilio wizard, no feature toggles, no template editing |
| SMS audit log page | ✅ DONE | `/admin/integrations/sms/audit-log/page.tsx` — comprehensive filter + export |
| SMS notification type config page | ⚠️ PARTIAL | `/admin/integrations/sms/notifications/page.tsx` — shows hardcoded notification list with channel toggles, but API not wired up to persist changes |
| SMS master enable/disable toggle UI | ❌ NOT DONE | Phase doc: `[ ] Build SMS enable/disable toggle in settings (API ready, UI pending)` |
| Twilio setup wizard UI | ❌ NOT DONE | Phase doc: `[ ] Build Twilio setup wizard component (API ready, UI pending)` |
| Per-notification channel selector UI (Email/SMS/Both) | ❌ NOT DONE | Phase doc: `[ ] Build per-notification channel selector (API ready, UI pending)`; notifications page has static toggles but doesn't call API |
| SMS template editor with character counter | ❌ NOT DONE | Phase doc: `[ ] Build SMS template editor with character counter (API ready, UI pending)` |
| SMS queue list admin page | ❌ NOT DONE | Phase doc: `[ ] Build SMS queue list page (API ready, UI pending)` |
| Opt-out management admin page | ❌ NOT DONE | Phase doc: `[ ] Build opt-out management page (API ready, UI pending)`; only API routes exist, no page.tsx |
| SMS as Step 6 in tenant onboarding | ❌ NOT DONE | Phase doc: `[ ] Add SMS as optional Step 6 in tenant onboarding (API ready, UI pending)` |
| SMS setup skip logic | ❌ NOT DONE | Phase doc: `[ ] Implement skip logic for SMS setup (API ready, UI pending)` |
| Twilio phone verification flow | ❌ NOT DONE | Phase doc: `[ ] Implement Twilio verification flow (API ready, UI pending)` |

#### TODO List — SMS Gaps

```
TODO-SMS-01: Build SMS master enable/disable toggle
  File: apps/admin/src/app/admin/integrations/sms/page.tsx (update existing)
  Feature: Toggle switch for smsEnabled; calls PATCH /api/admin/sms/settings
  Show: Warning that toggle disables ALL SMS if turned off

TODO-SMS-02: Build Twilio setup wizard component
  File: apps/admin/src/components/sms/TwilioSetupWizard.tsx
  Steps:
    1. Twilio account SID input + validation
    2. Auth token input (encrypted storage)
    3. Phone number entry (your Twilio number)
    4. Send test message to admin's phone
    5. Confirmation + save
  API: POST /api/admin/sms/setup + /verify (both exist)

TODO-SMS-03: Wire Twilio wizard into SMS settings page
  File: apps/admin/src/app/admin/integrations/sms/page.tsx
  Show wizard when: sms not connected; show status when connected

TODO-SMS-04: Build SMS template editor with character counter
  File: apps/admin/src/app/admin/integrations/sms/templates/page.tsx
  Features:
    - List all notification types with custom/default indicator
    - Click to edit: textarea with live char counter (160 = 1 segment, 320 = 2 segments)
    - Variable insertion picker ({{customerName}}, etc.)
    - Link shortening toggle
    - Preview with sample data
    - Save + Reset to default
  API: Template CRUD endpoints already exist

TODO-SMS-05: Build SMS queue list admin page
  File: apps/admin/src/app/admin/integrations/sms/queue/page.tsx
  Features: list sms_queue entries, filter by status, retry failed, view error
  API: Queue list/detail endpoints already exist

TODO-SMS-06: Build opt-out management admin page
  File: apps/admin/src/app/admin/integrations/sms/opt-outs/page.tsx
  Features:
    - List all opted-out numbers
    - Search by phone
    - Manual opt-out/opt-in override
    - Export list
  API: /api/admin/sms/opt-outs endpoints already exist

TODO-SMS-07: Wire per-notification channel selector to API
  File: apps/admin/src/app/admin/integrations/sms/notifications/page.tsx
  Current: Static hardcoded list with non-functional toggles
  Fix: On toggle change → PATCH /api/admin/sms/notification-channels
  Add: "Save Changes" button or auto-save on toggle

TODO-SMS-08: Add SMS as optional Step 6 in tenant onboarding wizard
  File: apps/admin/src/components/onboarding/ (add sms/ subdirectory)
  Components needed:
    - sms-setup-step.tsx (reuses TwilioSetupWizard)
    - sms-onboarding-banner.tsx
  Integration: Add step to email-setup-wizard sequence or main onboarding flow

TODO-SMS-09: Add SMS navigation links to admin sidebar
  Add links under Integrations to:
    - /admin/integrations/sms/templates
    - /admin/integrations/sms/queue
    - /admin/integrations/sms/opt-outs
```

---

### 📦 PHASE-2CM-TEMPLATE-LIBRARY

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ✅ DONE (with expansion)

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| `/admin/templates/page.tsx` library dashboard | ✅ DONE | Confirmed; uses `getTemplateLibrary()` from communications package |
| `/admin/templates/analytics/page.tsx` | ✅ DONE | Confirmed; shows send counts and open/click rates |
| `TemplateCategoryCard` component | ✅ DONE | `components/templates/template-category-card.tsx` |
| `TemplateRow` component | ✅ DONE | `components/templates/template-row.tsx` |
| Search/filter functionality | ✅ DONE | `components/templates/template-search.tsx`, `template-filter.tsx` |
| Template library `getTemplateLibrary()` backend | ✅ DONE | `packages/communications/src/templates/library.ts` |
| Click-through to per-function editors | ✅ DONE | Phase doc `[x]` |
| Custom vs Default status indicator | ✅ DONE | Phase doc `[x]` |
| Usage statistics (send counts) | ✅ DONE | Analytics page confirmed |
| Analytics charts for open/click rates | ✅ DONE | Phase doc `[x]`; `components/templates/template-analytics-chart.tsx` |
| No marketing campaign UI | ✅ DONE | Phase doc confirms; only notification templates |
| A/B Tests for templates | 🔄 CHANGED | `/admin/templates/ab-tests/` pages exist — this is **beyond** the original phase scope; adds A/B test creation, management, and results; uses `apps/admin/src/lib/ab-tests/` |

#### TODO List — TEMPLATE-LIBRARY Gaps

```
TODO-TL-01: Document A/B testing feature in its own phase doc
  The A/B tests at /admin/templates/ab-tests/ are not in any phase plan.
  Risk: No spec means incomplete implementation may not be noticed.
  Action: Create PHASE-2CM-TEMPLATE-AB-TESTS.md documenting what was built and any gaps.

TODO-TL-02: Verify A/B test result tracking is wired to Resend webhooks
  File: apps/admin/src/lib/ab-tests/db.ts
  Check: Is open/click tracking for A/B variants actually consuming Resend webhook data?
  Risk: A/B tests show UI but may not have real data flowing in.
```

---

### 📦 PHASE-2CM-TEMPLATES

**Phase Doc Status**: ✅ COMPLETE (2026-02-13)  
**Actual Status**: ✅ DONE (minor gap)

#### Feature Classification

| Feature | Status | Evidence |
|---------|--------|----------|
| `tenant_email_templates` table | ✅ DONE | Phase doc `[x]` |
| `tenant_email_template_versions` table | ✅ DONE | Phase doc `[x]` |
| Default template seeding migration | ✅ DONE | Phase doc `[x]` |
| `TemplateVariable` type and registry | ✅ DONE | `src/templates/variables.ts` |
| Default templates for all notification types | ✅ DONE | `src/templates/defaults.ts` |
| `getTemplateForTenant()` with default fallback | ✅ DONE | `src/templates/db.ts` |
| `saveTemplate()` with version creation | ✅ DONE | Phase doc `[x]` |
| `substituteVariables()` function | ✅ DONE | Phase doc `[x]`; unit tests pass |
| `htmlToPlainText()` auto-conversion | ✅ DONE | Phase doc `[x]` |
| `renderEmailTemplate()` main function | ✅ DONE | `src/templates/render.ts` |
| Template list/get/update API endpoints | ✅ DONE | Phase doc `[x]` |
| Preview endpoint | ✅ DONE | Phase doc `[x]` |
| Test send endpoint | ✅ DONE | Phase doc `[x]` |
| Reset to default endpoint | ✅ DONE | Phase doc `[x]` |
| Version history endpoint | ✅ DONE | Phase doc `[x]` |
| Variables list endpoint | ✅ DONE | Phase doc `[x]` |
| TipTap WYSIWYG editor component | ✅ DONE | `creators/communications/templates/[id]/template-editor.tsx` |
| Variable insertion buttons | ✅ DONE | Phase doc `[x]` |
| Preview panel (HTML/text toggle) | ✅ DONE | Phase doc `[x]` |
| Sender address selector in template | ✅ DONE | Phase doc `[x]` |
| Test send modal | ✅ DONE | Phase doc `[x]` |
| Version history sidebar | ✅ DONE | Phase doc `[x]` |
| Reset confirmation modal | ✅ DONE | Phase doc `[x]` |
| Review templates editor tab | ✅ DONE | Phase doc `[x]` |
| Creator templates editor page | ✅ DONE | `creators/communications/templates/[id]/page.tsx` |
| E-Sign templates editor tab | ✅ DONE | Phase doc `[x]` |
| Subscription templates editor page | ✅ DONE | Phase doc `[x]` |
| Treasury templates editor tab | ✅ DONE | Phase doc `[x]` |
| Team invitation template editor | ✅ DONE | Phase doc `[x]` |
| All email sending uses `renderEmailTemplate()` | ✅ DONE | Phase doc `[x]` |
| Zero hardcoded email content | ✅ DONE | Phase doc `[x]` |
| Unit tests for variable substitution | ✅ DONE | Phase doc `[x]` |
| E2E test for template edit → send flow | ❌ NOT DONE | Phase doc: `[ ] E2E test for template edit → send flow passes (deferred to integration testing)` |
| Global email settings template editor | ✅ DONE | `settings/email/templates/[id]/page.tsx` |

#### TODO List — TEMPLATES Gaps

```
TODO-TM-01: Write E2E test for template edit → send flow
  File: apps/admin/e2e/template-edit-send.spec.ts
  Tests: Edit template → change subject + body → preview → test send → confirm received
  Note: Deferred due to E2E infrastructure not being set up
```

---

## Consolidated Gap Summary

### Priority 1 — Critical Missing UI (Platform unusable without these)

| # | Gap | Phase | Effort |
|---|-----|-------|--------|
| 1 | SMS master toggle, Twilio wizard, template editor, queue page, opt-out page | 2CM-SMS | Large |
| 2 | Slack scheduled reports UI page | 2CM-SLACK | Medium |
| 3 | Inbound email list + receipt queue pages | 2CM-INBOUND | Medium |
| 4 | Queue UI pages for all non-creator queues (5 queues) | 2CM-EMAIL-QUEUE | Large |

### Priority 2 — Significant Missing Features

| # | Gap | Phase | Effort |
|---|-----|-------|--------|
| 5 | Slack scheduled reports cron job (trigger.dev) | 2CM-SLACK | Small |
| 6 | Super admin ops Slack UI + API routes | 2CM-SLACK | Medium |
| 7 | Slack template customization UI | 2CM-SLACK | Medium |
| 8 | Creator + subscription queue processors (stubs only) | 2CM-EMAIL-QUEUE | Medium |
| 9 | Alert job stub functions → actual Slack calls | 2CM-SLACK | Small |

### Priority 3 — Deferred Test Coverage

| # | Gap | Phase | Effort |
|---|-----|-------|--------|
| 10 | Integration tests: queue sequence, inbound→treasury flow | 2CM-EMAIL-QUEUE, 2CM-INBOUND | Medium |
| 11 | Unit tests: sender routing logic | 2CM-SENDER-DNS | Small |
| 12 | E2E tests: email setup, domain add, template edit | Multiple | Large |
| 13 | Manual treasury approval override UI | 2CM-INBOUND | Small |

### Divergences from Plan (🔄 CHANGED)

| Feature | What Changed |
|---------|-------------|
| A/B Tests for email templates | Added at `/admin/templates/ab-tests/`; not in any phase plan |
| Creator-specific queue at `/admin/creators/communications/queue` | Uses custom `lib/creator-communications/db` instead of generic queue system — diverges from the unified queue approach |
| SMS onboarding wizard separate from email wizard | Phase planned SMS as Step 6 of main wizard; actual setup is at `/admin/integrations/sms/` standalone |

---

## Files Missing vs Files Planned

### Still Needed — Backend/Package Files

```
packages/communications/src/processors/creator-processor.ts       (placeholder only)
packages/communications/src/processors/subscription-processor.ts  (placeholder only)
packages/communications/src/inbound/notify.ts                      (Slack notifications for inbound)
packages/jobs/src/handlers/scheduled/slack-reports.ts              (new trigger.dev job)
```

### Still Needed — Admin API Routes

```
apps/admin/src/app/api/admin/platform/slack/route.ts
apps/admin/src/app/api/admin/platform/slack/test/route.ts
apps/admin/src/app/api/admin/platform/slack/alerts/route.ts
apps/admin/src/app/api/admin/sms/notification-channels/route.ts   (if not existing)
apps/admin/src/app/api/admin/treasury/requests/[id]/manual-approve/route.ts
```

### Still Needed — Admin UI Pages

```
apps/admin/src/app/admin/communications/inbound/page.tsx
apps/admin/src/app/admin/treasury/receipts/page.tsx
apps/admin/src/app/admin/treasury/requests/[id]/page.tsx
apps/admin/src/app/admin/commerce/reviews/email-queue/page.tsx
apps/admin/src/app/admin/commerce/subscriptions/email-queue/page.tsx
apps/admin/src/app/admin/esign/email-queue/page.tsx
apps/admin/src/app/admin/treasury/email-queue/page.tsx
apps/admin/src/app/admin/settings/team/email-queue/page.tsx
apps/admin/src/app/admin/settings/notifications/slack/reports/page.tsx
apps/admin/src/app/admin/settings/notifications/slack/templates/page.tsx
apps/admin/src/app/admin/platform/slack/page.tsx
apps/admin/src/app/admin/integrations/sms/templates/page.tsx
apps/admin/src/app/admin/integrations/sms/queue/page.tsx
apps/admin/src/app/admin/integrations/sms/opt-outs/page.tsx
```

### Still Needed — UI Components

```
apps/admin/src/components/communications/QueueListPage.tsx
apps/admin/src/components/communications/QueueFilters.tsx
apps/admin/src/components/communications/QueueStatsHeader.tsx
apps/admin/src/components/communications/QueueEntryRow.tsx
apps/admin/src/components/communications/QueueEntryDetail.tsx
apps/admin/src/components/communications/BulkActionsBar.tsx
apps/admin/src/components/communications/InboundEmailDetail.tsx
apps/admin/src/components/treasury/ReceiptCategoryModal.tsx
apps/admin/src/components/treasury/ManualApprovalOverride.tsx
apps/admin/src/components/sms/TwilioSetupWizard.tsx
apps/admin/src/components/onboarding/sms/ (entire directory)
```

---

## Overall Assessment by Phase

| Phase | Backend | API Routes | UI | Tests | Overall |
|-------|---------|-----------|-----|-------|---------|
| PHASE-2CM-EMAIL-QUEUE | ✅ 90% | ✅ 100% | ⚠️ 20% | ❌ 30% | ⚠️ PARTIAL |
| PHASE-2CM-INBOUND-EMAIL | ✅ 100% | ✅ 100% | ❌ 15% | ❌ 10% | ⚠️ PARTIAL |
| PHASE-2CM-RESEND-ONBOARDING | ✅ 100% | ✅ 100% | ✅ 100% | ❌ 0% | ✅ DONE |
| PHASE-2CM-SENDER-DNS | ✅ 100% | ✅ 100% | ✅ 100% | ❌ 0% | ✅ DONE |
| PHASE-2CM-SLACK-INTEGRATION | ✅ 95% | ✅ 85% | ⚠️ 60% | ❌ 0% | ⚠️ PARTIAL |
| PHASE-2CM-SMS | ✅ 100% | ✅ 95% | ❌ 20% | ❌ 0% | ⚠️ PARTIAL |
| PHASE-2CM-TEMPLATE-LIBRARY | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 80% | ✅ DONE |
| PHASE-2CM-TEMPLATES | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 90% | ✅ DONE |

**Key finding**: Phase docs incorrectly mark all 8 phases as `STATUS: ✅ COMPLETE`. In reality, 4 of 8 phases have significant UI gaps. The pattern is backend-first development where UI was deferred but never returned to.
