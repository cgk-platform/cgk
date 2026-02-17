# CGK Platform - Comprehensive Gap Analysis Report
> **Generated**: 2026-02-16
> **Auditors**: 10 parallel agents
> **Scope**: All phases (1A-8)

---

## EXECUTIVE SUMMARY

| Area | Completion | Critical Gaps |
|------|------------|---------------|
| **Foundation (Packages)** | 95% | Minor - production ready |
| **Admin App** | 95% | Minor - production ready |
| **Team/RBAC** | 95% | Minor - permission consistency |
| **Jobs/Tasks** | 95% | Minor - timeout configs |
| **Communications** | 85% | **CRITICAL** - tenant isolation broken |
| **Orchestrator** | 85% | **CRITICAL** - onboarding wizard missing |
| **Storefront** | 75% | **CRITICAL** - analytics empty, blocks missing |
| **Creator Portal** | 75% | **CRITICAL** - brand context, payments |
| **Platform Ops** | 70% | **CRITICAL** - logging UI, onboarding |
| **MCP Server** | 55% | **CRITICAL** - tenant isolation, handlers |

**Overall Platform Readiness**: ~80% - Several critical gaps blocking production

---

## CRITICAL ISSUES (Must Fix Before Production)

### 1. TENANT ISOLATION VIOLATIONS

#### 1A. Communications - Sender Domain Tables (SEVERITY: P0 - DATA LEAK)
**Files**: `/packages/db/src/migrations/tenant/009_email_sender.sql`
**Problem**: `tenant_email_domains`, `tenant_sender_addresses`, `tenant_notification_routing` tables MISSING `tenant_id` column
**Impact**: Tenants can see/modify each other's email configuration
**Fix**: Add `tenant_id` column with proper FK and unique constraints

#### 1B. Communications - Missing withTenant() Wrappers (SEVERITY: P0)
**Files**: `packages/communications/src/sender/domains.ts`, `addresses.ts`, `routing.ts`
**Problem**: Queries not wrapped in `withTenant()`, no tenantId parameter
**Fix**: Add tenantId param and withTenant() wrapper to all functions

#### 1C. MCP Server - Tenant Context Injection (SEVERITY: P0 - DATA LEAK)
**Files**: `apps/mcp-server/src/app/api/mcp/route.ts`, `packages/mcp/src/tools/*.ts`
**Problem**: Tool handlers expect `_tenantId` from client args instead of injecting from auth
**Impact**: Malicious clients could access other tenants' data
**Fix**: Create context injection mechanism from MCPHandler to tool handlers

---

### 2. MISSING/PLACEHOLDER UI PAGES

#### 2A. Brand Onboarding Wizard (SEVERITY: P0 - BLOCKING)
**Location**: `/apps/orchestrator/src/app/(dashboard)/brands/new/`
**Current State**: Single placeholder page saying "This page will contain a step-by-step wizard..."
**Required**: 9 wizard step pages with forms, validation, Shopify OAuth, domain setup
**Impact**: Cannot create new tenants through UI

#### 2B. Logging UI (SEVERITY: P1)
**Location**: `/apps/orchestrator/src/app/(dashboard)/ops/logs/`
**Current State**: Placeholder text only
**Required**: Log explorer with filters, search, virtual scrolling, error aggregates
**Missing API Routes**: `/api/platform/logs`, `/api/platform/logs/stream`, `/api/platform/logs/aggregates`

#### 2C. Error Detail Page (SEVERITY: P1)
**Location**: `/apps/orchestrator/src/app/(dashboard)/ops/errors/[id]/`
**Problem**: Error list links to detail page that doesn't exist (404)
**Fix**: Create error detail page

#### 2D. Platform Settings (SEVERITY: P1)
**Location**: `/apps/orchestrator/src/app/(dashboard)/settings/`
**Current State**: Placeholder text only
**Required**: IP allowlist, security settings, platform config

---

### 3. MISSING ANALYTICS TRACKING (SEVERITY: P1)

#### 3A. Storefront Analytics Module
**Location**: `/apps/storefront/src/lib/analytics/` - EMPTY DIRECTORY
**Required**:
- `ga4.ts` - Google Analytics 4 tracking
- `meta.ts` - Meta/Facebook Pixel
- `tiktok.ts` - TikTok Pixel
- trackViewItem, trackAddToCart, trackBeginCheckout, trackPurchase events

**Impact**: Phase 3C Definition of Done requires "GA4 receives add_to_cart event" - NOT MET

---

### 4. MCP SERVER INCOMPLETE (SEVERITY: P1)

#### 4A. Tool Handlers Empty
**Files**: `packages/mcp/src/tools/commerce.ts`, `analytics.ts`, `creators.ts`, `system.ts`
**Status**: 76 tools defined, only ~34 functional (45%)
**Fix**: Implement remaining tool handlers with actual database queries

#### 4B. OAuth/Claude Connector Missing
**Required Files**:
- `/api/mcp/oauth/authorize/route.ts`
- `/api/mcp/oauth/token/route.ts`
- `/api/mcp/manifest/route.ts`
**Impact**: Cannot integrate with Claude Connector

#### 4C. Rate Limiting Missing
**Required**: `packages/mcp/src/rate-limit.ts`
**Impact**: Unlimited API usage, no cost protection

#### 4D. Content Tools Missing
**Status**: Entire category not implemented (0 of ~10 planned)

---

### 5. CREATOR PORTAL GAPS (SEVERITY: P1)

#### 5A. Brand Context Not Threaded
**Problem**: Dashboard/APIs don't filter by selected brand
**Files**: All creator portal API routes
**Fix**: Add brand selector, pass context to all queries

#### 5B. Payment Provider Integration
**Problem**: Stripe Connect and Wise provider classes not found
**Expected**: `/packages/payments/src/providers/stripe.ts`, `wise.ts`
**Impact**: Withdrawals can't execute

#### 5C. PDF Signing
**Problem**: No PDF library integration for e-signature placement
**Fix**: Add pdf-lib, implement signature positioning

---

### 6. STOREFRONT BLOCK COMPONENTS (SEVERITY: P2)

**Registry**: 73 block types defined in `src/components/blocks/registry.ts`
**Implemented**: Only 12 components (~16%)
**Missing**: 61 block components (84%)

Priority blocks to implement:
- PDP blocks (15+): pdp-hero, pdp-trust-badges, pdp-reviews
- Promo blocks: bundle-builder, promo-hero
- Shop blocks (5+)
- Policy/About blocks (10+)

---

## MEDIUM PRIORITY ISSUES

### 7. PERMISSION ENFORCEMENT INCONSISTENCY
**Files**: `/apps/admin/src/app/api/admin/team/*.ts`
**Problem**: Uses legacy role checks instead of RBAC `checkPermissionOrRespond()`
**Impact**: RBAC system exists but not enforced on team management

### 8. KPI CALCULATION INCOMPLETE
**File**: `/apps/orchestrator/src/app/api/platform/overview/route.ts`
**Problem**: GMV/MRR are estimates, only queries first 10 tenants
**Fix**: Proper aggregation across all tenants

### 9. HEALTH DATA NOT AUTO-COLLECTED
**Problem**: Health matrix UI exists but `platform_health_matrix` not populated
**Fix**: Add scheduled job to run health checks and populate table

### 10. IMPERSONATION BANNER MISSING
**Location**: `apps/admin/src/components/impersonation-banner.tsx`
**Problem**: Super admin impersonation works but impersonated user sees no indication
**Fix**: Create banner component showing "You are being monitored by [super admin]"

### 11. CUSTOM DOMAIN LOOKUP COMMENTED OUT
**File**: `/apps/storefront/src/middleware.ts` lines 118-136
**Problem**: Domain-to-tenant lookup API call is commented out
**Fix**: Uncomment and implement `/api/internal/domain-lookup`

---

## DEFERRED ITEMS (Acceptable)

These were intentionally deferred and don't block production:

1. SMS UI components (backend ready)
2. Queue management unified UI
3. Inbound email dashboard UI
4. Unit tests for team management
5. E2E tests for context switching
6. URL-based tenant context (cookie-based works)
7. Shopify OAuth webhook auto-registration

---

## FIX PRIORITY ORDER

### P0 - Critical Security/Data Issues (Fix Immediately)
1. Communications tenant isolation (sender tables + withTenant)
2. MCP tenant context injection

### P1 - Critical Functionality (Fix Before Launch)
3. Brand onboarding wizard UI (9 pages)
4. Storefront analytics module
5. MCP tool handler implementations
6. Creator portal brand context
7. Logging API routes + UI
8. Error detail page
9. MCP OAuth endpoints
10. MCP rate limiting

### P2 - Important Functionality
11. Payment provider integration (Stripe/Wise)
12. Creator PDF signing
13. Platform settings page
14. Permission enforcement consistency
15. Health data collection job
16. Impersonation banner

### P3 - Enhancement
17. Storefront block components (61 missing)
18. KPI calculation improvements
19. Custom domain lookup

---

## ESTIMATED EFFORT

| Priority | Items | Estimated Hours |
|----------|-------|-----------------|
| P0 | 2 | 4-6 hours |
| P1 | 8 | 40-60 hours |
| P2 | 6 | 20-30 hours |
| P3 | 3 | 30-40 hours |
| **TOTAL** | 19 | **~100-140 hours** |

With parallel agents: **3-5 days intensive work**

---

## NEXT STEPS

1. **Immediate**: Fix P0 tenant isolation issues
2. **Day 1-2**: Fix P1 critical functionality
3. **Day 3-4**: Fix P2 important functionality
4. **Day 5+**: Enhancement work (P3)

---

## FILES TO CREATE/MODIFY

### New Files Needed:
```
apps/orchestrator/src/app/(dashboard)/brands/new/wizard/
├── layout.tsx
├── step-1/page.tsx (Basic Info)
├── step-2/page.tsx (Shopify OAuth)
├── step-3/page.tsx (Domains)
├── step-4/page.tsx (Payments)
├── step-5/page.tsx (Integrations)
├── step-6/page.tsx (Features)
├── step-7/page.tsx (Products)
├── step-8/page.tsx (Users)
└── step-9/page.tsx (Launch)

apps/orchestrator/src/app/(dashboard)/ops/errors/[id]/page.tsx
apps/orchestrator/src/app/api/platform/logs/route.ts
apps/orchestrator/src/app/api/platform/logs/stream/route.ts
apps/orchestrator/src/app/api/platform/logs/aggregates/route.ts

apps/storefront/src/lib/analytics/
├── index.ts
├── ga4.ts
├── meta.ts
└── tiktok.ts

apps/mcp-server/src/app/api/mcp/oauth/authorize/route.ts
apps/mcp-server/src/app/api/mcp/oauth/token/route.ts
apps/mcp-server/src/app/api/mcp/manifest/route.ts
packages/mcp/src/rate-limit.ts

apps/admin/src/components/impersonation-banner.tsx
```

### Files to Fix:
```
packages/db/src/migrations/tenant/009_email_sender.sql (add tenant_id)
packages/communications/src/sender/domains.ts (add withTenant)
packages/communications/src/sender/addresses.ts (add withTenant)
packages/communications/src/sender/routing.ts (add withTenant)
apps/mcp-server/src/app/api/mcp/route.ts (inject tenant context)
packages/mcp/src/tools/commerce.ts (implement handlers)
packages/mcp/src/tools/analytics.ts (implement handlers)
packages/mcp/src/tools/creators.ts (implement handlers)
packages/mcp/src/tools/system.ts (implement handlers)
apps/storefront/src/middleware.ts (uncomment domain lookup)
apps/admin/src/app/api/admin/team/*.ts (use checkPermissionOrRespond)
```
