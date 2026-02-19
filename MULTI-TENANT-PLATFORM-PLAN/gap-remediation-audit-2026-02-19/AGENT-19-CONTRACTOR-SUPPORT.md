# AGENT-19: Contractor Portal & Support System Audit

> **Audit Date**: 2026-02-19 (re-run, extended)
> **Agent**: agent-19-contractor-support
> **Scope**: `apps/contractor-portal/src/`, `packages/support/src/`, related admin pages
> **Phases Reviewed**: PHASE-4F-CONTRACTOR-PORTAL-CORE, PHASE-4F-CONTRACTOR-PAYMENTS, PHASE-4F-CONTRACTOR-ADMIN, PHASE-2SP-SUPPORT-TICKETS, PHASE-2SP-SUPPORT-KB, PHASE-2SP-SUPPORT-CHANNELS

---

## Executive Summary

| Area | Phase | Status | Gap Severity |
|------|-------|--------|--------------|
| Contractor Portal Core | 4F-PORTAL-CORE | ⚠️ Mostly Complete | **CRITICAL** — Auth API routes missing |
| Contractor Payments | 4F-PAYMENTS | ⚠️ Mostly Complete | MEDIUM — 2 Stripe routes + notifications API missing |
| Admin Contractor Management | 4F-ADMIN | ✅ Complete | None |
| Support Tickets | 2SP-TICKETS | ✅ Complete | None |
| Support Channels (Chat/CSAT/Privacy) | 2SP-CHANNELS | ✅ Complete | None |
| Knowledge Base | 2SP-KB | ❌ Incomplete | **CRITICAL** — Admin UI entirely missing |

---

## 1. PHASE-4F-CONTRACTOR-PORTAL-CORE

### 1.1 Implemented ✅

**Types & Data Model** (`apps/contractor-portal/src/lib/types.ts`)
- Full `Contractor`, `ContractorProject`, `ContractorWithStats` interfaces
- `ProjectStatus` type with all 9 states
- `KANBAN_COLUMNS` mapping (6 columns: upcoming, inProgress, submitted, revisions, approved, payouts)
- `STATUS_TRANSITIONS` record with all allowed moves
- Helper functions: `getStatusLabel()`, `getStatusColor()`, `canTransitionTo()`, `getColumnForStatus()`
- Supporting types: `ProjectDeliverable`, `SubmittedWork`, `ContractorSession`, `ContractorJWTPayload`, `ContractorDashboardStats`, `KanbanColumn`, `APIError`, `APISuccess`

**Auth Library** (`apps/contractor-portal/src/lib/auth/`)
- `authenticate.ts` — `getContractorByEmail()`, `getContractorById()`, `getContractorWithStats()`, `authenticateContractor()`, `getTenantBySlug()`, `updateContractorPassword()`, `createContractor()`
- `cookies.ts` — Auth cookie management
- `jwt.ts` — JWT sign/verify
- `magic-link.ts` — Magic link token generation/verification
- `middleware.ts` — `getContractorAuthContext()`, `requireContractorAuth()`, `unauthorizedResponse()`
- `password.ts` — bcrypt hash/verify
- `password-reset.ts` — Password reset token management
- `rate-limit.ts` — Rate limiting for auth endpoints
- `session.ts` — Session management (create, validate, revoke)

**Project Data Access** (`apps/contractor-portal/src/lib/projects/index.ts`)
- `getContractorProjects()` — ordered by priority status
- `getProjectsByKanbanColumn()` — grouped for board display
- `getProjectById()` — with contractor ownership check
- `updateProjectStatus()` — validated transitions + admin-only guard
- `submitProjectWork()` — with status validation
- `requestProjectPayout()` — payout_ready → withdrawal_requested
- `getContractorDashboardStats()` — aggregated counts and amounts
- All operations use `withTenant()` for isolation ✅

**Auth Pages** (`apps/contractor-portal/src/app/(auth)/`)
- Sign-in page ✅ (email + password, forgot-password link)
- Forgot password page ✅
- Reset password page ✅
- Auth layout ✅ (centered card with Contractor Portal branding)

**Portal Pages** (`apps/contractor-portal/src/app/(portal)/`)
- Dashboard (`/`) ✅ — DashboardStats, QuickActions, RecentActivity components
- Projects Kanban (`/projects`) ✅ — 6-column board with project cards, status badges, due date urgency
- Project Detail (`/projects/[id]`) ✅ — status transitions, submitted work display, revision notes
- Payments (`/payments`) ✅
- Request Payment (`/request-payment`) ✅ — with attachment upload, validation, work type selection
- Settings: `/settings`, `/settings/profile`, `/settings/security` ✅
- Settings: `/settings/payout-methods`, `/settings/payout-methods/stripe-setup` ✅
- Settings: `/settings/tax` ✅
- Settings: `/settings/notifications` ✅ (page only — no API backend)
- Help (`/help`) ✅ — static FAQ accordion, contact cards (not wired to support system)

**Portal Layout** (`apps/contractor-portal/src/app/(portal)/layout.tsx`)
- Sidebar for desktop, MobileNav for mobile ✅
- `apps/contractor-portal/src/components/nav/Sidebar.tsx` — full nav with Dashboard, Projects, Payments, Request Payment, Settings, Help & FAQ ✅
- `apps/contractor-portal/src/components/nav/MobileNav.tsx` ✅

**Portal API Routes** (all use `requireContractorAuth`)
- `GET/PATCH /api/contractor/projects/[id]` — project detail + status update ✅
- `POST /api/contractor/projects/[id]/submit` — work submission (accepts files, links, notes) ✅
- `GET /api/contractor/projects` — list with Kanban grouping ✅
- `GET /api/contractor/dashboard` — dashboard stats ✅

**Dashboard Components**
- `DashboardStats.tsx` ✅
- `QuickActions.tsx` ✅
- `RecentActivity.tsx` ✅

### 1.2 Gaps / Missing ❌

#### GAP-1 [CRITICAL]: Auth API Routes Entirely Missing

The sign-in, forgot-password, and reset-password pages call `/api/auth/*` endpoints **that do not exist** in the contractor portal. There is no `/api/auth/` or `/api/contractor/auth/` directory in `apps/contractor-portal/src/app/api/`.

**Missing routes** (all from phase spec):
```
POST   /api/auth/signin           (called by signin page)
POST   /api/auth/signup
POST   /api/auth/magic-link
GET    /api/auth/verify
POST   /api/auth/forgot-password  (called by forgot-password page)
POST   /api/auth/reset-password   (called by reset-password page)
GET    /api/auth/session
POST   /api/auth/logout
```

**Impact**: Login, password reset, and magic link auth are completely broken. The auth library functions exist in `lib/auth/` but are never exposed as HTTP endpoints. The portal is non-functional without these routes.

**TODO**: Create `apps/contractor-portal/src/app/api/auth/` with all 8 auth routes wiring to existing `lib/auth/` functions.

#### GAP-2 [HIGH]: Signup Page Missing

`apps/contractor-portal/src/app/(auth)/signup/page.tsx` does not exist. The phase spec requires a contractor self-registration page.

**TODO**: Create signup page that calls `POST /api/auth/signup` and uses `createContractor()` from `lib/auth/authenticate.ts`.

#### GAP-3 [MEDIUM]: Kanban Drag-and-Drop Not Implemented

The phase spec explicitly requires drag-and-drop Kanban with visual drop indicators and optimistic updates with rollback. `@hello-pangea/dnd` is listed in `package.json`, but the projects page renders project cards as plain `<Link>` components with no drag behavior. Columns are visual-only; status changes require clicking into each project's detail page.

**TODO**: Implement DnD using `@hello-pangea/dnd` in `apps/contractor-portal/src/app/(portal)/projects/page.tsx`. Wire to `PATCH /api/contractor/projects/[id]` status endpoint with `canTransitionTo()` validation.

#### GAP-4 [LOW]: Work Submit UI Has No File Picker

The project detail page has a "Submit Work" button but **hardcodes `files: []`** in the request body. There is no file input, drag-drop area, or upload UX on the page. The API (`/api/contractor/projects/[id]/submit`) correctly supports file metadata, links, and notes — but the UI never sends files.

**Code location** (`apps/contractor-portal/src/app/(portal)/projects/[id]/page.tsx`):
```ts
// handleSubmitWork — always sends empty files array
body: JSON.stringify({
  files: [],    // ← hardcoded, no UI to populate this
  links: [],    // ← hardcoded
  notes: 'Work submitted',  // ← hardcoded string, no textarea
}),
```

**TODO**: Add a submission form modal with: file upload (to R2/Blob), link inputs, and a notes textarea. The `/api/contractor/payments/request/upload` pattern can be reused for file uploads.

#### GAP-5 [LOW]: Help Page Support Buttons Not Wired

The `/help` page shows "Start Live Chat" and "Email Support" buttons, but they have no `href`, `onClick`, or integration with the support system. Clicking them does nothing.

**TODO**: Wire "Start Live Chat" to the chat widget (public chat API: `POST /api/support/chat/sessions`). Wire "Email Support" to either `mailto:` or a support ticket form (`POST /api/support/tickets`).

#### GAP-6 [LOW]: Guided Onboarding Tour Missing

Phase spec checkbox explicitly: `[ ] Guided tour for new contractors (onboarding)`.

**TODO**: Implement new-contractor onboarding walkthrough (post-launch OK; deferred in phase spec).

---

## 2. PHASE-4F-CONTRACTOR-PAYMENTS

### 2.1 Implemented ✅

**Portal Payment Pages**
- `/payments` — balance dashboard, payment request list, withdrawal history ✅
- `/request-payment` — payment request form with attachment upload, amount validation ✅
- `/settings/payout-methods` — manage payout methods ✅
- `/settings/payout-methods/stripe-setup` — multi-step Stripe Connect onboarding ✅
- `/settings/tax` — W-9 submission form + 1099 access ✅
- `/settings/notifications` — notification preferences UI ✅ (page only)

**API Routes Implemented**
- `GET /api/contractor/payments/balance` ✅
- `GET /api/contractor/payments/transactions` ✅
- `GET/POST /api/contractor/payments/withdraw` ✅
- `GET/POST /api/contractor/payments/request` ✅
- `POST /api/contractor/payments/request/upload` ✅
- `GET/POST/PATCH/DELETE /api/contractor/payments/methods` ✅
- `POST /api/contractor/payments/connect/oauth` ✅
- `GET /api/contractor/payments/connect/oauth/callback` ✅
- `POST /api/contractor/payments/connect/onboard` ✅
- `POST /api/contractor/payments/connect/update` ✅
- `POST /api/contractor/payments/connect/sync` ✅
- `GET /api/contractor/payments/connect/countries` ✅
- `GET/POST /api/contractor/tax/info` ✅
- `GET /api/contractor/tax/forms` ✅
- `GET /api/contractor/tax/forms/[id]` ✅

### 2.2 Gaps / Missing ❌

#### GAP-7 [MEDIUM]: Two Stripe Connect Routes Missing

Phase spec requires these routes; they are absent from `apps/contractor-portal/src/app/api/`:
- `POST /api/contractor/payments/connect/refresh` — OAuth token refresh
- `POST /api/contractor/payments/connect/bank-account` — Admin-assisted bank account setup

**TODO**: Add these two Stripe Connect routes.

#### GAP-8 [LOW]: Notification Settings API Missing

`/settings/notifications` page exists with full toggle UI but calls `PATCH /api/contractor/settings/notifications` which doesn't exist. Settings cannot be saved or loaded; toggles revert on reload. The phase spec deferred this item, but the UI was built anyway without a backend.

**TODO**: Create `apps/contractor-portal/src/app/api/contractor/settings/notifications/route.ts` (GET/PATCH).

---

## 3. PHASE-4F-CONTRACTOR-ADMIN

### 3.1 Implemented ✅ (Full)

**Admin Pages** (`apps/admin/src/app/admin/contractors/`)
- `/admin/contractors` — contractor directory with search, filters, CSV export ✅
- `/admin/contractors/[id]` — contractor detail (profile, projects, payments) ✅
- `/admin/contractors/[id]/edit` — edit contractor profile ✅
- `/admin/contractors/[id]/projects` — project management per contractor ✅
- `/admin/contractors/invite` — invite new contractor ✅

**Admin API Routes** (`apps/admin/src/app/api/admin/contractors/`)
- `GET/POST /api/admin/contractors` ✅
- `GET/PATCH/DELETE /api/admin/contractors/[id]` ✅
- `GET /api/admin/contractors/export` ✅
- `POST /api/admin/contractors/invite` ✅
- `GET/POST /api/admin/contractors/[id]/projects` ✅
- `GET/PATCH/DELETE /api/admin/contractors/[id]/projects/[pid]` ✅
- `GET/POST /api/admin/contractors/[id]/payments` ✅
- `PATCH /api/admin/contractors/[id]/payments/[rid]` ✅

**Components** (`apps/admin/src/components/contractors/`)
- `contractor-actions.tsx`, `contractor-filters.tsx` ✅
- `invite-contractor-modal.tsx`, `payment-request-row.tsx` ✅
- `project-assignment-modal.tsx`, `status-badge.tsx` ✅

**Lib** (`apps/admin/src/lib/contractors/`)
- `db.ts`, `index.ts`, `types.ts` — full contractor data access ✅

### 3.2 Gaps

**None found.** Phase-4F-ADMIN is fully implemented.

---

## 4. PHASE-2SP-SUPPORT-TICKETS

### 4.1 Implemented ✅ (Full)

**Package Functions** (`packages/support/src/`)

`tickets.ts` (952 lines):
- `createTicket()` with sequential TKT-XXXXXX numbering ✅
- `getTickets()` with full filtering/pagination ✅
- `getTicket()`, `getTicketByNumber()` ✅
- `updateTicket()` with status validation ✅
- `assignTicket()`, `unassignTicket()`, `autoAssignTicket()` ✅
- `addComment()`, `getComments()` ✅
- `getTicketAuditLog()`, `getTicketMetrics()` ✅

`agents.ts` (355 lines):
- Full agent lifecycle: `createAgent()`, `getAgent()`, `getAgentByUserId()`, `getAgents()` ✅
- `updateAgent()`, `deleteAgent()`, `updateAgentStatus()` ✅
- `getAvailableAgents()` — round-robin ready ✅
- `incrementAgentTicketCount()`, `decrementAgentTicketCount()` ✅

`sla.ts` (287 lines):
- `calculateSLADeadline()`, `calculateFirstResponseDeadline()` ✅
- `checkSLABreaches()` — background job function ✅
- `isSLABreached()`, `getSLAStatus()`, `getRemainingMinutes()`, `formatRemainingTime()` ✅
- `getSLAConfig()`, `getAllSLAConfigs()`, `updateSLAConfig()` ✅
- `recalculateSLADeadline()` ✅

`sentiment.ts` (381 lines):
- `analyzeSentiment()` — Claude API + keyword fallback ✅
- `processSentiment()` — auto-escalation on threshold breach ✅
- `createSentimentAlert()`, `acknowledgeSentimentAlert()`, `getUnacknowledgedAlerts()` ✅

**Admin Pages** (`apps/admin/src/app/admin/support/`)
- `/admin/support` — support dashboard with metrics + channel breakdown ✅
- `/admin/support/tickets` — filterable ticket list (channel, priority, status, SLA) ✅
- `/admin/support/tickets/[id]` — full ticket detail + comment thread ✅
- `/admin/support/agents` — agent management ✅
- `/admin/support/settings` — SLA config + auto-assignment toggles ✅

**Admin API Routes** (all present and correct)
- Tickets CRUD, assign, comments, close ✅
- Agents CRUD, status update ✅
- SLA config ✅
- Analytics endpoint ✅

**UI Components** (`apps/admin/src/components/support/`)
- `ticket-list.tsx`, `comment-thread.tsx`, `sla-indicator.tsx` ✅
- `ticket-status-badge.tsx`, `ticket-priority-badge.tsx`, `internal-note-badge.tsx` ✅
- `agent-selector.tsx`, `agent-list.tsx` ✅

**Tests** (`packages/support/src/__tests__/`)
- `sla.test.ts` ✅
- `sentiment.test.ts` ✅
- `tenant-isolation.test.ts` ✅
- `channels.test.ts` ✅

**Email-to-Ticket Inbound**: Email routing in `packages/communications/src/inbound/router.ts` routes `purpose='support'` emails to `handleSupportEmail()` → `matchToThread()` / `addInboundToThread()`. Email support channel is wired at the infrastructure level. ✅

### 4.2 Gaps

**None found.** Phase-2SP-TICKETS is fully implemented with tests.

---

## 5. PHASE-2SP-SUPPORT-CHANNELS (Chat / CSAT / Privacy)

### 5.1 Implemented ✅ (Full)

**Package Functions** (`packages/support/src/`)

`chat.ts` (667 lines):
- `createChatSession()`, `getChatSession()`, `getActiveSessions()`, `getQueuedSessions()`, `getChatSessions()` ✅
- `assignChatSession()`, `endChatSession()`, `transferChatSession()` ✅
- `sendMessage()`, `getMessages()`, `markMessagesRead()`, `getUnreadCount()` ✅
- `getWidgetConfig()`, `updateWidgetConfig()`, `isWithinBusinessHours()` ✅
- `getChatQueueStats()` ✅

`csat.ts` (736 lines):
- `createSurvey()`, `getSurvey()`, `getSurveys()`, `submitSurveyResponse()` ✅
- `getCSATMetrics()`, `getAgentCSATScores()`, `getDailyMetrics()` ✅
- `triggerCSATSurvey()` — auto-send on ticket resolution ✅
- `getCSATConfig()`, `updateCSATConfig()` ✅

`privacy.ts` (858 lines):
- Full GDPR/CCPA lifecycle: `createPrivacyRequest()`, `getPrivacyRequests()`, `getPrivacyRequest()` ✅
- `updateRequestStatus()`, `updatePrivacyRequest()` ✅
- `verifyRequest()`, `processDataExport()`, `processDataDeletion()` ✅
- `recordConsent()`, `getConsentRecords()`, `getActiveConsent()`, `revokeConsent()` ✅
- `getOverdueRequests()`, `getApproachingDeadlineRequests()`, `getPrivacyStats()` ✅
- `COMPLIANCE_DEADLINES`, `calculateDeadline()`, `getDaysUntilDeadline()`, `isRequestOverdue()` ✅

**Admin Pages** (`apps/admin/src/app/admin/support/`)
- `/admin/support/chat` — live chat queue ✅
- `/admin/support/chat/config` — widget configuration ✅
- `/admin/support/csat` — CSAT dashboard ✅
- `/admin/support/privacy` — privacy request management ✅
- `/admin/support/privacy/consent` — consent record browser ✅

**Admin API Routes** (`apps/admin/src/app/api/admin/support/`):
- Chat: sessions, queue, assign, config ✅
- CSAT: metrics, agent scores, surveys ✅
- Privacy: requests CRUD, verify, process, consent ✅

### 5.2 Gaps

**None found.** Phase-2SP-CHANNELS is fully implemented.

---

## 6. PHASE-2SP-SUPPORT-KB (Knowledge Base)

### 6.1 What Exists

**Backend is complete; UI is entirely missing.**

**Admin-Local KB Library** (`apps/admin/src/lib/knowledge-base/`)
- `db.ts` (812 lines) — full article/category CRUD, search, feedback, view tracking ✅
- `types.ts` — `KBArticle`, `KBCategory`, `KBArticleRow`, `ArticleFilters`, `CreateArticleInput`, etc. ✅
- `embeddings.ts` — hybrid semantic + full-text search (exceeds spec!) ✅
- `index.ts` ✅

**Admin API Routes** (`apps/admin/src/app/api/admin/support/kb/`):
- `GET/POST /api/admin/support/kb` ✅
- `GET/PATCH/DELETE /api/admin/support/kb/[id]` ✅
- `POST /api/admin/support/kb/[id]/publish`, unpublish ✅
- `GET/POST /api/admin/support/kb/categories` ✅
- `GET/PATCH/DELETE /api/admin/support/kb/categories/[id]` ✅
- `GET /api/admin/support/kb/analytics` ✅

**Public API Routes** (`apps/admin/src/app/api/support/kb/`):
- `GET /api/support/kb` — search articles ✅
- `GET /api/support/kb/[slug]` — get article ✅
- `POST /api/support/kb/[slug]/feedback` — helpful/not helpful ✅
- `GET /api/support/kb/popular` ✅
- `GET /api/support/kb/categories` ✅

### 6.2 Gaps / Missing ❌

#### GAP-9 [CRITICAL]: No Admin KB Pages (Entire UI Missing)

**No `/admin/support/kb/*` pages exist** in `apps/admin/src/app/admin/support/`. The support dashboard quick-links section links only to Tickets, Agent Management, and SLA Settings — KB is not linked anywhere in the admin navigation.

Phase spec requires:
```
/admin/support/kb              → article list with search/filter/publish controls
/admin/support/kb/new          → create article (rich text editor)
/admin/support/kb/[id]         → edit article
/admin/support/kb/categories   → category management with sort order
/admin/support/kb/analytics    → view counts, feedback rates, deflection metrics
```

All API routes and backend logic exist. **Admins have no way to create, edit, publish, or manage knowledge base articles.** The KB is entirely non-functional from an admin perspective.

**Phase Status**: The phase doc status says "COMPLETE" but the Definition of Done checkboxes are all `[ ]` unchecked.

**TODO**: Build 5 admin KB pages. See TODO list below.

#### GAP-10 [HIGH]: KB Not in `packages/support` Package

Phase spec called for `packages/support/src/knowledge-base.ts` with shared exportable functions. Instead, KB logic lives in `apps/admin/src/lib/knowledge-base/db.ts` (local, not shared) and is not exported from `packages/support/src/index.ts`.

**Consequences**:
- Other apps/packages cannot access KB functions
- KB types not available via the support package import
- Inconsistent with how tickets, chat, CSAT, privacy are structured

**TODO**: Either move KB to `packages/support/src/knowledge-base.ts` and re-export, OR explicitly document the admin-local approach in an ARCHITECTURE-DECISIONS.md file.

#### GAP-11 [MEDIUM]: No KB UI Components

Required UI components (per phase spec) don't exist anywhere:
- `ArticleEditor` — rich text / Markdown editor
- `ArticleList` — filterable/sortable article table
- `CategoryManager` — sortable category list
- `CategoryPicker` — dropdown for article editing
- `TagInput` — multi-tag chip input
- `PublishToggle` — draft/published toggle with visual state
- `FeedbackWidget` — "Was this helpful?" (needed in storefront/public KB)
- `ArticleStats` — view count, helpful %, rating display
- `SearchBar`, `RelatedArticles`

**TODO**: Build KB UI components in `apps/admin/src/components/support/knowledge-base/`.

#### GAP-12 [LOW]: No KB Tests

No `packages/support/src/__tests__/knowledge-base.test.ts` exists. Phase spec requires unit tests for search and feedback.

**TODO**: Add KB unit tests (when KB moves to support package).

---

## 7. Consolidated TODO List

### 🔴 CRITICAL — Blocks Basic Functionality

```
[ ] CONTRACTOR-AUTH-ROUTES: Create auth API routes in contractor portal
    Path: apps/contractor-portal/src/app/api/auth/
    Routes needed:
      POST signin    → lib/auth/authenticate.ts (authenticateContractor)
      POST signup    → lib/auth/authenticate.ts (createContractor)
      POST magic-link → lib/auth/magic-link.ts
      GET  verify   → lib/auth/magic-link.ts
      POST forgot-password → lib/auth/password-reset.ts
      POST reset-password  → lib/auth/password-reset.ts
      GET  session  → lib/auth/session.ts
      POST logout   → lib/auth/cookies.ts
    Note: All library functions exist — need HTTP wrappers only.

[ ] KB-ADMIN-PAGES: Create 5 admin KB UI pages
    apps/admin/src/app/admin/support/kb/page.tsx              (article list)
    apps/admin/src/app/admin/support/kb/new/page.tsx          (create article)
    apps/admin/src/app/admin/support/kb/[id]/page.tsx         (edit article)
    apps/admin/src/app/admin/support/kb/categories/page.tsx   (category manager)
    apps/admin/src/app/admin/support/kb/analytics/page.tsx    (metrics dashboard)
    Note: All API routes exist (/api/admin/support/kb/*) — need UI only.
```

### 🟠 HIGH — Breaks User Flows

```
[ ] CONTRACTOR-SIGNUP-PAGE: Create contractor registration page
    File: apps/contractor-portal/src/app/(auth)/signup/page.tsx
    Calls: POST /api/auth/signup (once GAP-1 is resolved)

[ ] KB-PACKAGE-EXPORT: Move KB to packages/support/src/knowledge-base.ts
    OR document admin-local approach in ARCHITECTURE-DECISIONS.md
    Impact: Knowledge base is inaccessible to other apps/packages

[ ] KB-UI-COMPONENTS: Build KB admin component library
    Path: apps/admin/src/components/support/knowledge-base/
    Components: ArticleEditor, ArticleList, CategoryManager, FeedbackWidget,
                TagInput, PublishToggle, SearchBar, RelatedArticles, ArticleStats
```

### 🟡 MEDIUM

```
[ ] KANBAN-DND: Implement drag-and-drop on contractor projects Kanban
    File: apps/contractor-portal/src/app/(portal)/projects/page.tsx
    Package: @hello-pangea/dnd (already in package.json)
    Wire to: PATCH /api/contractor/projects/[id] with canTransitionTo() validation

[ ] SUBMIT-WORK-UI: Add file upload + links + notes form to project submit
    File: apps/contractor-portal/src/app/(portal)/projects/[id]/page.tsx
    Currently: hardcodes files:[], links:[], notes:'Work submitted'
    API already supports: {files, links, notes} body properly

[ ] STRIPE-CONNECT-REFRESH: Add /api/contractor/payments/connect/refresh route
[ ] STRIPE-CONNECT-BANK-ACCOUNT: Add /api/contractor/payments/connect/bank-account route
```

### 🟢 LOW

```
[ ] NOTIFICATION-SETTINGS-API: Create /api/contractor/settings/notifications/route.ts
    (GET current settings, PATCH to update; page UI already exists)

[ ] HELP-PAGE-SUPPORT-WIRING:
    Wire "Start Live Chat" button → POST /api/support/chat/sessions
    Wire "Email Support" button → support ticket form or mailto:
    File: apps/contractor-portal/src/app/(portal)/help/page.tsx

[ ] KB-TESTS: Add knowledge-base.test.ts in packages/support/src/__tests__/

[ ] CONTRACTOR-ONBOARDING-TOUR: Guided tour for new contractors
    (explicitly deferred in phase spec — post-launch OK)
```

---

## 8. Feature Classification Matrix

| Feature | Spec | Code | API | Tests | Status |
|---------|------|------|-----|-------|--------|
| **CONTRACTOR PORTAL CORE** |||||
| Contractor auth library | ✅ | ✅ | ❌ | — | ⚠️ BROKEN — API missing |
| Contractor signin page | ✅ | ✅ | ❌ | — | ❌ BROKEN — calls nonexistent API |
| Contractor signup page | ✅ | ❌ | ❌ | — | ❌ MISSING |
| Contractor forgot/reset password | ✅ | ✅ | ❌ | — | ❌ BROKEN — calls nonexistent API |
| Magic link auth | ✅ | ✅ | ❌ | — | ❌ BROKEN — calls nonexistent API |
| Portal layout (sidebar/mobile nav) | ✅ | ✅ | — | — | ✅ |
| Contractor dashboard | ✅ | ✅ | ✅ | — | ✅ |
| Projects Kanban (6 columns) | ✅ | ✅ | ✅ | — | ⚠️ PARTIAL — visual only, no DnD |
| Project detail page | ✅ | ✅ | ✅ | — | ✅ |
| Submit work (API) | ✅ | ✅ | ✅ | — | ⚠️ PARTIAL — UI sends empty payload |
| Submit work (file upload UI) | ✅ | ❌ | ✅ | — | ❌ MISSING — no file picker |
| Help page (static FAQ) | ✅ | ✅ | — | — | ⚠️ PARTIAL — buttons not wired |
| Help page → live chat widget | ✅ | ❌ | — | — | ❌ MISSING |
| Contractor onboarding tour | ✅ | ❌ | ❌ | — | 🔄 DEFERRED |
| **CONTRACTOR PAYMENTS** |||||
| Payments dashboard | ✅ | ✅ | ✅ | — | ✅ |
| Request payment / invoice | ✅ | ✅ | ✅ | — | ✅ |
| Withdrawal request | ✅ | ✅ | ✅ | — | ✅ |
| Payout methods management | ✅ | ✅ | ✅ | — | ✅ |
| Stripe Connect onboarding | ✅ | ✅ | ⚠️ | — | ⚠️ PARTIAL — 2 routes missing |
| W-9 submission | ✅ | ✅ | ✅ | — | ✅ |
| 1099 tax forms | ✅ | ✅ | ✅ | — | ✅ |
| Notification settings (UI) | ✅ | ✅ | ❌ | — | ⚠️ PARTIAL — no API backend |
| **ADMIN CONTRACTOR MANAGEMENT** |||||
| Contractor directory | ✅ | ✅ | ✅ | — | ✅ |
| Contractor detail / edit | ✅ | ✅ | ✅ | — | ✅ |
| Contractor invite flow | ✅ | ✅ | ✅ | — | ✅ |
| Project assignment | ✅ | ✅ | ✅ | — | ✅ |
| Payment approval queue | ✅ | ✅ | ✅ | — | ✅ |
| CSV export | ✅ | ✅ | ✅ | — | ✅ |
| **SUPPORT TICKETS** |||||
| Ticket creation (all channels) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ticket routing / assignment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-assignment (round robin) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comment threads | ✅ | ✅ | ✅ | ✅ | ✅ |
| SLA tracking + alerts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sentiment analysis + escalation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email → ticket inbound | ✅ | ✅ | ✅ | — | ✅ |
| Admin tickets UI | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SUPPORT CHANNELS** |||||
| Live chat widget (backend) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Live chat queue (admin) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat widget configuration | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSAT surveys + metrics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Privacy requests (GDPR/CCPA) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consent record management | ✅ | ✅ | ✅ | ✅ | ✅ |
| **KNOWLEDGE BASE** |||||
| KB backend library | ✅ | ✅ | ✅ | ❌ | ⚠️ PARTIAL — local to admin |
| KB in support package | ✅ | ❌ | — | ❌ | ❌ MISSING |
| KB admin pages (UI) | ✅ | ❌ | ✅ | ❌ | ❌ MISSING — API ready, no UI |
| KB public API | ✅ | ✅ | ✅ | ❌ | ⚠️ PARTIAL — unreachable without admin UI |
| KB hybrid semantic search | — | ✅ | ✅ | ❌ | ✅ BONUS |
| KB category management (UI) | ✅ | ❌ | ✅ | ❌ | ❌ MISSING |
| KB analytics dashboard | ✅ | ❌ | ✅ | ❌ | ❌ MISSING |

---

## 9. Architectural Notes & Deviations

### Deviation 1: Contractor Auth Route Path
The sign-in page uses `/api/auth/signin` (not the spec's `/api/contractor/auth/signin`). The shorter path is fine — just needs to exist.

### Deviation 2: KB in Admin-Local Lib Instead of Support Package
Phase spec called for `packages/support/src/knowledge-base.ts`. The implementing agent placed KB logic in `apps/admin/src/lib/knowledge-base/db.ts`. This is architecturally valid since KB is primarily admin-managed functionality, but it deviates from the pattern established by tickets, chat, CSAT, and privacy (all in the shared package). The public KB API routes (`/api/support/kb/*`) call into the admin-local lib, creating an unusual dependency direction.

### Deviation 3: KB Hybrid Embeddings Added
`apps/admin/src/lib/knowledge-base/embeddings.ts` adds semantic vector search on top of the spec's required PostgreSQL full-text. This is a positive enhancement.

### Deviation 4: Kanban Visual-Only
Phase spec explicitly required drag-and-drop Kanban for the contractor projects board. The board renders correctly as 6 columns but is read-only — status changes require navigating to project detail pages.

### Deviation 5: Phase Doc Status Mismatch
PHASE-2SP-KB.md and PHASE-4F-CONTRACTOR-ADMIN.md show STATUS: COMPLETE at the top but have unchecked `[ ]` items in their Definition of Done sections. The status header should be treated as aspirational; the checkbox list is the authoritative source of truth.
