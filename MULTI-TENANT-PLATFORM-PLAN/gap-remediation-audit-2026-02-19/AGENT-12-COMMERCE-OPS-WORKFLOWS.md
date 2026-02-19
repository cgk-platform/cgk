# Agent 12: Commerce Operations & Workflows — Gap Remediation Audit

**Audit Date**: 2026-02-19  
**Agent**: AGENT-12-COMMERCE-OPS-WORKFLOWS  
**Scope**: Commerce Analytics, Google Feed, Reviews, Subscriptions, Expenses, Treasury, Productivity, Workflows  
**Directories Audited**:
- `packages/commerce/src/`
- `packages/analytics/src/`
- `packages/payments/src/`
- `apps/admin/src/app/admin/` (relevant feature areas)
- `apps/admin/src/app/api/admin/` (relevant API routes)
- `apps/admin/src/lib/` (service/lib layer)
- `packages/jobs/src/` (background workers)
- `packages/admin-core/src/` (workflow engine, inbox)

---

## Executive Summary

Eight feature areas were audited across three phase groups (PHASE-2O Commerce, PHASE-2H Financial, PHASE-2H Productivity/Workflows). All phase planning documents are marked **STATUS: ✅ COMPLETE (2026-02-13)**, yet the DOD checklists within those docs are entirely **unchecked** (all `- [ ]` items). This creates a significant discrepancy: the planning layer says "done" while the task tracking says "not started."

**Critical Finding**: The phase STATUS headers appear to reflect document-writing completion (spec phase), not implementation completion. The actual code was then written separately. The real implementation status is considerably more nuanced.

### Summary Table

| Feature Area | Implementation Status | Priority |
|---|---|---|
| Commerce Analytics (Dashboard) | ⚠️ Partially implemented | P1 |
| Google Shopping Feed | ✅ Fully implemented | — |
| Review Management | ⚠️ Partially implemented | P1 |
| Subscription Handling | ⚠️ Partially implemented | P1 |
| Expense Tracking | ✅ Fully implemented | — |
| Treasury / Payouts | ✅ Fully implemented | — |
| Productivity Tools | ⚠️ Partially implemented | P2 |
| Workflow Automation | ✅ Fully implemented | — |

---

## Feature-by-Feature Classification

---

### 1. Commerce Analytics

**Phase Doc**: `PHASE-2O-COMMERCE-ANALYTICS.md` (Status: "COMPLETE")  
**DOD Checkbox Status**: All 15 boxes **unchecked**

#### What Exists

**Admin Pages** (`apps/admin/src/app/admin/analytics/`):
- ✅ `/admin/analytics/page.tsx` — Main analytics dashboard
- ✅ `/admin/analytics/bri/page.tsx` — BRI analytics
- ✅ `/admin/analytics/pipeline/page.tsx` — Pipeline page
- ✅ `/admin/analytics/pl-breakdown/page.tsx` — P&L breakdown
- ✅ `/admin/analytics/reports/page.tsx` — Custom reports
- ✅ `/admin/analytics/settings/page.tsx` — Settings

**Dashboard Tab Components** (all present):
- ✅ `tabs/unit-economics-tab.tsx`
- ✅ `tabs/spend-sensitivity-tab.tsx`
- ✅ `tabs/burn-rate-tab.tsx`
- ✅ `tabs/geography-tab.tsx`
- ✅ `tabs/platform-data-tab.tsx`
- ✅ `tabs/slack-notifications-tab.tsx`

**API Routes** (`apps/admin/src/app/api/admin/analytics/`):
- ✅ `overview/route.ts`
- ✅ `unit-economics/route.ts`
- ✅ `spend-sensitivity/route.ts`
- ✅ `burn-rate/route.ts`
- ✅ `geography/route.ts`
- ✅ `platform-data/route.ts`
- ✅ `pipeline/route.ts`
- ✅ `pl-breakdown/route.ts`
- ✅ `pl-line-details/route.ts`
- ✅ `reports/route.ts`, `reports/[id]/route.ts`, `reports/[id]/run/route.ts`, `reports/[id]/history/route.ts`
- ✅ `slack-alerts/route.ts`, `slack-alerts/[id]/route.ts`, `slack-alerts/test/route.ts`
- ✅ `targets/route.ts`, `targets/[id]/route.ts`
- ✅ `settings/route.ts`
- ✅ `bri/route.ts`

**Lib Layer** (`apps/admin/src/lib/analytics/`):
- ✅ `db.ts`, `service.ts`, `types.ts`, `index.ts`

**Attribution (cohort tracking)**:
- ✅ `/admin/attribution/cohorts/page.tsx` — Cohort analysis
- ✅ `/api/admin/attribution/cohorts/route.ts` — Cohort data API

#### What's Missing

- ❌ Commerce-specific **conversion funnel** analytics (distinct from attribution funnels) — no `/admin/analytics/conversions` page or dedicated API route for storefront conversion tracking
- ❌ **Subscription-integrated revenue metrics** in the analytics dashboard — no subscription MRR/ARR surfaced in overview API
- ❌ **Export functionality** — plans specify CSV/JSON export endpoint; no `analytics/export` route exists
- ❌ Analytics **data quality page** (attribution has one at `/admin/attribution/data-quality` but main analytics does not)

**Classification**: ⚠️ **Partially Implemented** — Core dashboard and API infrastructure is solid, missing export, conversion funnel tracking, and subscription-integrated revenue.

---

### 2. Google Shopping Feed

**Phase Doc**: `PHASE-2O-COMMERCE-GOOGLE-FEED.md`  
**DOD Checkbox Status**: Not checked in file (spec-style doc)

#### What Exists

**Package Layer** (`packages/commerce/src/google-feed/`):
- ✅ `types.ts` — Comprehensive Google Merchant Center type definitions (feed settings, products, sync history, images, full GoogleShoppingProduct schema)
- ✅ `generator.ts` — Full feed generation engine (XML, JSON, TSV output; product transformation; exclusion logic; custom label computation; shipping/tax support)

**Lib Layer** (`apps/admin/src/lib/google-feed/`):
- ✅ `db.ts` — Database operations
- ✅ `types.ts` — Admin-layer types

**Admin Pages** (`apps/admin/src/app/admin/google-feed/`):
- ✅ `page.tsx` — Feed status overview
- ✅ `products/page.tsx` — Product list with feed status
- ✅ `products/[handle]/page.tsx` — Per-product feed overrides
- ✅ `settings/page.tsx` — Feed configuration
- ✅ `preview/page.tsx` — Feed preview (XML/JSON/table)
- ✅ `images/page.tsx` — Image optimization management

**API Routes** (`apps/admin/src/app/api/admin/google-feed/`):
- ✅ `status/route.ts` — Feed health summary
- ✅ `settings/route.ts`, `settings/test-connection/route.ts`
- ✅ `products/route.ts`, `products/[handle]/route.ts`
- ✅ `products/[handle]/exclude/route.ts`, `products/[handle]/include/route.ts`
- ✅ `products/bulk-action/route.ts`
- ✅ `preview/route.ts`
- ✅ `sync/route.ts`
- ✅ `download/route.ts`
- ✅ `images/route.ts`, `images/optimize/route.ts`

**Background Jobs** (`packages/jobs/src/handlers/google-feed-sync.ts`):
- ✅ Sync job handler implemented

**Package Exports** (`packages/commerce/src/index.ts`):
- ✅ `export * from './google-feed'`

#### What's Missing

- ❌ **Sync history page** — No `/admin/google-feed/sync-history` page (API data exists from `lastSync` in status response but no dedicated history view)
- ❌ **Google Merchant Center performance data** integration — `performance` field in `GoogleFeedStatusResponse` is `| null`, no actual API integration pulling impressions/clicks/CTR from Merchant Center API

**Classification**: ✅ **Fully Implemented** (core feed generation, management, and admin UI complete; minor gaps in sync history UI and MC performance API integration are enhancements)

---

### 3. Review Management

**Phase Doc**: `PHASE-2O-COMMERCE-REVIEWS.md` (Status: "COMPLETE")  
**DOD Checkbox Status**: All 17 boxes **unchecked**

#### What Exists

**Lib Layer** (`apps/admin/src/lib/reviews/`):
- ✅ `types.ts` — Full review type definitions
- ✅ `db.ts` — Database queries for reviews
- ✅ `index.ts` — Module exports
- ✅ `providers/index.ts` — Provider abstraction (Internal + Yotpo)

**Admin Pages** (`apps/admin/src/app/admin/commerce/reviews/`):
- ✅ `page.tsx` — Main reviews list with status tabs, rating filter, approve/reject/respond actions
- ✅ `review-actions.tsx` — Server action components

**API Routes** (`apps/admin/src/app/api/admin/reviews/`):
- ✅ `route.ts` — List reviews (GET) + create (POST)
- ✅ `[id]/route.ts` — Get/update review
- ✅ `[id]/moderate/route.ts` — Approve/reject
- ✅ `[id]/respond/route.ts` — Post response
- ✅ `bulk/route.ts` — Bulk approve/reject/delete
- ✅ `emails/route.ts`, `emails/[id]/route.ts`, `emails/[id]/test/route.ts` — Review request email templates
- ✅ `email-queue/route.ts`, `email-queue/cancel/route.ts`, `email-queue/retry/route.ts`
- ✅ `email-logs/route.ts`
- ✅ `email-stats/route.ts`
- ✅ `bulk-send/campaigns/route.ts`, `bulk-send/campaigns/[id]/route.ts`, `bulk-send/campaigns/[id]/execute/route.ts`
- ✅ `bulk-send/preview/route.ts`
- ✅ `bulk-send-templates/route.ts`, `bulk-send-templates/[id]/route.ts`
- ✅ `incentive-codes/route.ts`
- ✅ `responses/route.ts`, `responses/[id]/route.ts`

**Background Jobs** (`packages/jobs/src/handlers/commerce/review-email.ts`):
- ✅ Review email job handler

#### What's Missing (Admin Pages — API exists but no UI)

- ❌ `/admin/commerce/reviews/pending` — Dedicated moderation queue page (FIFO card layout)
- ❌ `/admin/commerce/reviews/email-queue` — Email queue management page
- ❌ `/admin/commerce/reviews/email-logs` — Email delivery log page
- ❌ `/admin/commerce/reviews/email-stats` — Email performance stats page
- ❌ `/admin/commerce/reviews/emails` — Email template management page
- ❌ `/admin/commerce/reviews/bulk-send` — Bulk send campaign creation page
- ❌ `/admin/commerce/reviews/bulk-send-templates` — Bulk send template library page
- ❌ `/admin/commerce/reviews/analytics` — Review analytics dashboard page
- ❌ `/admin/commerce/reviews/incentive-codes` — Incentive code management page
- ❌ `/admin/commerce/reviews/questions` — Q&A moderation page (no API either)
- ❌ `/admin/commerce/reviews/settings` — Review system settings page (provider toggle, etc.)
- ❌ `/admin/commerce/reviews/migration` — Provider migration tools page

**Missing API Routes**:
- ❌ `reviews/questions/route.ts` — Q&A system (no API)
- ❌ `reviews/settings/route.ts` — Review settings (no API)
- ❌ `reviews/analytics/route.ts` — Review analytics data (no API)
- ❌ `reviews/migration/route.ts` — Provider migration (no API)

**Classification**: ⚠️ **Partially Implemented** — All backend API routes for email, bulk-send, incentive codes, and responses exist. The main list page exists. However, **12 of the 13 required admin UI pages are missing** (only the main list page is built). Additionally, the Q&A, settings, analytics, and migration APIs do not exist.

---

### 4. Subscription Handling

**Phase Doc**: `PHASE-2O-COMMERCE-SUBSCRIPTIONS.md` (Status: "COMPLETE")  
**DOD Checkbox Status**: All 16 boxes **unchecked**

#### What Exists

**Lib Layer** (`apps/admin/src/lib/subscriptions/`):
- ✅ `types.ts` — Full subscription type definitions including MRR, cohort, churn, save flows
- ✅ `service.ts` — Core CRUD: list, get, create, update, cancel, pause, resume, skip, MRR calculations
- ✅ `analytics.ts` — Analytics: `getOverviewMetrics`, `getCohortData`, `getChurnAnalysis`, `getGrowthMetrics`, `getProductSubscriptionData`
- ✅ `emails.ts` — Email template system
- ✅ `save-flows.ts` — Retention flow logic (save flows for churn prevention)
- ✅ `selling-plans.ts` — Shopify selling plan integration
- ✅ `validation.ts` — Data integrity validation
- ✅ `index.ts` — Module exports

**Admin Pages** (`apps/admin/src/app/admin/commerce/subscriptions/`):
- ✅ `page.tsx` — Main subscription list with MRR stats, status filters, search
- ✅ `[id]/page.tsx` — Subscription detail with orders history, activity log, actions

**API Routes** (`apps/admin/src/app/api/admin/subscriptions/`):
- ✅ `[id]/route.ts` — Get subscription detail
- ✅ `[id]/cancel/route.ts` — Cancel subscription
- ✅ `[id]/pause/route.ts` — Pause subscription
- ✅ `[id]/resume/route.ts` — Resume subscription
- ✅ `[id]/skip/route.ts` — Skip next order

**Background Jobs** (`packages/jobs/src/handlers/scheduled/subscriptions.ts`):
- ✅ Scheduled subscription processing job

#### What's Missing

**Missing Root API Route**:
- ❌ `subscriptions/route.ts` — List subscriptions endpoint (GET with filters); the admin page calls lib directly via RSC but no REST API exists for the list

**Missing API Routes** (lib logic exists but no HTTP endpoints):
- ❌ `subscriptions/analytics/route.ts` — Expose `SubscriptionAnalytics` data (MRR, churn, cohorts, growth)
- ❌ `subscriptions/emails/route.ts` — Email template CRUD
- ❌ `subscriptions/emails/[id]/route.ts` — Email template detail
- ❌ `subscriptions/emails/[id]/test/route.ts` — Send test email
- ❌ `subscriptions/save-flows/route.ts` — Retention flow configuration CRUD
- ❌ `subscriptions/selling-plans/route.ts` — Selling plan management
- ❌ `subscriptions/settings/route.ts` — Subscription settings (provider config, dunning settings)
- ❌ `subscriptions/validation/route.ts` — Data integrity validation endpoint
- ❌ `subscriptions/migration/route.ts` — Provider migration tools
- ❌ `subscriptions/cutover/route.ts` — Cutover wizard

**Missing Admin Pages** (8 of 10 specified pages):
- ❌ `/admin/commerce/subscriptions/analytics` — Analytics dashboard (MRR trend, cohorts, churn)
- ❌ `/admin/commerce/subscriptions/emails` — Email template management
- ❌ `/admin/commerce/subscriptions/save-flows` — Retention flow builder
- ❌ `/admin/commerce/subscriptions/selling-plans` — Selling plan management
- ❌ `/admin/commerce/subscriptions/settings` — Provider config, dunning settings
- ❌ `/admin/commerce/subscriptions/validation` — Data validation and auto-fix tools
- ❌ `/admin/commerce/subscriptions/migration` — Provider migration wizard
- ❌ `/admin/commerce/subscriptions/cutover` — Cutover checklist wizard

**Classification**: ⚠️ **Partially Implemented** — Core list + detail views and subscription actions (cancel/pause/resume/skip) are implemented. Rich lib layer is complete including analytics, save flows, selling plans, validation. However, **8 of 10 admin pages are missing** and **10 of 11 API routes are missing** — the library is built but the surface area (UI + HTTP API) is largely absent.

---

### 5. Expense Tracking

**Phase Doc**: `PHASE-2H-FINANCIAL-EXPENSES.md` (Status: "COMPLETE")  
**DOD Checkbox Status**: All items **unchecked** (but code exists)

#### What Exists

**Lib Layer** (`apps/admin/src/lib/expenses/`):
- ✅ `db/categories.ts` — Expense category CRUD (type: COGS/variable/marketing/operating)
- ✅ `db/budgets.ts` — Monthly budget management
- ✅ `db/expenses.ts` — Manual expense CRUD with receipt support
- ✅ `db/unified.ts` — Aggregated view across all expense sources (ad spend, payouts, operating)
- ✅ `db/index.ts` — DB module exports
- ✅ `db.ts` — Convenience re-export
- ✅ `types.ts` — Full type definitions
- ✅ `pnl-calculator.ts` — P&L statement generation with period comparison

**Admin Pages** (`apps/admin/src/app/admin/expenses/`):
- ✅ `page.tsx` — Main expense list (unified view)
- ✅ `categories/page.tsx` — Category management with type classification
- ✅ `budgets/page.tsx` — Budget vs actual tracking
- ✅ `pl-statement/page.tsx` — P&L statement with PDF export
- ✅ `manual/page.tsx` — Manual expense entry with receipt upload

**API Routes** (`apps/admin/src/app/api/admin/expenses/`):
- ✅ `route.ts` — Expense CRUD
- ✅ `categories/route.ts` — Category management
- ✅ `budgets/route.ts` — Budget management
- ✅ `unified/route.ts` — Aggregated expense view
- ✅ `pl-statement/route.ts` — P&L generation
- ✅ `pl-statement/pdf/route.ts` — PDF export
- ✅ `by-category/route.ts` — Expense breakdown by category
- ✅ `pl-line-details/route.ts` — P&L line item details

#### What's Missing

- ❌ **Receipt upload API** — No dedicated `expenses/receipts/upload/route.ts`; receipt handling may be embedded in the expense CRUD route but a dedicated upload endpoint for pre-upload before expense creation is not confirmed
- ❌ **Year-over-year comparison API** — P&L calculator supports period comparison but no dedicated API endpoint for YoY comparison
- ❌ **Expense import** — No CSV/bulk import endpoint for migrating historical expense data

**Classification**: ✅ **Fully Implemented** — All core deliverables (categories, budgets, P&L, unified view, PDF export, manual entry) are implemented. Minor enhancements missing.

---

### 6. Treasury / Payouts

**Phase Doc**: `PHASE-2H-FINANCIAL-TREASURY.md` (Status: "COMPLETE")  
**DOD Checkbox Status**: All items **checked** `[x]`

#### What Exists

**Lib Layer** (`apps/admin/src/lib/treasury/`):
- ✅ `db/requests.ts` — Draw request CRUD
- ✅ `db/communications.ts` — Communication log per request
- ✅ `db/receipts.ts` — Receipt/invoice management
- ✅ `db/topups.ts` — Stripe top-up tracking
- ✅ `db/settings.ts` — Treasury configuration
- ✅ `pdf-generator.ts` — Draw request PDF
- ✅ `email.ts` — Email approval workflow
- ✅ `approval-parser.ts` — Parses email replies for approval
- ✅ `auto-send.ts` — Automated send configuration
- ✅ `slack.ts` — Slack notifications
- ✅ `types.ts` — Full type definitions

**Admin Pages** (`apps/admin/src/app/admin/treasury/`):
- ✅ `page.tsx` — Treasury dashboard
- ✅ `settings/page.tsx` — Auto-send configuration
- ✅ `/admin/stripe-topups/page.tsx` — Stripe top-up management

**API Routes**:
- ✅ `treasury/route.ts` — Dashboard data
- ✅ `treasury/requests/route.ts` — Draw request CRUD
- ✅ `treasury/requests/[id]/route.ts` — Request detail + approval actions
- ✅ `treasury/settings/route.ts` — Settings
- ✅ `treasury/receipts/route.ts` — Receipt management
- ✅ `stripe/topups/route.ts` — Stripe top-up management
- ✅ `stripe/balance/route.ts` — Balance tracking
- ✅ `stripe/funding-sources/route.ts` — Funding sources
- ✅ `stripe/pending-withdrawals/route.ts` — Pending withdrawals
- ✅ `webhooks/resend/treasury/route.ts` — Inbound email webhook

**Communications Treasury** (linked to creators communications):
- ✅ `communications/treasury/communications/route.ts`
- ✅ `communications/treasury/receipts/route.ts`, `receipts/[id]/route.ts`
- ✅ `communications/treasury/receipts/[id]/link-expense/route.ts`

**Background Jobs**:
- ✅ `packages/jobs/src/handlers/treasury.ts`

#### What's Missing

- ❌ **Bank account reconciliation** — The plan mentions reconciliation as a future feature; no reconciliation API or page exists
- ❌ **Payout scheduling** (per phase doc treasury focus is on internal draw requests, not creator payout scheduling — that's in the payouts lib)

**Classification**: ✅ **Fully Implemented** — All planned treasury features are implemented and the phase doc DOD checklist confirms all items checked.

---

### 7. Productivity Tools

**Phase Doc**: `PHASE-2H-PRODUCTIVITY.md` (Status: "COMPLETE")  
**DOD Checkbox Status**: All 64 items **unchecked** (0 checked)

#### What Exists

**Lib Layer** (`apps/admin/src/lib/productivity/`):
- ✅ `types.ts` — Task, Project, SavedItem, TaskComment, ProjectStage, KanbanBoard types
- ✅ `tasks-db.ts` — Full task CRUD: `getTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`, `assignTask`, `completeTask`, `changeTaskStatus`, `getTasksByAssignee`, `getOverdueTasks`, `getTaskStats`, `addTaskComment`, `getTaskComments`
- ✅ `projects-db.ts` — Full project CRUD: `getProjects`, `getProject`, `createProject`, `updateProject`, `archiveProject`, `deleteProject`, `moveProjectToStage`, `getProjectsByStage`, `getProjectsForKanban`, `reorderProjectsInStage`, `getProjectTasks`, `addTaskToProject`, `removeTaskFromProject`, `getProjectStats`
- ✅ `saved-items-db.ts` — Full saved items: `saveItem`, `getSavedItems`, `getSavedItem`, `removeSavedItem`, `moveSavedItem`, `updateSavedItemTags`, `isItemSaved`, `getSavedItemStats`, `getSavedItemFolders`, `bulkDeleteSavedItems`, `bulkMoveSavedItems`
- ✅ `index.ts` — Module exports

**API Routes** (`apps/admin/src/app/api/admin/productivity/`):
- ✅ `tasks/route.ts` — Task list + create
- ✅ `tasks/[id]/route.ts` — Task detail + update + delete
- ✅ `tasks/[id]/assign/route.ts` — Assignment
- ✅ `tasks/[id]/complete/route.ts` — Mark complete
- ✅ `tasks/[id]/comments/route.ts` — Comments
- ✅ `tasks/stats/route.ts` — Task statistics

#### What's Missing

**No Admin Pages Exist** — zero productivity pages in `apps/admin/src/app/admin/productivity/`:
- ❌ `/admin/productivity/page.tsx` — Productivity dashboard (KPIs, task summary, overdue list)
- ❌ `/admin/productivity/tasks/page.tsx` — Task list with filters (status, priority, assignee)
- ❌ `/admin/productivity/projects/page.tsx` — Project list
- ❌ `/admin/productivity/projects/[id]/page.tsx` — Project detail with Kanban board
- ❌ `/admin/productivity/saved/page.tsx` — Saved items bookmarks
- ❌ `/admin/productivity/reports/page.tsx` — Productivity KPI reports

**Missing API Routes**:
- ❌ `productivity/projects/route.ts` — Project list + create
- ❌ `productivity/projects/[id]/route.ts` — Project detail
- ❌ `productivity/projects/[id]/tasks/route.ts` — Project tasks
- ❌ `productivity/projects/[id]/kanban/route.ts` — Kanban board state
- ❌ `productivity/saved/route.ts` — Saved items
- ❌ `productivity/saved/[id]/route.ts` — Saved item detail
- ❌ `productivity/reports/route.ts` — Productivity analytics

**Classification**: ⚠️ **Partially Implemented** — Library layer is complete with full task, project, and saved-items logic. Task API routes exist. However, **all 6 admin UI pages are missing** and **all project + saved items API routes are missing**.

---

### 8. Workflow Automation

**Phase Doc**: `PHASE-2H-WORKFLOWS.md` (Status: "COMPLETE")  
**DOD Checkbox Status**: **All items checked** `[x]`

#### What Exists

**Package Layer** (`packages/admin-core/src/workflow/`):
- ✅ `engine.ts` — WorkflowEngine singleton per tenant
- ✅ `evaluator.ts` — Condition evaluator (13+ operators)
- ✅ `actions.ts` — Action executor (send_message, slack_notify, suggest_action, schedule_followup, update_status, update_field, create_task)
- ✅ `rules.ts` — Rule management
- ✅ `built-in-rules.ts` — Pre-configured default rules
- ✅ `types.ts` — TriggerType, ActionType, Condition types
- ✅ `index.ts` — Package exports

**Package Layer** (`packages/admin-core/src/inbox/`):
- ✅ `threads.ts` — Thread management (assign, snooze, close)
- ✅ `messages.ts` — Message send/receive
- ✅ `contacts.ts` — Contact management
- ✅ `types.ts` — Conversation, Message, Contact types
- ✅ `index.ts` — Package exports (incl. `unsnoozeThreads`)

**Admin Pages** (`apps/admin/src/app/admin/workflows/`):
- ✅ `page.tsx` — Workflow rules list
- ✅ `new/page.tsx` — Create workflow rule
- ✅ `[id]/page.tsx` — Rule detail + edit
- ✅ `approvals/page.tsx` — Approval queue
- ✅ `logs/page.tsx` — Execution audit log
- ✅ `scheduled/page.tsx` — Scheduled actions management

**Admin Pages** (`apps/admin/src/app/admin/inbox/`):
- ✅ `page.tsx` — Smart inbox unified view
- ✅ `thread/[id]/page.tsx` — Thread detail
- ✅ `contacts/page.tsx` — Contact management

**API Routes** (`apps/admin/src/app/api/admin/workflows/`):
- ✅ `rules/route.ts` — Rule CRUD
- ✅ `rules/[id]/route.ts` — Rule detail
- ✅ `rules/[id]/test/route.ts` — Test rule execution
- ✅ `rules/[id]/executions/route.ts` — Execution history per rule
- ✅ `executions/route.ts` — All executions
- ✅ `executions/[id]/route.ts` — Execution detail
- ✅ `approvals/route.ts` — Approval queue
- ✅ `approvals/[id]/approve/route.ts` — Approve action
- ✅ `approvals/[id]/reject/route.ts` — Reject action
- ✅ `scheduled/route.ts` — Scheduled actions list
- ✅ `scheduled/[id]/cancel/route.ts` — Cancel scheduled action

**API Routes** (`apps/admin/src/app/api/admin/inbox/`):
- ✅ `threads/route.ts` — Thread list
- ✅ `threads/[id]/route.ts` — Thread detail
- ✅ `threads/[id]/messages/route.ts` — Messages
- ✅ `threads/[id]/assign/route.ts` — Assignment
- ✅ `threads/[id]/close/route.ts` — Close thread
- ✅ `threads/[id]/snooze/route.ts` — Snooze thread
- ✅ `contacts/route.ts` — Contact list
- ✅ `contacts/[id]/route.ts` — Contact detail
- ✅ `copilot/draft/route.ts` — AI draft generation
- ✅ `copilot/[draftId]/route.ts` — Draft management
- ✅ `copilot/[draftId]/send/route.ts` — Send draft

**Background Jobs** (`packages/jobs/src/handlers/workflow.ts`):
- ✅ `processScheduledActionsJob` — Every 5 minutes
- ✅ Time-elapsed trigger job — Hourly
- ✅ Execution log cleanup job — Daily
- ✅ Unsnooze threads job

**Tests** (`packages/admin-core/src/__tests__/workflow-integration.test.ts`):
- ✅ Integration tests for workflow execution

#### What's Missing

- ❌ No dedicated workflow **template library** page (`/admin/workflows/templates`) — built-in rules exist in code but no UI to browse/install them
- ❌ **Workflow analytics** — No aggregate metrics on automation effectiveness (rules triggered, actions taken, time saved)

**Classification**: ✅ **Fully Implemented** — All specified pages, API routes, background jobs, and the core engine are implemented. Phase doc DOD is fully checked.

---

## Package Audit Notes

### `packages/commerce/src/`
- ✅ Core commerce provider abstraction (Shopify) — fully implemented
- ✅ Google Feed generator — fully implemented and exported
- ❌ No subscription provider abstraction (Loop vs Custom) — subscriptions live in `apps/admin/src/lib/subscriptions/`
- ❌ No review provider package-level abstraction — reviews live in `apps/admin/src/lib/reviews/providers/`

### `packages/analytics/src/`
- ✅ GA4 integration — `initGA4`, `trackEvent`, `trackPageView`
- ✅ Attribution tracking — `trackAttribution`, `parseAttributionParams`
- ✅ Server-side tracking — `trackServerEvent`
- ✅ E-commerce events — `trackViewItem`, `trackAddToCart`, `trackBeginCheckout`, `trackPurchase`
- ❌ No server-side revenue dashboard query layer (that's in `apps/admin/src/lib/analytics/`)
- ❌ No subscription event tracking helpers (MRR changes, churn events)

### `packages/payments/src/`
- ✅ Stripe integration present (referenced by treasury topup routes)
- ❌ No subscription billing abstraction (Stripe Billing / Recharge / Loop)
- ❌ No dunning management helpers

---

## Prioritized TODO List

### Priority 1 — HIGH IMPACT (Core Commerce Operations)

#### P1-A: Reviews Admin Pages (12 missing pages)
> API layer is complete; just need UI pages

```
TODO: Create /admin/commerce/reviews/pending/page.tsx
  - Card-based FIFO moderation queue
  - One-click approve/reject per card
  - Keyboard shortcuts for rapid moderation
  - Auto-advance to next review

TODO: Create /admin/commerce/reviews/email-queue/page.tsx
  - List queued review request emails
  - Status: pending/sending/sent/failed/bounced
  - Retry and cancel actions
  - Link to order that triggered queue entry

TODO: Create /admin/commerce/reviews/email-logs/page.tsx
  - Delivery history with open/click tracking
  - Filter by status, date, product
  - Export delivery data

TODO: Create /admin/commerce/reviews/email-stats/page.tsx
  - Request rate, open rate, click rate, conversion rate
  - Time-series chart of email performance
  - Best performing products by review conversion

TODO: Create /admin/commerce/reviews/emails/page.tsx
  - Email template CRUD (list, create, edit)
  - Timing configuration per template (days after delivery)
  - Test send functionality

TODO: Create /admin/commerce/reviews/bulk-send/page.tsx
  - Campaign creation wizard
  - Target selection (product, order date range, review status)
  - Schedule or send immediately
  - Preview before send

TODO: Create /admin/commerce/reviews/bulk-send-templates/page.tsx
  - Template library for bulk campaigns
  - Preview rendered templates

TODO: Create /admin/commerce/reviews/analytics/page.tsx
  - Average rating trend over time
  - Review velocity (new reviews per day/week)
  - Rating distribution histogram
  - Response rate and time-to-respond
  - Top reviewed products

TODO: Create /admin/commerce/reviews/incentive-codes/page.tsx
  - Promo code CRUD linked to review requests
  - Code type (fixed/percentage), expiry, redemption tracking

TODO: Create /admin/commerce/reviews/questions/page.tsx (Q&A)
  - Question list with moderation status
  - Answer submission and approval
  - Separate from review moderation queue

TODO: Create /admin/commerce/reviews/settings/page.tsx
  - Provider toggle (Internal / Yotpo)
  - Yotpo API credentials
  - Auto-publish threshold (minimum rating to auto-approve)
  - Widget configuration
  - Tenant branding for email templates

TODO: Create /admin/commerce/reviews/migration/page.tsx
  - Provider migration wizard
  - Backup current reviews before migration
  - Progress indicator during import
  - Conflict resolution for duplicate reviews
```

**Missing API Routes for Reviews**:
```
TODO: Create /api/admin/reviews/questions/route.ts
  - GET questions list (with moderation status filter)
  - POST create question (if admin-initiated)
  - PATCH moderate question (approve/reject)

TODO: Create /api/admin/reviews/settings/route.ts
  - GET current review settings
  - PATCH update provider, thresholds, widget config

TODO: Create /api/admin/reviews/analytics/route.ts
  - GET review analytics (rating trend, velocity, distribution, response rate)
  - Support date range filter

TODO: Create /api/admin/reviews/migration/route.ts
  - POST initiate migration job
  - GET migration status
```

---

#### P1-B: Subscriptions Admin Pages + API Routes (8 pages, 10 routes)

```
TODO: Create /api/admin/subscriptions/route.ts
  - GET list subscriptions (with filters: status, frequency, search, page)
  - Exposes listSubscriptions() from service.ts via HTTP

TODO: Create /api/admin/subscriptions/analytics/route.ts
  - GET subscription analytics: MRR, ARR, ARPU, churn rate, cohorts, growth
  - Wire up getOverviewMetrics(), getCohortData(), getChurnAnalysis(), getGrowthMetrics()
  - Support date range filter

TODO: Create /api/admin/subscriptions/emails/route.ts
  - GET email template list
  - POST create email template

TODO: Create /api/admin/subscriptions/emails/[id]/route.ts
  - GET/PATCH/DELETE email template

TODO: Create /api/admin/subscriptions/emails/[id]/test/route.ts
  - POST send test email with sample data

TODO: Create /api/admin/subscriptions/save-flows/route.ts
  - GET retention flows list
  - POST create save flow

TODO: Create /api/admin/subscriptions/selling-plans/route.ts
  - GET selling plans from Shopify + local overrides
  - POST sync selling plans

TODO: Create /api/admin/subscriptions/settings/route.ts
  - GET subscription settings (provider, dunning config, billing anchor)
  - PATCH update settings

TODO: Create /api/admin/subscriptions/validation/route.ts
  - GET validation report (data integrity issues)
  - POST auto-fix specific issue types

TODO: Create /api/admin/subscriptions/migration/route.ts
  - POST initiate migration job (Loop → Custom or vice versa)
  - GET migration status

TODO: Create /api/admin/subscriptions/cutover/route.ts
  - GET cutover checklist status
  - POST advance cutover step

TODO: Create /admin/commerce/subscriptions/analytics/page.tsx
  - MRR trend chart (line graph)
  - Active/Paused/Cancelled counts
  - Churn rate meter
  - Cohort retention heatmap
  - Product-level subscription breakdown

TODO: Create /admin/commerce/subscriptions/emails/page.tsx
  - Email template list (welcome, payment failed, upcoming order, paused, cancelled)
  - Edit template content + timing
  - Test send button

TODO: Create /admin/commerce/subscriptions/save-flows/page.tsx
  - Save flow builder (cancellation intercept wizard)
  - Reason capture (price/frequency/product/other)
  - Offer configuration per reason (discount, pause, swap product)
  - Analytics: saved vs lost subscribers per flow

TODO: Create /admin/commerce/subscriptions/selling-plans/page.tsx
  - Selling plan list from Shopify
  - Local override editor (discount, name, frequency)
  - Sync status

TODO: Create /admin/commerce/subscriptions/settings/page.tsx
  - Provider selection (Loop / Custom / Shopify Native)
  - Dunning settings (retry schedule, max retries, retry intervals)
  - Failed payment actions (skip, cancel, pause)
  - Customer portal access toggle

TODO: Create /admin/commerce/subscriptions/validation/page.tsx
  - Integrity report: missing provider IDs, stale sync dates, billing date anomalies
  - Auto-fix button per issue type
  - Export issues as CSV

TODO: Create /admin/commerce/subscriptions/migration/page.tsx
  - Provider migration wizard (step-by-step)
  - Pre-migration validation report
  - Dry run before real migration
  - Rollback plan documentation

TODO: Create /admin/commerce/subscriptions/cutover/page.tsx
  - Cutover checklist (pre-flight checks)
  - Step-by-step wizard with confirmation gates
  - Post-cutover health check
```

---

### Priority 2 — MEDIUM IMPACT

#### P2-A: Productivity Admin Pages + Project API Routes

```
TODO: Create /admin/productivity/page.tsx
  - Dashboard: tasks due today, overdue count, completed this week
  - Quick task creation
  - My tasks widget
  - Team workload summary

TODO: Create /admin/productivity/tasks/page.tsx
  - Task list with filters: status, priority, assignee, due date, tags
  - Kanban toggle (list ↔ board view)
  - Bulk actions: assign, complete, delete
  - Quick add task inline

TODO: Create /admin/productivity/projects/page.tsx
  - Project list with stage indicator
  - Create project button
  - Filter by stage (discovery/active/complete/archived)
  - Project stats (task count, due date)

TODO: Create /admin/productivity/projects/[id]/page.tsx
  - Project detail with Kanban board
  - Task list per stage
  - Drag-to-reorder tasks within stage
  - Move tasks between stages
  - Project stats sidebar

TODO: Create /admin/productivity/saved/page.tsx
  - Saved items grid with folders
  - Folder management (create, rename, delete)
  - Tag filtering
  - Bulk move/delete

TODO: Create /admin/productivity/reports/page.tsx
  - Task completion rate over time
  - Overdue task trend
  - Team member productivity comparison
  - Average time to complete by priority

TODO: Create /api/admin/productivity/projects/route.ts
  - GET project list (with stage filter)
  - POST create project

TODO: Create /api/admin/productivity/projects/[id]/route.ts
  - GET project detail
  - PATCH update project
  - DELETE archive project

TODO: Create /api/admin/productivity/projects/[id]/tasks/route.ts
  - GET tasks for project
  - POST add task to project

TODO: Create /api/admin/productivity/projects/[id]/kanban/route.ts
  - GET kanban board state (stages + tasks)
  - PATCH move task between stages / reorder

TODO: Create /api/admin/productivity/saved/route.ts
  - GET saved items (with folder and tag filters)
  - POST save new item

TODO: Create /api/admin/productivity/saved/[id]/route.ts
  - GET saved item
  - PATCH move/update tags
  - DELETE unsave item

TODO: Create /api/admin/productivity/reports/route.ts
  - GET productivity analytics (completion rate, overdue trend, team stats)
```

---

#### P2-B: Commerce Analytics Gaps

```
TODO: Create /admin/analytics/conversions/page.tsx
  - Storefront funnel: impressions → PDPs → add-to-cart → checkout → purchase
  - Conversion rate by product, collection, traffic source
  - Drop-off analysis per funnel step

TODO: Create /api/admin/analytics/conversions/route.ts
  - GET conversion funnel data
  - Support date range and filter by product/collection

TODO: Add export functionality to analytics
  - Add /api/admin/analytics/export/route.ts
  - Support CSV/JSON export for any date range
  - Queue large exports as background jobs

TODO: Integrate subscription MRR into analytics overview
  - Modify /api/admin/analytics/overview/route.ts to include MRR from subscriptions
  - Add subscription_mrr, subscription_arr, subscription_active_count fields
```

---

### Priority 3 — LOW IMPACT (Enhancements)

#### P3-A: Google Feed Enhancements

```
TODO: Create /admin/google-feed/sync-history/page.tsx
  - List historical sync runs with timestamps and outcomes
  - Error detail expansion per sync
  - Performance trend (sync duration, product count over time)

TODO: Integrate Google Merchant Center API for performance data
  - Implement real impressions/clicks/CTR pull in google-feed/status route
  - Replace null performance field with actual MC API data
  - Requires OAuth2 token management for MC API
```

#### P3-B: Package Layer Gaps

```
TODO: Add subscription event tracking to packages/analytics/src/
  - trackSubscriptionStarted()
  - trackSubscriptionCancelled()
  - trackSubscriptionChurned()
  - trackMRRChange()

TODO: Add dunning helpers to packages/payments/src/
  - retryFailedPayment()
  - getDunningStatus()
  - updateDunningSchedule()

TODO: Consider extracting subscription provider abstraction to packages/commerce/src/
  - SubscriptionProvider interface (similar to CommerceProvider)
  - ShopifySubscriptionProvider, LoopSubscriptionProvider
  - Allows future multi-provider support without admin-layer lock-in
```

---

## File References

### Implemented — Key Files

| File | Feature | Status |
|---|---|---|
| `packages/commerce/src/google-feed/generator.ts` | Google Feed | ✅ |
| `packages/commerce/src/google-feed/types.ts` | Google Feed | ✅ |
| `packages/admin-core/src/workflow/engine.ts` | Workflows | ✅ |
| `packages/admin-core/src/inbox/threads.ts` | Workflows/Inbox | ✅ |
| `apps/admin/src/lib/subscriptions/analytics.ts` | Subscriptions | ✅ (lib only) |
| `apps/admin/src/lib/subscriptions/save-flows.ts` | Subscriptions | ✅ (lib only) |
| `apps/admin/src/lib/subscriptions/selling-plans.ts` | Subscriptions | ✅ (lib only) |
| `apps/admin/src/lib/reviews/providers/index.ts` | Reviews | ✅ (lib only) |
| `apps/admin/src/lib/productivity/projects-db.ts` | Productivity | ✅ (lib only) |
| `apps/admin/src/lib/productivity/saved-items-db.ts` | Productivity | ✅ (lib only) |
| `apps/admin/src/lib/expenses/pnl-calculator.ts` | Expenses | ✅ |
| `apps/admin/src/lib/treasury/approval-parser.ts` | Treasury | ✅ |

### Missing — Key Gaps

| Missing File | Feature | Priority |
|---|---|---|
| `apps/admin/src/app/admin/commerce/reviews/pending/page.tsx` | Reviews | P1 |
| `apps/admin/src/app/admin/commerce/reviews/analytics/page.tsx` | Reviews | P1 |
| `apps/admin/src/app/admin/commerce/reviews/settings/page.tsx` | Reviews | P1 |
| `apps/admin/src/app/api/admin/subscriptions/route.ts` | Subscriptions | P1 |
| `apps/admin/src/app/api/admin/subscriptions/analytics/route.ts` | Subscriptions | P1 |
| `apps/admin/src/app/admin/commerce/subscriptions/analytics/page.tsx` | Subscriptions | P1 |
| `apps/admin/src/app/admin/commerce/subscriptions/save-flows/page.tsx` | Subscriptions | P1 |
| `apps/admin/src/app/admin/productivity/page.tsx` | Productivity | P2 |
| `apps/admin/src/app/api/admin/productivity/projects/route.ts` | Productivity | P2 |
| `apps/admin/src/app/api/admin/analytics/conversions/route.ts` | Analytics | P2 |

---

## DOD Discrepancy Note

All phase planning docs (`PHASE-2O-*`, `PHASE-2H-*`) have their STATUS header marked as `✅ COMPLETE (2026-02-13)`, but the internal `- [ ]` checklists remain entirely unchecked. This appears to indicate:

1. The phase **specification documents** were marked complete when the spec was written/finalized (2026-02-10/13)
2. The implementation tasks were tracked separately and some were completed
3. The DOD checkboxes were never updated post-implementation to reflect actual completion

**Recommendation**: Update the phase docs to use `- [x]` for items that are actually implemented, and `- [ ]` only for remaining gaps. This will make the project status trackable via these files.

Items confirmed implemented (code exists) but DOD shows `- [ ]`:
- ✅ (confirmed via code) Treasury: all 30 DOD items
- ✅ (confirmed via code) Workflows: all DOD items
- ⚠️ (partially confirmed) Subscriptions: core list + detail + lib layer
- ⚠️ (partially confirmed) Reviews: core list + all API routes + lib layer
- ✅ (confirmed via code) Expenses: all required files
- ⚠️ (partially confirmed) Productivity: lib layer + task API routes only
- ✅ (confirmed via code) Analytics: all 6 pages + all tab components + API routes
- ✅ (confirmed via code) Google Feed: complete package + all admin pages + all API routes

---

*Report generated by AGENT-12-COMMERCE-OPS-WORKFLOWS on 2026-02-19*
