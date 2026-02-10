# PHASE-2SA-ADVANCED: Super Admin Advanced Features

**Duration**: 1 week (Week 7)
**Depends On**: PHASE-2SA-ACCESS, PHASE-2SA-DASHBOARD
**Parallel With**: PHASE-2D-ADMIN-FINANCE
**Blocks**: None (enables PHASE-2PO-* phases)

---

## Goal

Implement the advanced super admin capabilities: user impersonation with full audit trail, cross-tenant operations monitoring, error explorer, service health matrix, and job monitoring. These features enable deep debugging and platform-wide visibility.

---

## Success Criteria

- [ ] Impersonation works with reason requirement and 1-hour session limit
- [ ] All impersonated actions flagged and audited
- [ ] Visual banner displays in target admin portal during impersonation
- [ ] Cross-tenant error explorer filters by tenant, severity, status
- [ ] Health matrix shows service x tenant grid
- [ ] Job monitoring displays status across all tenants

---

## Deliverables

### Impersonation System
- Impersonate user dialog with mandatory reason field
- 1-hour session limit (enforced in JWT)
- `impersonation_sessions` table population
- Impersonation token generation with `impersonator` claim
- All impersonated actions flagged in audit log
- Email notification to target user when impersonation starts

### Visual Impersonation Banner
- `apps/admin/src/components/impersonation-banner.tsx`
- Displays when `session.impersonator` is present
- Shows remaining time until session expiration
- Warning styling (yellow background, border)
- Cannot be dismissed by impersonated user

### Cross-Tenant Error Explorer
- Error list with tenant filter dropdown
- Severity filter (P1/P2/P3)
- Status filter (open/acknowledged/resolved)
- Error stats summary above table
- Error detail view with stack trace
- Tenant column in error table

### Health Matrix
- Service x Tenant grid display
- Services: Database, Redis, Shopify, Stripe, Inngest, Vercel, Email
- Per-cell status dot (healthy/degraded/unhealthy/unknown)
- Clickable cells to drill into service-tenant health
- Horizontal scroll for many tenants

### Job Monitoring
- Cross-tenant Inngest job status
- Failed jobs queue with tenant indicator
- Retry functionality for failed jobs
- Job detail view with logs
- Webhook delivery status by tenant

---

## Constraints

- Impersonation REQUIRES reason (cannot be empty string)
- Impersonation sessions MUST expire after 1 hour (no extension)
- All impersonated actions MUST include `impersonator` field in audit log
- Email notification to target user is REQUIRED (not optional)
- Error explorer MUST paginate (max 100 per page)
- Health matrix MUST handle 50+ tenants gracefully (virtualization)

---

## Pattern References

**RAWDOG code to reference:**
- `src/app/admin/ops/errors/page.tsx` - Error list patterns (if exists)
- `src/lib/analytics.ts` - Tracking pattern for impersonation events
- `src/app/admin/creators/` - Table patterns with filters

**Spec documents:**
- `SUPER-ADMIN-ARCHITECTURE-2025-02-10.md` - Impersonation flow, HealthMatrix interface
- `HEALTH-MONITORING-SPEC.md` - Health check definitions for matrix

**Email patterns:**
- Use Resend for impersonation notification email
- Template: "A platform administrator has started an impersonation session"

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Health matrix polling interval (30s vs 60s vs on-demand)
2. Error aggregation strategy (by pattern vs by stack trace hash)
3. Job monitoring: direct Inngest API vs cached summary
4. Webhook redeliver confirmation UX (modal vs inline)

---

## Tasks

### [PARALLEL] Impersonation Core
- [ ] Create `impersonateUser()` function with audit logging
- [ ] Create impersonation token generator with 1-hour expiry
- [ ] Create `POST /api/platform/users/[id]/impersonate` endpoint
- [ ] Implement impersonation session cleanup job

### [PARALLEL] Impersonation UI
- [ ] Create `ImpersonateDialog` component with reason input
- [ ] Create `ImpersonationBanner` for admin portal
- [ ] Add impersonation button to user detail page
- [ ] Create impersonation notification email template

### [PARALLEL] Error Explorer
- [ ] Create `GET /api/platform/errors` with tenant/severity/status filters
- [ ] Create `GET /api/platform/errors/[id]` for detail view
- [ ] Create `PATCH /api/platform/errors/[id]` for status updates
- [ ] Create `GET /api/platform/errors/aggregate` for pattern grouping
- [ ] Build error explorer page with filters
- [ ] Build error detail page with stack trace

### [PARALLEL] Health Matrix
- [ ] Create `GET /api/platform/health/matrix` endpoint
- [ ] Create `HealthMatrix` component with service x tenant grid
- [ ] Add per-cell drill-down functionality
- [ ] Implement health aggregation query

### [SEQUENTIAL after Error Explorer] Operations Dashboard
- [ ] Create `/ops/page.tsx` operations dashboard
- [ ] Create `/ops/errors/page.tsx` error explorer
- [ ] Create `/ops/health/page.tsx` health matrix view
- [ ] Create `/ops/jobs/page.tsx` job monitoring

### [SEQUENTIAL after Impersonation Core] Job Monitoring
- [ ] Create `GET /api/platform/jobs` endpoint (cross-tenant)
- [ ] Create `GET /api/platform/jobs/failed` endpoint
- [ ] Create `POST /api/platform/jobs/[id]/retry` endpoint
- [ ] Create `GET /api/platform/webhooks` for delivery status
- [ ] Create `POST /api/platform/webhooks/[id]/redeliver` endpoint

---

## API Routes

```
/api/platform/users/
  [id]/impersonate/route.ts   # POST start impersonation

/api/platform/errors/
  route.ts                    # GET platform errors (filtered)
  [id]/route.ts               # GET detail, PATCH status
  aggregate/route.ts          # GET aggregated by pattern

/api/platform/health/
  matrix/route.ts             # GET cross-tenant health matrix
  [service]/route.ts          # GET per-service health

/api/platform/jobs/
  route.ts                    # GET job status (cross-tenant)
  failed/route.ts             # GET failed jobs queue
  [id]/route.ts               # GET job detail
  [id]/retry/route.ts         # POST retry job

/api/platform/webhooks/
  route.ts                    # GET webhook delivery status
  [id]/redeliver/route.ts     # POST redeliver webhook
```

---

## Interfaces

### ImpersonationSession
```typescript
interface ImpersonationSession {
  id: string
  superAdminId: string
  targetUserId: string
  targetTenantId: string
  reason: string
  createdAt: Date
  expiresAt: Date  // 1 hour from creation
  endedAt?: Date   // If manually ended
}
```

### HealthMatrix
```typescript
interface HealthMatrix {
  tenants: string[]
  services: string[]
  statuses: Record<string, Record<string, HealthStatus>>
  // statuses[tenantId][serviceName] = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
}
```

### PlatformError
```typescript
interface PlatformError {
  id: string
  tenantId: string
  tenantName: string
  severity: 'p1' | 'p2' | 'p3'
  status: 'open' | 'acknowledged' | 'resolved'
  message: string
  stack?: string
  metadata: Record<string, unknown>
  occurredAt: Date
  resolvedAt?: Date
}
```

---

## Security Measures (Impersonation-Specific)

- Reason field REQUIRED and logged
- 1-hour session limit (hard limit, no extension)
- All impersonated actions include `impersonator` in audit log
- Email notification sent to target user
- Impersonation visible in target portal via banner
- Cannot impersonate another super admin

---

## Definition of Done

- [ ] Impersonation dialog enforces reason requirement
- [ ] Impersonation session expires after 1 hour
- [ ] Target user receives email notification
- [ ] Admin portal shows impersonation banner
- [ ] Error explorer filters by tenant, severity, status
- [ ] Health matrix displays all services x all tenants
- [ ] Failed jobs can be retried from UI
- [ ] All impersonated actions have `impersonator` in audit log
- [ ] `npx tsc --noEmit` passes
- [ ] E2E test: impersonate user and verify audit trail
