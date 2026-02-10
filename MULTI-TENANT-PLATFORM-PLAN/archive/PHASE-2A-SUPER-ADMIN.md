# Phase 2A: Super Admin Dashboard (Orchestrator)

**Timeline**: Weeks 5-7
**Status**: Not Started
**Depends On**: Phase 1 (Foundation)

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| SUPER-ADMIN-ARCHITECTURE | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/SUPER-ADMIN-ARCHITECTURE-2025-02-10.md` |
| PHASE-2-ADMIN (shared patterns) | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PHASE-2-ADMIN.md` |
| UI-PREVIEW | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/UI-PREVIEW-2025-02-10.md` |

---

## Overview

The Super Admin Dashboard (internally called "Orchestrator") is the master control center for platform operators. It provides cross-tenant visibility and control that transcends individual brand admin portals.

**Reference Spec**: `SUPER-ADMIN-ARCHITECTURE-2025-02-10.md`

---

## Key Distinction from Brand Admin

| Aspect | Brand Admin | Super Admin (Orchestrator) |
|--------|-------------|---------------------------|
| Scope | Single tenant | All tenants |
| Users | Brand admins, members | Platform owner only |
| Data | Tenant-isolated | Cross-tenant aggregated |
| URL | `admin.{brand}.com` | `orchestrator.platform.com` |
| Operations | Brand-specific errors/logs | Platform-wide monitoring |
| Features | Fixed per plan | Controls feature availability |

---

## Deliverables

### Week 5: Core Access Control

#### Authentication & Authorization
- [ ] Super admin user registry (`super_admin_users` table)
- [ ] MFA requirement for sensitive operations
- [ ] Super admin middleware protection
- [ ] Audit log for all super admin actions

#### Database Schema
```sql
-- Required tables (from spec)
CREATE TABLE public.super_admin_users (...)
CREATE TABLE public.super_admin_audit_log (...)
CREATE TABLE public.impersonation_sessions (...)
```

#### Success Criteria
- [ ] Super admin login working with MFA
- [ ] All orchestrator routes protected
- [ ] Audit logging capturing all actions

---

### Week 6: Dashboard & Navigation

#### Overview Dashboard
- [ ] Platform KPI cards (GMV, MRR, Active Brands)
- [ ] Brands grid with health indicators
- [ ] Real-time alert feed (WebSocket)
- [ ] System status summary

#### Navigation Structure
```
/ (Overview)
├── /brands
│   ├── /brands/new (Onboarding wizard)
│   ├── /brands/health
│   └── /brands/[id]
├── /ops
│   ├── /ops/errors
│   ├── /ops/logs
│   ├── /ops/health
│   └── /ops/jobs
├── /flags
├── /users
├── /analytics
└── /settings
```

#### Success Criteria
- [ ] Overview dashboard displaying KPIs
- [ ] Navigation between all sections working
- [ ] Brands grid showing all tenants

---

### Week 7: Advanced Features

#### Impersonation System
- [ ] Impersonate user dialog with reason requirement
- [ ] 1-hour session limit
- [ ] All impersonated actions flagged
- [ ] Visual banner in target admin portal

#### Cross-Tenant Operations
- [ ] Error explorer with tenant filter
- [ ] Health matrix (service x tenant grid)
- [ ] Job monitoring across all tenants
- [ ] Webhook delivery status

#### Success Criteria
- [ ] Impersonation working with full audit
- [ ] Cross-tenant health matrix functional
- [ ] Error explorer filtering by tenant

---

## API Routes Structure

```
/api/platform/
├── overview/
│   ├── route.ts              # GET platform KPIs
│   └── brands/route.ts       # GET all brands summary
├── brands/
│   ├── route.ts              # GET list, POST create
│   └── [id]/
│       ├── route.ts          # GET, PATCH, DELETE brand
│       ├── health/route.ts   # GET brand health
│       └── transfer/route.ts # POST transfer
├── users/
│   ├── route.ts              # GET all users
│   ├── [id]/route.ts         # GET, PATCH user
│   ├── [id]/impersonate/route.ts
│   └── super-admins/route.ts
└── settings/
    ├── route.ts              # GET, PATCH platform settings
    └── maintenance/route.ts  # POST toggle maintenance
```

---

## Page Structure

```
apps/orchestrator/src/app/
├── page.tsx                  # Overview dashboard
├── layout.tsx                # Main layout with nav
├── brands/
│   ├── page.tsx              # Brand list
│   ├── new/[...step]/page.tsx # Onboarding wizard
│   ├── health/page.tsx
│   └── [id]/page.tsx         # Brand detail
├── ops/
│   ├── page.tsx              # Operations dashboard
│   ├── errors/page.tsx
│   ├── logs/page.tsx
│   ├── health/page.tsx
│   └── jobs/page.tsx
├── users/
│   ├── page.tsx
│   └── super-admins/page.tsx
└── settings/page.tsx
```

---

## Security Measures

1. **Access Restrictions**
   - Super admin role required for all routes
   - MFA required for sensitive operations
   - IP allowlist option for production

2. **Audit Trail**
   - All actions logged with before/after state
   - Immutable audit log
   - 90-day retention minimum

3. **Session Security**
   - Short-lived sessions (4 hours)
   - Single session per user
   - Automatic logout on inactivity

4. **Rate Limiting**
   - 100 requests/minute per super admin
   - Stricter limits on sensitive endpoints

5. **Impersonation Controls**
   - Reason required
   - 1-hour session limit
   - All impersonated actions flagged
   - Email notification to target user

---

## Component Patterns

### Platform KPI Cards
```typescript
// apps/orchestrator/src/components/overview/platform-kpis.tsx
interface PlatformKPIs {
  totalGMV: { value: number; change: number }
  platformMRR: { value: number; change: number }
  totalBrands: number
  activeBrands: number
  systemStatus: 'healthy' | 'degraded' | 'critical'
  openAlerts: { p1: number; p2: number; p3: number }
}
```

### Brand Card
```typescript
interface BrandSummary {
  id: string
  name: string
  slug: string
  status: 'active' | 'paused' | 'onboarding'
  health: 'healthy' | 'degraded' | 'unhealthy'
  revenue24h: number
  orders24h: number
  errorCount24h: number
  shopifyConnected: boolean
  stripeConnected: boolean
}
```

---

## Dependencies

**Required Before Implementation:**
- Phase 1 database schema (organizations, users, sessions)
- Phase 1 authentication system
- Phase 1 core packages setup

**Can Be Parallelized With:**
- Phase 2B (Platform Operations)
- Brand Onboarding (Step 7 of onboarding spec)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Security breach via impersonation | Require MFA + reason + audit + time limit |
| Super admin credentials leaked | IP allowlist + short sessions + MFA |
| Audit log gaps | Middleware-level logging, not per-route |
| Performance with many tenants | Pagination, caching, async loading |

---

## Testing Requirements

- [ ] E2E: Super admin login with MFA
- [ ] E2E: Create new brand via onboarding
- [ ] E2E: Impersonate user and verify audit
- [ ] Unit: KPI calculations
- [ ] Unit: Health status aggregation
- [ ] Integration: Cross-tenant queries

---

## Definition of Done

- [ ] Super admin can log in with MFA
- [ ] Overview dashboard shows all KPIs
- [ ] Brands grid displays all tenants with health
- [ ] Impersonation works with full audit trail
- [ ] All routes protected by super admin middleware
- [ ] Audit log captures all actions
- [ ] Navigation between all sections works
