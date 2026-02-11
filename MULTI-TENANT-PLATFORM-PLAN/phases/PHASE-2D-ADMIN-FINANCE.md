# PHASE-2D: Admin Finance & Creator Management

**Status**: ✅ COMPLETE

**Duration**: 1 week (Week 7)
**Depends On**: Phase 2A (Admin Shell)
**Parallel With**: Phase 2C (Content - late), Phase 2SA-ADVANCED, **PHASE-2D-PL-CONFIGURATION**
**Blocks**: Phase 4 (Creator Portal - needs admin creator management patterns)

---

## Related Phase

**See also**: [PHASE-2D-PL-CONFIGURATION.md](./PHASE-2D-PL-CONFIGURATION.md) for:
- Per-tenant P&L variable costs configuration (payment processing %, pick/pack fees, etc.)
- COGS source management (Shopify sync vs manual entry)
- Per-product COGS management for non-Shopify tenants
- P&L formula customization per tenant
- Expense category configuration

This phase focuses on **creators, payouts, and treasury operations**. P&L configuration is a separate parallel phase.

---

## Goal

Implement the Creators and Finance sections of the admin portal including creator directory, applications pipeline (kanban), creator inbox, payouts dashboard, treasury management, and expenses tracking.

---

## Success Criteria

- [x] Creator directory with search and filters
- [x] Creator detail page with earnings and projects
- [x] Creator pipeline kanban with drag-and-drop stages
- [x] Creator inbox with threads and messaging
- [x] Payouts dashboard with pending/completed withdrawals
- [x] Withdrawal approval/rejection workflow
- [x] Treasury view with balances
- [x] Expenses tracking CRUD
- [x] Tax/1099 status per creator

---

## Deliverables

### Creator Directory
- Creators list with search (name, email)
- Status filters (applied, reviewing, approved, onboarding, active)
- Creator detail page with profile, earnings, projects
- Total earned and pending balance display
- Creator tags and notes

### Creator Pipeline (Kanban)
- 5-stage pipeline: Applied, Reviewing, Approved, Onboarding, Active
- Drag-and-drop between stages using dnd-kit
- Creator cards with avatar, name, application date
- Stage transition triggers (e.g., email on approval)
- Batch actions per stage

### Creator Inbox
- Communication threads list
- Thread detail with message history
- Send message functionality (email, SMS channels)
- Thread status (open, closed, pending)
- Unread indicators

### Payouts Dashboard
- Withdrawal requests list
- Status filters (pending, approved, completed, failed)
- Withdrawal detail modal
- Approve/reject actions with confirmation
- Payout execution via Stripe or Wise
- Transfer ID tracking

### Treasury Management
- Overall balance view per payment provider
- Pending payouts aggregate
- Historical payout totals
- Low balance alerts

### Expenses Tracking
- Expenses list with category filters
- Expense create/edit forms
- Receipt upload (Vercel Blob)
- Monthly/yearly summaries

### Tax Management
- Creator W-9 status overview
- 1099-NEC generation triggers
- Tax year filters
- Compliance status indicators

---

## Constraints

- Pipeline stage changes must be atomic (single SQL update)
- Payout approvals require confirmation modal
- Stripe/Wise API errors must surface clearly
- Inbox messages must log direction (inbound/outbound)
- W-9/TIN data is encrypted - display masked only
- Use optimistic updates for kanban drag-and-drop

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For kanban board, inbox, and dashboard layouts
- Context7 MCP: "dnd-kit kanban board patterns"
- Context7 MCP: "React Query optimistic updates"

**RAWDOG code to reference:**
- `src/app/admin/creators/page.tsx` - Creator directory pattern
- `src/app/admin/creator-pipeline/page.tsx` - Kanban implementation
- `src/app/admin/creators/inbox/page.tsx` - Inbox pattern
- `src/app/admin/payouts/page.tsx` - Payouts dashboard
- `src/lib/payouts/` - Payout processing logic
- `src/lib/messaging/` - Communication threads

**External APIs:**
- Stripe Connect for payouts: `stripe.transfers.create()`
- Wise Business API for international payouts

**Spec documents:**
- `CODEBASE-ANALYSIS/ADMIN-FEATURES-2025-02-10.md` - Creator and finance features

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - **CRITICAL**: Batch save, cache-busting, Neon pooling patterns with multi-tenant context
- `reference-docs/META-ADS-INTEGRATION.md` - Meta/Facebook Marketing API patterns (for P&L ad spend sync)
- `reference-docs/GOOGLE-ADS-INTEGRATION.md` - Google Ads API patterns (for P&L ad spend sync)
- `reference-docs/TIKTOK-ADS-INTEGRATION.md` - TikTok Ads API patterns (for P&L ad spend sync)

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Kanban state management (local state vs server state)
2. Message threading UI (Gmail-style vs linear)
3. Payout confirmation modal design
4. Expense receipt preview component
5. Treasury balance refresh frequency

---

## Tasks

### [PARALLEL] Database Layer
- [x] Create `apps/admin/src/lib/creators/db.ts` (getCreators, getCreator, updateStage)
- [x] Create `apps/admin/src/lib/creators/types.ts`
- [x] Create `apps/admin/src/lib/messaging/db.ts` (getThreads, sendMessage)
- [x] Create `apps/admin/src/lib/payouts/db.ts` (getWithdrawals, processWithdrawal)
- [x] Create `apps/admin/src/lib/expenses/db.ts`
- [x] Create `apps/admin/src/lib/treasury/db.ts`
- [x] Create `apps/admin/src/lib/tax/db.ts` (added)
- [x] Create `apps/admin/src/lib/messaging/types.ts` (added)
- [x] Create `apps/admin/src/lib/payouts/types.ts` (added)
- [x] Create `apps/admin/src/lib/treasury/types.ts` (added)
- [x] Create `apps/admin/src/lib/expenses/types.ts` (added)
- [x] Create `apps/admin/src/lib/tax/types.ts` (added)

### [PARALLEL] API Routes
- [x] Create `apps/admin/src/app/api/admin/creators/route.ts`
- [x] Create `apps/admin/src/app/api/admin/creators/[id]/route.ts`
- [x] Create `apps/admin/src/app/api/admin/creators/[id]/stage/route.ts`
- [x] Create `apps/admin/src/app/api/admin/creators/inbox/route.ts`
- [x] Create `apps/admin/src/app/api/admin/creators/inbox/[threadId]/route.ts`
- [x] Create `apps/admin/src/app/api/admin/payouts/route.ts`
- [x] Create `apps/admin/src/app/api/admin/payouts/[id]/process/route.ts`
- [x] Create `apps/admin/src/app/api/admin/treasury/route.ts`
- [x] Create `apps/admin/src/app/api/admin/expenses/route.ts`
- [x] Create `apps/admin/src/app/api/admin/tax/route.ts`

### [SEQUENTIAL after API] Creator Directory UI
- [x] Create `apps/admin/src/app/admin/creators/page.tsx` (directory)
- [x] Create `apps/admin/src/app/admin/creators/components/creator-list.tsx`
- [x] Create `apps/admin/src/app/admin/creators/[id]/page.tsx` (detail)
- [x] Create `apps/admin/src/app/admin/creators/applications/page.tsx`

### [SEQUENTIAL after API] Creator Pipeline UI
- [x] Create `apps/admin/src/app/admin/creator-pipeline/page.tsx`
- [x] Create `apps/admin/src/components/admin/creators/pipeline.tsx`
- [x] Create `apps/admin/src/components/admin/creators/creator-card.tsx`
- [x] Implement dnd-kit with DndContext and SortableContext
- [x] Implement stage transition API calls

### [SEQUENTIAL after API] Creator Inbox UI
- [x] Create `apps/admin/src/app/admin/creators/inbox/page.tsx`
- [x] Create `apps/admin/src/components/admin/creators/thread-list.tsx`
- [x] Create `apps/admin/src/components/admin/creators/thread-detail.tsx`
- [x] Create `apps/admin/src/components/admin/creators/message-composer.tsx`

### [SEQUENTIAL after API] Finance UI
- [x] Create `apps/admin/src/app/admin/payouts/page.tsx`
- [x] Create `apps/admin/src/components/admin/payouts/withdrawal-list.tsx`
- [x] Create `apps/admin/src/components/admin/payouts/process-modal.tsx`
- [x] Create `apps/admin/src/app/admin/treasury/page.tsx`
- [x] Create `apps/admin/src/app/admin/expenses/page.tsx`
- [x] Create `apps/admin/src/app/admin/expenses/components/expense-form.tsx`
- [x] Create `apps/admin/src/app/admin/tax/page.tsx`
- [x] Create `apps/admin/src/app/admin/tax/tax-actions-client.tsx` (added)
- [x] Create `apps/admin/src/app/admin/payouts/payouts-client.tsx` (added)
- [x] Create `apps/admin/src/app/admin/expenses/expenses-client.tsx` (added)

### [SEQUENTIAL after Finance UI] Payout Integration
- [x] Implement Stripe transfer execution in processWithdrawal
- [x] Implement Wise payout fallback (if configured)
- [x] Add payout failure handling and retry UI

---

## Definition of Done

- [x] Creator directory lists creators with search
- [x] Creator detail shows earnings and projects
- [x] Pipeline kanban drag-and-drop works smoothly
- [x] Stage transitions persist to database
- [x] Inbox shows threads with last message preview
- [x] Messages can be sent with delivery status
- [x] Payouts list shows pending withdrawals
- [x] Approve/reject workflow executes correctly
- [x] Stripe/Wise transfers execute on approval
- [x] Treasury shows aggregate balances
- [x] Expenses CRUD with receipt upload works
- [x] Tax page shows W-9 status per creator
- [x] `npx tsc --noEmit` passes
- [x] Kanban performance smooth with 50+ creators
