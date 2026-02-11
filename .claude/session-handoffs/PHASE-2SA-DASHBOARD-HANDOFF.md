# PHASE-2SA-DASHBOARD Handoff Document

**Date**: 2026-02-10
**Phase**: 2SA-DASHBOARD - Super Admin Overview Dashboard
**Status**: COMPLETE

---

## Summary

Successfully implemented the Super Admin Overview Dashboard for the CGK Orchestrator app. This provides platform operators with real-time visibility into GMV, MRR, brand health, system status, and alerts.

---

## What Was Built

### 1. Type Definitions

Created `/apps/orchestrator/src/types/platform.ts` with interfaces for:
- `PlatformKPIs` - All 11 key metrics (GMV, MRR, brands, alerts, error rate, latency, uptime, jobs)
- `BrandSummary` - Brand card data with health, status, metrics, integrations
- `PlatformAlert` - Alert data with priority, status, timestamps
- `SystemHealth` - Component-level health status
- `PaginatedBrands` - Paginated response type
- `NavItem` - Sidebar navigation structure

### 2. Core UI Components

**Status Components:**
- `StatusDot` - Health indicator dot with animations (`/components/ui/status-dot.tsx`)
- `ConnectionStatus` - WebSocket/SSE connection indicator

**Dashboard Components:**
- `KPICard` - Individual KPI metric card with trend indicators (`/components/dashboard/kpi-card.tsx`)
- `StatusKPICard` - System status focused card
- `AlertsKPICard` - Alert priority breakdown card
- `PlatformKPIsGrid` - 6-card grid with responsive layout (`/components/dashboard/platform-kpis.tsx`)
- `SecondaryMetrics` - Additional 4 metrics row (error rate, latency, jobs)
- `BrandCard` - Brand card with health, status, metrics, integrations (`/components/dashboard/brand-card.tsx`)
- `BrandsGrid` - Paginated grid with loading/empty states (`/components/dashboard/brands-grid.tsx`)
- `AlertFeed` - Real-time alert feed with SSE support (`/components/dashboard/alert-feed.tsx`)

**Navigation:**
- `Sidebar` - Responsive sidebar with 7 nav sections (`/components/nav/sidebar.tsx`)
  - Collapsible on desktop (icon-only mode)
  - Slide-out drawer on mobile
  - MFA-locked sections
  - User section with logout

### 3. API Routes

**Platform Overview:**
- `GET /api/platform/overview` - Platform KPIs aggregation
  - Aggregates GMV/MRR across tenant schemas using `withTenant()`
  - Counts organizations by status
  - Calculates error rate from audit log
  - 30-second cache with `createGlobalCache()`

- `GET /api/platform/overview/brands` - Paginated brands list
  - Supports filtering by status (active/paused/onboarding)
  - Search by name or slug
  - Fetches per-tenant metrics via `withTenant()`
  - Calculates health from error counts
  - 30-second cache

**Alerts:**
- `GET /api/platform/alerts` - List platform alerts
- `POST /api/platform/alerts` - Create new alert
- `GET /api/platform/alerts/stream` - Server-Sent Events for real-time updates
  - SSE instead of WebSocket (Edge runtime limitation)
  - 5-second polling interval
  - Heartbeat to keep connection alive

**Health:**
- `GET /api/platform/health` - Master health status
  - Checks database, cache, Shopify, Stripe, jobs
  - Aggregates component statuses
  - 10-second cache

### 4. Pages

**Dashboard Layout:**
- `(dashboard)/layout.tsx` - Wraps all dashboard pages with sidebar
  - Gets MFA status from middleware headers
  - Passes user context to sidebar

**Overview Dashboard:**
- `(dashboard)/page.tsx` - Main dashboard
  - Platform KPIs grid
  - Secondary metrics
  - Brands grid (8 per page on dashboard)
  - Alert feed sidebar

**Brands:**
- `(dashboard)/brands/page.tsx` - All brands list with filters
- `(dashboard)/brands/[id]/page.tsx` - Brand detail with metrics
- `(dashboard)/brands/health/page.tsx` - Health overview (placeholder)
- `(dashboard)/brands/new/page.tsx` - Create brand wizard (placeholder)

**Operations:**
- `(dashboard)/ops/page.tsx` - Operations overview with section links
- `(dashboard)/ops/errors/page.tsx` - Errors (placeholder)
- `(dashboard)/ops/logs/page.tsx` - Logs (placeholder)
- `(dashboard)/ops/health/page.tsx` - Real-time system health status
- `(dashboard)/ops/jobs/page.tsx` - Jobs (placeholder)

**Other Sections:**
- `(dashboard)/flags/page.tsx` - Feature flags (placeholder)
- `(dashboard)/analytics/page.tsx` - Analytics (placeholder)
- `(dashboard)/settings/page.tsx` - Settings (placeholder)

---

## Key Technical Decisions

1. **SSE over WebSocket**: Next.js Edge runtime doesn't support native WebSocket. Used Server-Sent Events with polling as fallback for real-time alerts.

2. **Cache Strategy**: Used `createGlobalCache()` from `@cgk/db` with:
   - 30-second TTL for KPIs and brands
   - 10-second TTL for health checks
   - Cache keys include query params for filtered lists

3. **Cross-Tenant Queries**: Used `withTenant()` wrapper for all tenant-scoped queries when aggregating metrics. Never used raw sql without tenant context for tenant data.

4. **Responsive Design**:
   - Sidebar: Fixed on desktop (lg:), slide-out on mobile
   - KPI grid: 6 cols (xl:), 3 cols (md:), 2 cols (mobile)
   - Brands grid: 4 cols (xl:), 2 cols (md:), 1 col (mobile)

5. **Route Groups**: Used `(dashboard)` route group to apply sidebar layout to protected pages while keeping auth pages (`(auth)`) separate.

---

## Dependencies Added

- `lucide-react: ^0.468.0` - Icons for navigation and UI

---

## Verification

All checks pass:
```bash
cd /Users/holdenthemic/Documents/cgk/apps/orchestrator && npx tsc --noEmit
# No errors

cd /Users/holdenthemic/Documents/cgk/apps/orchestrator && pnpm lint
# No errors
```

---

## What to Do Next (PHASE-2SA-ADVANCED)

1. **Impersonation System**: Build user impersonation with audit logging
2. **Feature Flags UI**: Full CRUD for feature flags with tenant targeting
3. **Brand Onboarding Wizard**: Complete the `/brands/new` page
4. **Real WebSocket**: Consider using a WebSocket service (Pusher, Ably) for true real-time

---

## Files Created

### Types
- `/apps/orchestrator/src/types/platform.ts`

### Components
- `/apps/orchestrator/src/components/ui/status-dot.tsx`
- `/apps/orchestrator/src/components/dashboard/kpi-card.tsx`
- `/apps/orchestrator/src/components/dashboard/platform-kpis.tsx`
- `/apps/orchestrator/src/components/dashboard/brand-card.tsx`
- `/apps/orchestrator/src/components/dashboard/brands-grid.tsx`
- `/apps/orchestrator/src/components/dashboard/alert-feed.tsx`
- `/apps/orchestrator/src/components/nav/sidebar.tsx`

### API Routes
- `/apps/orchestrator/src/app/api/platform/overview/route.ts`
- `/apps/orchestrator/src/app/api/platform/overview/brands/route.ts`
- `/apps/orchestrator/src/app/api/platform/health/route.ts`
- `/apps/orchestrator/src/app/api/platform/alerts/route.ts`
- `/apps/orchestrator/src/app/api/platform/alerts/stream/route.ts`

### Pages
- `/apps/orchestrator/src/app/(dashboard)/layout.tsx`
- `/apps/orchestrator/src/app/(dashboard)/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/brands/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/brands/[id]/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/brands/health/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/brands/new/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/ops/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/ops/errors/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/ops/logs/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/ops/health/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/ops/jobs/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/flags/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/analytics/page.tsx`
- `/apps/orchestrator/src/app/(dashboard)/settings/page.tsx`

### Modified
- `/apps/orchestrator/src/app/layout.tsx` - Removed old sidebar
- `/apps/orchestrator/package.json` - Added lucide-react
- `/MULTI-TENANT-PLATFORM-PLAN/phases/PHASE-2SA-DASHBOARD.md` - Marked complete

---

## Architecture Notes

The dashboard follows the pattern:
1. Layout fetches auth context from middleware headers
2. Dashboard pages are client components that fetch data on mount
3. API routes check `x-is-super-admin` header from middleware
4. All tenant data uses `withTenant()` for proper schema isolation
5. Caching uses `createGlobalCache()` for platform-wide data
