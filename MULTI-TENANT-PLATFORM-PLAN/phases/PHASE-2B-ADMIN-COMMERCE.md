# PHASE-2B: Admin Commerce Features

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Completed**: 2026-02-10

**Duration**: 1.5 weeks (Week 5-6)
**Depends On**: Phase 2A (Admin Shell)
**Parallel With**: Phase 2C (Content), Phase 2SA-DASHBOARD
**Blocks**: Phase 3 (Storefront - needs order/customer sync patterns)
**Status**: ✅ COMPLETE

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Commerce data is the most sensitive. A tenant data leak here would be catastrophic.

Key requirements for this phase:
- ALL order/customer queries use `withTenant(tenantId, ...)` ✅
- NEVER return orders from wrong tenant - audit every query ✅
- Revenue metrics are per-tenant only ✅
- Customer PII never crosses tenant boundaries ✅
- Shopify API calls use tenant's credentials, not platform credentials (N/A - reads from synced DB only)

---

## Goal

Implement the Commerce section of the admin portal including orders, customers, subscriptions (with Loop integration), reviews management, and analytics overview.

---

## Architecture Decisions (Made During Implementation)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data fetching | Server components + `withTenant()` + `sql` directly | Matches Phase 2A dashboard pattern, no API routes needed for reads |
| Client state | No React Query | Server-side data fetching + Suspense is simpler, avoids new dep |
| Pagination/Filters | URL params (`?page=1&status=pending&sort=col`) | All navigation via `<Link>` tags, fully server-rendered |
| DataTable | Custom generic `DataTable<T>` server component | Simpler than `@tanstack/react-table`, sortable Link headers |
| Money | INTEGER cents in DB, `formatMoney(cents)` via `Intl.NumberFormat` | Avoids floating-point issues |
| Subscriptions | Empty state with setup instructions | No subscriptions table exists, Loop API needs external credentials |
| Analytics | Not added (dashboard already has KPI cards) | Phase 2A dashboard covers revenue, orders, customers, subscriptions metrics |
| Bulk moderation | Deferred | Individual approve/reject covers core use case, bulk can be added later |
| Separate db.ts/types.ts files | Not created | Queries inline in server components, types collocated, avoids indirection |
| API routes | Only for mutations (review moderate/respond) | Reads use server components directly |

---

## Success Criteria

- [x] Orders list with pagination, filters (date, status, fulfillment, financial, search)
- [x] Order detail page with line items, customer info, fulfillment status, financial summary, addresses, attribution
- [x] Customers list with search, lifetime value display, sortable columns
- [x] Customer detail with order history, stats cards, default address, tags/notes
- [x] Subscriptions page with empty state and Loop integration instructions
- [x] Reviews list with moderation actions (approve/reject per review)
- [x] Analytics: covered by Phase 2A dashboard (KPI cards: revenue MTD, orders today, new customers, active subscriptions)
- [x] All data properly tenant-isolated (every sql call inside `withTenant()`)

---

## Deliverables

### Orders Module
- [x] Order list page with reusable DataTable component
- [x] Order filters (status, fulfillment, financial status, search) via URL params
- [x] Order detail page with full order view (line items, financials, addresses, attribution)
- [ ] Order sync from Shopify (on-demand and background) — deferred to Phase 5 (Jobs)

### Customers Module
- [x] Customer list with search functionality (name, email, phone)
- [x] Customer detail page with order history
- [x] Order count and lifetime value calculations (from denormalized DB fields)
- [x] Customer tags and notes display

### Subscriptions Module (Loop Integration)
- [x] Subscriptions page (empty state with setup instructions)
- [ ] Loop API client integration — deferred (requires external credentials, no subscriptions table)
- [ ] Fallback to custom subscription system if Loop disabled — deferred
- [ ] Subscription status display and filtering — deferred

### Reviews Module
- [x] Reviews list with product title (LEFT JOIN products) and author info
- [x] Status filter tabs (All, Pending, Approved, Rejected)
- [x] Rating and verified purchase secondary filters
- [x] Star rating display, status badges, verified purchase badges
- [x] Individual approve/reject with moderator timestamp (`updated_at`)
- [x] Admin response endpoint (POST with author name resolution via `getUserById()`)
- [ ] Bulk moderation actions — deferred (individual moderation covers core use case)

### Analytics Overview
- [x] Commerce KPIs already in Phase 2A dashboard (revenue MTD, orders today, new customers)
- [ ] Trend charts — deferred to dedicated analytics phase
- [x] Quick links to detailed reports (KPI cards link to commerce pages)

---

## Constraints

- [x] Use `withTenant()` wrapper for ALL database queries
- N/A Loop API calls (deferred — empty state)
- [x] Reviews moderation logs moderator and timestamp (responded_at + response_author)
- [x] Customer PII handled with appropriate security (tenant isolation)
- Architecture changed: Server-side data fetching via Suspense instead of React Query

---

## Implemented Files (18 new files)

### Shared Utilities
- [x] `apps/admin/src/lib/format.ts` — `formatMoney()`, `formatDate()`, `formatDateTime()`
- [x] `apps/admin/src/lib/search-params.ts` — Filter parsing + `buildFilterUrl()`

### Shared Commerce Components
- [x] `apps/admin/src/components/commerce/data-table.tsx` — Generic `DataTable<T>` with sortable Link headers
- [x] `apps/admin/src/components/commerce/pagination.tsx` — Page numbers + prev/next as Links
- [x] `apps/admin/src/components/commerce/status-badge.tsx` — Order/Fulfillment/Financial/Review status badges
- [x] `apps/admin/src/components/commerce/empty-state.tsx` — Reusable empty state card
- [x] `apps/admin/src/components/commerce/search-input.tsx` — `'use client'` debounced search

### Commerce Pages
- [x] `apps/admin/src/app/admin/commerce/layout.tsx` — Thin spacing wrapper
- [x] `apps/admin/src/app/admin/commerce/page.tsx` — Redirect to orders
- [x] `apps/admin/src/app/admin/commerce/orders/page.tsx` — Orders list
- [x] `apps/admin/src/app/admin/commerce/orders/[id]/page.tsx` — Order detail
- [x] `apps/admin/src/app/admin/commerce/customers/page.tsx` — Customers list
- [x] `apps/admin/src/app/admin/commerce/customers/[id]/page.tsx` — Customer detail
- [x] `apps/admin/src/app/admin/commerce/subscriptions/page.tsx` — Empty state
- [x] `apps/admin/src/app/admin/commerce/reviews/page.tsx` — Reviews list + moderation
- [x] `apps/admin/src/app/admin/commerce/reviews/review-actions.tsx` — `'use client'` approve/reject

### API Routes (Mutations Only)
- [x] `apps/admin/src/app/api/admin/reviews/[id]/moderate/route.ts` — POST approve/reject/spam
- [x] `apps/admin/src/app/api/admin/reviews/[id]/respond/route.ts` — POST admin response

---

## Original Tasks (Mapped to Implementation)

### [PARALLEL] Database Layer
- [x] ~~Create `apps/admin/src/lib/orders/db.ts`~~ — Queries inline in server components via `withTenant()` + `sql`
- [x] ~~Create `apps/admin/src/lib/orders/types.ts`~~ — Types collocated in page files
- [x] ~~Create `apps/admin/src/lib/customers/db.ts`~~ — Queries inline in server components
- [x] ~~Create `apps/admin/src/lib/reviews/db.ts`~~ — Queries inline in server components + API routes
- [ ] Create `apps/admin/src/lib/subscriptions/loop-client.ts` — Deferred (no Loop credentials)

### [PARALLEL] API Routes
- [x] ~~Orders/Customers/Subscriptions API routes~~ — Not needed: server components read DB directly
- [x] Create `apps/admin/src/app/api/admin/reviews/[id]/moderate/route.ts` — Done
- [x] Create `apps/admin/src/app/api/admin/reviews/[id]/respond/route.ts` — Done (added beyond original plan)

### [SEQUENTIAL] Orders UI
- [x] Orders list page with DataTable, filters, pagination, Suspense
- [x] Order detail page with line items, financials, addresses, attribution

### [SEQUENTIAL] Customers UI
- [x] Customers list page with search, DataTable, sort, pagination
- [x] Customer detail page with stats cards, order history, address, tags/notes

### [SEQUENTIAL] Subscriptions UI
- [x] Subscriptions page (empty state with Loop integration instructions)

### [SEQUENTIAL] Reviews UI
- [x] Reviews list with card layout, star ratings, filter tabs, pagination
- [x] Individual approve/reject via ReviewActions client component
- [ ] Bulk moderation actions — Deferred

### [SEQUENTIAL] Analytics
- [x] Covered by Phase 2A dashboard KPI cards (already links to commerce pages)

---

## Definition of Done

- [x] Orders list loads with proper pagination
- [x] Order filters work (status, fulfillment, financial, search)
- [x] Order detail shows complete order information
- [x] Customers list shows lifetime value
- [x] Subscriptions page present (empty state — Loop integration deferred)
- [x] Reviews can be approved/rejected with timestamp
- [x] All queries use `withTenant()` for isolation
- [x] `pnpm turbo typecheck lint --filter=cgk-admin` passes with 0 errors
- [x] API routes return proper error responses (400 for bad input, JSON responses)
- [x] No TODO/PLACEHOLDER/FIXME comments
- [x] All files under 400 lines
- [x] Sort columns whitelisted (no SQL injection in ORDER BY)
- [x] All money displayed via `formatMoney()` (no raw cents)

---

## Deferred Items (For Future Phases)

| Item | Reason | Target Phase |
|------|--------|-------------|
| Shopify order sync | Background job needed | Phase 5 (Jobs) |
| Loop subscriptions API | External credentials required, no subscriptions table | Phase 2PO-OAUTH-INTEGRATIONS |
| Bulk review moderation | Individual moderation covers core use case | Enhancement backlog |
| Trend charts / analytics | Needs charting library + aggregation queries | Dedicated analytics phase |
| Date range picker for orders | URL date params supported, just needs date input UI | Enhancement backlog |
| Order actions (refund, cancel, fulfill) | Write operations need Shopify API integration | Phase 3 / Phase 5 |

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For DataTable, filters, and detail page layouts
- Context7 MCP: "React Query pagination patterns"
- Context7 MCP: "shadcn/ui DataTable with filters"

**RAWDOG code to reference:**
- `src/app/admin/orders/page.tsx` - Orders list pattern
- `src/app/admin/customers/page.tsx` - Customers list pattern
- `src/lib/reviews/` - Reviews management patterns
- `src/lib/subscriptions/loop-client.ts` - Loop API integration

**External APIs:**
- Loop Subscriptions API: `https://api.loopsubscriptions.com/admin/2023-10/`
- Shopify Admin API for order sync

**Spec documents:**
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Full skill invocation patterns

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - **CRITICAL**: Batch save, cache-busting, Neon pooling patterns with multi-tenant context

---

## AI Discretion Areas (Resolved)

1. DataTable component library → Custom generic `DataTable<T>` server component (simpler than @tanstack/react-table)
2. Date range picker → Deferred (URL params `dateFrom`/`dateTo` supported, UI not yet added)
3. Reviews bulk action → Deferred (individual approve/reject implemented)
4. Analytics chart library → Not needed (dashboard KPIs sufficient for now)
5. Loop API error handling → N/A (empty state, Loop integration deferred)
