# Phase 2B Handoff: Admin Commerce

## Status: COMPLETE

## Summary

Built the Commerce section of the admin portal: Orders (list + detail), Customers (list + detail), Subscriptions (empty state), Reviews (list + moderation). Includes reusable shared components (DataTable, Pagination, StatusBadges, EmptyState, SearchInput) and two API routes for review moderation.

## Completed Tasks

### Lib Layer (2 files)
- `src/lib/format.ts` - `formatMoney(cents, currency)` via Intl.NumberFormat, `formatDate()`, `formatDateTime()`
- `src/lib/search-params.ts` - `PaginationParams`, `OrderFilters`, `CustomerFilters`, `ReviewFilters` interfaces + `parseOrderFilters()`, `parseCustomerFilters()`, `parseReviewFilters()` + `buildFilterUrl()` for URL-based navigation

### Shared Commerce Components (5 files)
- `src/components/commerce/data-table.tsx` - Generic `DataTable<T>` with typed `Column<T>[]` config, sortable Link headers preserving filter params, arrow indicators
- `src/components/commerce/pagination.tsx` - "Showing X-Y of Z results", prev/next + page number Links with ellipsis, filter-preserving URLs
- `src/components/commerce/status-badge.tsx` - `OrderStatusBadge`, `FulfillmentBadge`, `FinancialBadge`, `ReviewStatusBadge` mapping statuses to Badge variants (warning, success, destructive, info, outline)
- `src/components/commerce/empty-state.tsx` - Reusable Card with LucideIcon, title, description, optional action button
- `src/components/commerce/search-input.tsx` - `'use client'` component with 300ms debounced `router.replace()`, preserves other URL params, resets page on search

### Commerce Pages (9 files)
- `src/app/admin/commerce/layout.tsx` - Thin `<div className="space-y-6">` wrapper
- `src/app/admin/commerce/page.tsx` - `redirect('/admin/commerce/orders')`
- `src/app/admin/commerce/orders/page.tsx` - Orders list with filter bar (status/fulfillment/financial Link-based filters + SearchInput), Suspense-wrapped DataTable, parameterized SQL with whitelisted sort columns, pagination
- `src/app/admin/commerce/orders/[id]/page.tsx` - 2-col grid: line items table, financial summary (subtotal/discount/shipping/tax/total), notes+tags, customer card, shipping/billing addresses, UTM attribution
- `src/app/admin/commerce/customers/page.tsx` - Customers list with SearchInput, DataTable (name/email/phone/orders/lifetime value/since), sortable columns, pagination
- `src/app/admin/commerce/customers/[id]/page.tsx` - Customer detail with 3 stat cards (orders/LTV/member since), default address, order history table, notes+tags
- `src/app/admin/commerce/subscriptions/page.tsx` - EmptyState with RefreshCw icon, Loop integration setup instructions, link to /admin/settings/integrations
- `src/app/admin/commerce/reviews/page.tsx` - Review cards with star ratings, status/verified badges, product title, author info, admin response display; filter tabs (All/Pending/Approved/Rejected) + rating + verified filters; Suspense + pagination
- `src/app/admin/commerce/reviews/review-actions.tsx` - `'use client'` component: approve/reject buttons, fetch to /api/admin/reviews/{id}/moderate, router.refresh() on success

### API Routes (2 files)
- `src/app/api/admin/reviews/[id]/moderate/route.ts` - POST: validates action (approve/reject/spam), maps to review_status enum, updates via `withTenant()` + parameterized SQL
- `src/app/api/admin/reviews/[id]/respond/route.ts` - POST: validates response_body, resolves author name via `getUserById()`, updates response fields via `withTenant()`

## Verification

- `pnpm turbo typecheck --filter=cgk-admin` - PASSES (0 errors)
- `pnpm turbo lint --filter=cgk-admin` - PASSES (0 errors)
- All 7 page routes exist: /admin/commerce, /admin/commerce/orders, /admin/commerce/orders/[id], /admin/commerce/customers, /admin/commerce/customers/[id], /admin/commerce/subscriptions, /admin/commerce/reviews
- Both API routes exist: POST /api/admin/reviews/[id]/moderate, POST /api/admin/reviews/[id]/respond
- All SQL calls wrapped in `withTenant()` - tenant isolation verified
- Sort columns whitelisted in ORDER_SORT_COLUMNS / CUSTOMER_SORT_COLUMNS maps - no user-controlled SQL injection
- All monetary values displayed via `formatMoney()` - no raw cents exposed
- No TODO, PLACEHOLDER, or FIXME comments
- All files under 400 lines (largest: orders/page.tsx at 314)

## Key Patterns Used

- Server components for all reads - pages read searchParams, query DB via `withTenant()`, render server-side
- Suspense boundaries with skeleton fallbacks for async data loaders
- URL-based pagination/filtering via `?page=N&limit=M&status=X&sort=col&dir=asc` - all navigation via `<Link>` tags
- Parameterized SQL with `sql.query()` for dynamic WHERE clauses
- Money stored as INTEGER cents, displayed via `formatMoney(cents, currency)` using Intl.NumberFormat
- `'use client'` only where required: SearchInput (debounce), ReviewActions (fetch+refresh)
- API routes with `export const dynamic = 'force-dynamic'`, tenant from x-tenant-slug header

## New Files (18 total in apps/admin/)

```
src/lib/format.ts
src/lib/search-params.ts
src/components/commerce/data-table.tsx
src/components/commerce/pagination.tsx
src/components/commerce/status-badge.tsx
src/components/commerce/empty-state.tsx
src/components/commerce/search-input.tsx
src/app/admin/commerce/layout.tsx
src/app/admin/commerce/page.tsx
src/app/admin/commerce/orders/page.tsx
src/app/admin/commerce/orders/[id]/page.tsx
src/app/admin/commerce/customers/page.tsx
src/app/admin/commerce/customers/[id]/page.tsx
src/app/admin/commerce/subscriptions/page.tsx
src/app/admin/commerce/reviews/page.tsx
src/app/admin/commerce/reviews/review-actions.tsx
src/app/api/admin/reviews/[id]/moderate/route.ts
src/app/api/admin/reviews/[id]/respond/route.ts
```

### Modified Files
```
CLAUDE.md (phase status: 2B → Complete)
```

## Next Phase: 2C

Phase 2C builds on the admin commerce section. The DataTable, Pagination, StatusBadge, EmptyState, and SearchInput components are all reusable for future admin pages. The format.ts and search-params.ts utilities are available for any new list pages.
