# Super Admin Dashboard Architecture

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Platform-level control center for multi-tenant orchestration

---

## Overview

The Super Admin Dashboard (internally called "Orchestrator") is the master control center exclusively for the platform owner. It provides platform-wide visibility and control that transcends individual brand admin portals.

### Key Distinction from Brand Admin

| Aspect | Brand Admin | Super Admin (Orchestrator) |
|--------|-------------|---------------------------|
| Scope | Single tenant | All tenants |
| Users | Brand admins, members | Platform owner only |
| Data | Tenant-isolated | Cross-tenant aggregated |
| URL | `admin.{brand}.com` | `orchestrator.platform.com` |
| Operations | Brand-specific errors/logs | Platform-wide monitoring |
| Features | Fixed per plan | Controls feature availability |

---

## Access Control

### Super Admin Role

```typescript
// packages/auth/src/roles.ts
export const ROLES = {
  superadmin: {
    level: 0, // Highest privilege
    permissions: ['*'],
    canAccessAllTenants: true,
    canCreateTenants: true,
    canModifyBilling: true,
    canImpersonate: true,
  },
  admin: {
    level: 1,
    permissions: ['read:*', 'write:*', 'delete:content'],
    canAccessAllTenants: false,
    canCreateTenants: false,
    canModifyBilling: false,
    canImpersonate: false,
  },
  member: {
    level: 2,
    permissions: ['read:*', 'write:content'],
    canAccessAllTenants: false,
    canCreateTenants: false,
    canModifyBilling: false,
    canImpersonate: false,
  },
} as const
```

### Database Schema

```sql
-- Super admin registry (separate from regular user roles)
CREATE TABLE public.super_admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES public.users(id),
  notes TEXT,

  -- MFA required for super admin
  mfa_verified_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ
);

-- Audit log for all super admin actions
CREATE TABLE public.super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  tenant_id UUID REFERENCES public.organizations(id),

  -- Details
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.super_admin_audit_log(user_id);
CREATE INDEX idx_audit_tenant ON public.super_admin_audit_log(tenant_id);
CREATE INDEX idx_audit_action ON public.super_admin_audit_log(action);
CREATE INDEX idx_audit_time ON public.super_admin_audit_log(created_at DESC);
```

### Middleware Protection

```typescript
// apps/orchestrator/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, isSuperAdmin } from '@repo/auth'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value

  if (!token) {
    return NextResponse.redirect('/login')
  }

  try {
    const payload = await verifyJWT(token)

    // Super admin verification
    if (!await isSuperAdmin(payload.sub)) {
      return NextResponse.redirect('/unauthorized')
    }

    // MFA check for sensitive operations
    const sensitiveRoutes = ['/brands/new', '/users/impersonate', '/settings']
    if (sensitiveRoutes.some(r => req.nextUrl.pathname.startsWith(r))) {
      if (!payload.mfaVerified) {
        return NextResponse.redirect('/mfa-challenge')
      }
    }

    // Audit all requests
    await logSuperAdminAccess(payload.sub, req.nextUrl.pathname, req.method)

    return NextResponse.next()
  } catch {
    return NextResponse.redirect('/login')
  }
}

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico|login|unauthorized).*)'],
}
```

---

## Dashboard Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR (Super Admin Dashboard)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Overview Dashboard                                                   │ │
│ │ ├── Platform KPIs (GMV, Active Brands, MRR)                         │ │
│ │ ├── All brands summary grid                                         │ │
│ │ ├── System health status (aggregated)                               │ │
│ │ ├── Active alerts (platform-wide)                                   │ │
│ │ └── Recent activity feed                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Brand Management                                                     │ │
│ │ ├── Brand list with health indicators                               │ │
│ │ ├── Create new brand (onboarding wizard)                            │ │
│ │ ├── Edit brand settings (all configs)                               │ │
│ │ ├── View brand metrics and health                                   │ │
│ │ ├── Transfer brand (ownership change)                               │ │
│ │ └── Archive/delete brand                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Operations Center                                                    │ │
│ │ ├── Real-time error stream (all tenants)                            │ │
│ │ ├── Error explorer with tenant filter                               │ │
│ │ ├── Failed Inngest jobs queue                                       │ │
│ │ ├── Webhook delivery status                                         │ │
│ │ ├── API latency monitoring                                          │ │
│ │ ├── Service health matrix (per-tenant)                              │ │
│ │ └── Performance analytics                                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Feature Flags                                                        │ │
│ │ ├── Global flags (apply to all tenants)                             │ │
│ │ ├── Per-tenant flag overrides                                       │ │
│ │ ├── Percentage rollouts                                             │ │
│ │ ├── Scheduled flags                                                 │ │
│ │ ├── A/B test integration                                            │ │
│ │ └── Flag audit history                                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ User Management                                                      │ │
│ │ ├── All platform users (cross-tenant view)                          │ │
│ │ ├── Role assignments and permissions                                │ │
│ │ ├── Access/session logs                                             │ │
│ │ ├── User impersonation (with audit)                                 │ │
│ │ └── Bulk operations                                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Platform Settings                                                    │ │
│ │ ├── Global configuration                                            │ │
│ │ ├── Integration credentials (Stripe, Shopify app)                   │ │
│ │ ├── Billing and plan management                                     │ │
│ │ ├── Maintenance mode toggle                                         │ │
│ │ └── Platform version/deployment info                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Navigation Structure

```typescript
// apps/orchestrator/src/lib/navigation.ts
export const orchestratorNavigation = [
  {
    name: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Brands',
    icon: Building2,
    children: [
      { name: 'All Brands', href: '/brands' },
      { name: 'Create Brand', href: '/brands/new' },
      { name: 'Brand Health', href: '/brands/health' },
      { name: 'Transfers', href: '/brands/transfers' },
    ],
  },
  {
    name: 'Operations',
    icon: Activity,
    children: [
      { name: 'Dashboard', href: '/ops' },
      { name: 'Errors', href: '/ops/errors' },
      { name: 'Logs', href: '/ops/logs' },
      { name: 'Health', href: '/ops/health' },
      { name: 'Jobs', href: '/ops/jobs' },
      { name: 'Webhooks', href: '/ops/webhooks' },
      { name: 'Performance', href: '/ops/performance' },
    ],
  },
  {
    name: 'Feature Flags',
    icon: Flag,
    children: [
      { name: 'All Flags', href: '/flags' },
      { name: 'Create Flag', href: '/flags/new' },
      { name: 'Rollouts', href: '/flags/rollouts' },
      { name: 'Audit Log', href: '/flags/audit' },
    ],
  },
  {
    name: 'Users',
    icon: Users,
    children: [
      { name: 'All Users', href: '/users' },
      { name: 'Super Admins', href: '/users/super-admins' },
      { name: 'Access Logs', href: '/users/access-logs' },
      { name: 'Sessions', href: '/users/sessions' },
    ],
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    children: [
      { name: 'Platform Metrics', href: '/analytics' },
      { name: 'Revenue', href: '/analytics/revenue' },
      { name: 'Growth', href: '/analytics/growth' },
      { name: 'Costs', href: '/analytics/costs' },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Platform', href: '/settings' },
      { name: 'Integrations', href: '/settings/integrations' },
      { name: 'Billing', href: '/settings/billing' },
      { name: 'Maintenance', href: '/settings/maintenance' },
    ],
  },
]
```

---

## Overview Dashboard Components

### Platform KPI Cards

```typescript
// apps/orchestrator/src/components/overview/platform-kpis.tsx
interface PlatformKPIs {
  // Revenue
  totalGMV: { value: number; change: number }
  platformMRR: { value: number; change: number }

  // Brands
  totalBrands: number
  activeBrands: number

  // Health
  systemStatus: 'healthy' | 'degraded' | 'critical'
  openAlerts: { p1: number; p2: number; p3: number }

  // Operations
  errorRate24h: number
  avgLatency: number
  uptimePercent: number

  // Jobs
  pendingJobs: number
  failedJobs24h: number
}

export function PlatformKPICards({ kpis }: { kpis: PlatformKPIs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <KPICard
        title="Total GMV"
        value={formatCurrency(kpis.totalGMV.value)}
        change={kpis.totalGMV.change}
        trend="revenue"
      />
      <KPICard
        title="Platform MRR"
        value={formatCurrency(kpis.platformMRR.value)}
        change={kpis.platformMRR.change}
        trend="revenue"
      />
      <KPICard
        title="Active Brands"
        value={`${kpis.activeBrands} / ${kpis.totalBrands}`}
        icon={Building2}
      />
      <KPICard
        title="System Status"
        value={kpis.systemStatus}
        status={kpis.systemStatus}
        icon={Activity}
      />
      <KPICard
        title="Open Alerts"
        value={kpis.openAlerts.p1 + kpis.openAlerts.p2 + kpis.openAlerts.p3}
        breakdown={kpis.openAlerts}
        icon={AlertTriangle}
      />
      <KPICard
        title="Uptime"
        value={`${kpis.uptimePercent.toFixed(2)}%`}
        icon={Clock}
      />
    </div>
  )
}
```

### Brands Grid

```typescript
// apps/orchestrator/src/components/overview/brands-grid.tsx
interface BrandSummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  status: 'active' | 'paused' | 'onboarding'
  health: 'healthy' | 'degraded' | 'unhealthy'

  // Metrics
  revenue24h: number
  orders24h: number
  errorCount24h: number

  // Integration status
  shopifyConnected: boolean
  stripeConnected: boolean
}

export function BrandsGrid({ brands }: { brands: BrandSummary[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {brands.map(brand => (
        <BrandCard key={brand.id} brand={brand} />
      ))}
    </div>
  )
}

function BrandCard({ brand }: { brand: BrandSummary }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-3">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt={brand.name} className="w-10 h-10 rounded" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
            {brand.name[0]}
          </div>
        )}
        <div>
          <CardTitle className="text-base">{brand.name}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusDot status={brand.health} />
            <span>{brand.slug}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Revenue</p>
            <p className="font-medium">{formatCurrency(brand.revenue24h)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Orders</p>
            <p className="font-medium">{brand.orders24h}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Errors</p>
            <p className={cn(
              "font-medium",
              brand.errorCount24h > 10 && "text-red-600"
            )}>
              {brand.errorCount24h}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Badge variant={brand.shopifyConnected ? "success" : "outline"}>
            Shopify
          </Badge>
          <Badge variant={brand.stripeConnected ? "success" : "outline"}>
            Stripe
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/brands/${brand.id}`} className="text-sm text-primary">
          View Details →
        </Link>
      </CardFooter>
    </Card>
  )
}
```

### Real-Time Alert Feed

```typescript
// apps/orchestrator/src/components/overview/alert-feed.tsx
'use client'

import { useEffect, useState } from 'react'

export function AlertFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    // WebSocket connection for real-time alerts
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/alerts`)

    ws.onmessage = (event) => {
      const alert = JSON.parse(event.data)
      setAlerts(prev => [alert, ...prev.slice(0, 49)])
    }

    return () => ws.close()
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Alerts</CardTitle>
        <Badge variant="outline" className="animate-pulse">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          Connected
        </Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {alerts.map(alert => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

---

## Impersonation System

Super admin can impersonate any user for debugging:

```typescript
// apps/orchestrator/src/lib/impersonation.ts
export async function impersonateUser(
  superAdminId: string,
  targetUserId: string,
  targetTenantId: string,
  reason: string
): Promise<{ token: string; expiresAt: Date }> {
  // Verify super admin
  if (!await isSuperAdmin(superAdminId)) {
    throw new Error('Unauthorized')
  }

  // Create impersonation record
  const [record] = await sql`
    INSERT INTO public.impersonation_sessions (
      super_admin_id,
      target_user_id,
      target_tenant_id,
      reason,
      expires_at
    ) VALUES (
      ${superAdminId},
      ${targetUserId},
      ${targetTenantId},
      ${reason},
      NOW() + INTERVAL '1 hour'
    )
    RETURNING id, expires_at
  `

  // Audit log
  await sql`
    INSERT INTO public.super_admin_audit_log (
      user_id, action, resource_type, resource_id, tenant_id, new_value
    ) VALUES (
      ${superAdminId},
      'impersonate_user',
      'user',
      ${targetUserId},
      ${targetTenantId},
      ${JSON.stringify({ reason })}
    )
  `

  // Generate impersonation token
  const token = await signJWT({
    sub: targetUserId,
    org: targetTenantId,
    role: 'admin', // Impersonated as admin
    impersonator: superAdminId,
    impersonationId: record.id,
    exp: Math.floor(record.expires_at.getTime() / 1000),
  })

  return { token, expiresAt: record.expires_at }
}
```

### Impersonation UI

```typescript
// apps/orchestrator/src/components/users/impersonate-dialog.tsx
export function ImpersonateDialog({ user, tenant }: Props) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleImpersonate() {
    setIsLoading(true)
    try {
      const { token } = await impersonateUser(user.id, tenant.id, reason)

      // Open admin portal in new tab with impersonation token
      const adminUrl = `https://admin.${tenant.slug}.com/?impersonation_token=${token}`
      window.open(adminUrl, '_blank')
    } catch (error) {
      toast.error('Failed to impersonate user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impersonate User</DialogTitle>
          <DialogDescription>
            You will be logged in as {user.email} with admin privileges.
            All actions will be logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Debugging checkout issue reported in ticket #1234"
            />
          </div>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Impersonation sessions are limited to 1 hour and all actions are audited.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImpersonate}
            disabled={!reason || isLoading}
          >
            {isLoading ? 'Starting...' : 'Start Impersonation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Cross-Tenant Operations View

### Aggregated Error Explorer

```typescript
// apps/orchestrator/src/app/ops/errors/page.tsx
export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: { tenant?: string; severity?: string; status?: string }
}) {
  const errors = await getPlatformErrors({
    tenantId: searchParams.tenant,
    severity: searchParams.severity,
    status: searchParams.status,
    limit: 100,
  })

  const tenants = await getAllTenants()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Errors</h1>
        <div className="flex gap-2">
          <TenantFilter tenants={tenants} current={searchParams.tenant} />
          <SeverityFilter current={searchParams.severity} />
          <StatusFilter current={searchParams.status} />
        </div>
      </div>

      <ErrorStats errors={errors} />

      <ErrorTable errors={errors} showTenant />
    </div>
  )
}
```

### Service Health Matrix

Shows health status per-service per-tenant:

```typescript
// apps/orchestrator/src/components/ops/health-matrix.tsx
interface HealthMatrix {
  tenants: string[]
  services: string[]
  statuses: Record<string, Record<string, HealthStatus>>
}

export function HealthMatrix({ matrix }: { matrix: HealthMatrix }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left">Service</th>
            {matrix.tenants.map(tenant => (
              <th key={tenant} className="p-2 text-center">{tenant}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.services.map(service => (
            <tr key={service} className="border-t">
              <td className="p-2 font-medium">{service}</td>
              {matrix.tenants.map(tenant => (
                <td key={tenant} className="p-2 text-center">
                  <StatusDot
                    status={matrix.statuses[tenant]?.[service] || 'unknown'}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## API Routes Structure

```
/api/platform/                    # Platform-level APIs (super admin only)
├── overview/
│   ├── route.ts                  # GET platform KPIs
│   └── brands/route.ts           # GET all brands summary
│
├── brands/
│   ├── route.ts                  # GET list, POST create
│   ├── [id]/
│   │   ├── route.ts              # GET, PATCH, DELETE brand
│   │   ├── health/route.ts       # GET brand health details
│   │   ├── metrics/route.ts      # GET brand metrics
│   │   └── transfer/route.ts     # POST initiate transfer
│   └── onboard/
│       └── route.ts              # POST step completion
│
├── health/
│   ├── route.ts                  # GET master health status
│   ├── [service]/route.ts        # GET per-service health
│   └── matrix/route.ts           # GET cross-tenant matrix
│
├── alerts/
│   ├── route.ts                  # GET, POST alerts
│   ├── [id]/route.ts             # PATCH acknowledge/resolve
│   └── stream/route.ts           # WebSocket alert stream
│
├── errors/
│   ├── route.ts                  # GET platform errors
│   ├── [id]/route.ts             # GET detail, PATCH status
│   └── aggregate/route.ts        # GET aggregated by pattern
│
├── logs/
│   ├── route.ts                  # GET platform logs
│   └── stream/route.ts           # WebSocket log stream
│
├── flags/
│   ├── route.ts                  # GET, POST flags
│   ├── [key]/
│   │   ├── route.ts              # GET, PATCH, DELETE flag
│   │   └── overrides/route.ts    # GET, POST tenant overrides
│   └── evaluate/route.ts         # POST evaluate flag
│
├── users/
│   ├── route.ts                  # GET all users
│   ├── [id]/route.ts             # GET, PATCH user
│   ├── [id]/impersonate/route.ts # POST start impersonation
│   └── super-admins/route.ts     # GET, POST super admins
│
├── jobs/
│   ├── route.ts                  # GET Inngest job status
│   ├── failed/route.ts           # GET failed jobs
│   └── [id]/retry/route.ts       # POST retry job
│
├── webhooks/
│   ├── route.ts                  # GET webhook delivery status
│   └── [id]/redeliver/route.ts   # POST redeliver
│
└── settings/
    ├── route.ts                  # GET, PATCH platform settings
    ├── integrations/route.ts     # GET, PATCH integrations
    ├── maintenance/route.ts      # POST toggle maintenance
    └── billing/route.ts          # GET billing overview
```

---

## Page Structure

```
apps/orchestrator/src/app/
├── page.tsx                      # Overview dashboard
├── layout.tsx                    # Main layout with nav
│
├── brands/
│   ├── page.tsx                  # Brand list
│   ├── new/
│   │   ├── page.tsx              # Onboarding wizard
│   │   └── [...step]/page.tsx    # Wizard steps
│   ├── health/page.tsx           # Brand health overview
│   ├── transfers/page.tsx        # Transfer management
│   └── [id]/
│       ├── page.tsx              # Brand detail
│       ├── settings/page.tsx     # Brand settings
│       ├── users/page.tsx        # Brand users
│       └── metrics/page.tsx      # Brand metrics
│
├── ops/
│   ├── page.tsx                  # Operations dashboard
│   ├── errors/
│   │   ├── page.tsx              # Error explorer
│   │   └── [id]/page.tsx         # Error detail
│   ├── logs/page.tsx             # Log viewer
│   ├── health/page.tsx           # Health matrix
│   ├── jobs/page.tsx             # Inngest jobs
│   ├── webhooks/page.tsx         # Webhook status
│   └── performance/page.tsx      # Performance metrics
│
├── flags/
│   ├── page.tsx                  # Flag list
│   ├── new/page.tsx              # Create flag
│   ├── rollouts/page.tsx         # Active rollouts
│   ├── audit/page.tsx            # Audit log
│   └── [key]/page.tsx            # Flag detail/edit
│
├── users/
│   ├── page.tsx                  # All users
│   ├── super-admins/page.tsx     # Super admin management
│   ├── access-logs/page.tsx      # Access logs
│   ├── sessions/page.tsx         # Active sessions
│   └── [id]/page.tsx             # User detail
│
├── analytics/
│   ├── page.tsx                  # Platform metrics
│   ├── revenue/page.tsx          # Revenue breakdown
│   ├── growth/page.tsx           # Growth metrics
│   └── costs/page.tsx            # Cost breakdown
│
└── settings/
    ├── page.tsx                  # Platform settings
    ├── integrations/page.tsx     # Integration management
    ├── billing/page.tsx          # Billing/plans
    └── maintenance/page.tsx      # Maintenance mode
```

---

## Security Measures

### 1. Access Restrictions
- Super admin role required for all routes
- MFA required for sensitive operations
- IP allowlist option for production

### 2. Audit Trail
- All actions logged with before/after state
- Immutable audit log
- 90-day retention minimum

### 3. Session Security
- Short-lived sessions (4 hours)
- Single session per user
- Automatic logout on inactivity

### 4. Rate Limiting
- 100 requests/minute per super admin
- Stricter limits on sensitive endpoints

### 5. Impersonation Controls
- Reason required
- 1-hour session limit
- All impersonated actions flagged
- Email notification to target user

---

## Integration with Brand Admins

### Visual Indicator

Brand admin portals show when they're being accessed by super admin:

```typescript
// apps/admin/src/components/impersonation-banner.tsx
export function ImpersonationBanner() {
  const session = useSession()

  if (!session?.impersonator) return null

  return (
    <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span>
          ⚠️ This session is being impersonated by a platform administrator
        </span>
        <span className="text-yellow-700">
          Session expires {formatRelative(session.expiresAt)}
        </span>
      </div>
    </div>
  )
}
```

---

## Deployment

### Vercel Configuration

```json
// apps/orchestrator/vercel.json
{
  "buildCommand": "turbo build --filter=orchestrator",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "ORCHESTRATOR_MODE": "true"
  }
}
```

### Domain Setup

```
orchestrator.platform.com     → apps/orchestrator (production)
orchestrator-dev.platform.com → apps/orchestrator (preview)
```

---

## Success Criteria

- [ ] Super admin authentication working with MFA
- [ ] All brands visible with health indicators
- [ ] Real-time error stream across tenants
- [ ] Feature flag management operational
- [ ] Impersonation working with full audit
- [ ] Cross-tenant health matrix functional
- [ ] Platform metrics dashboard complete
- [ ] Audit log capturing all actions

---

## Dependencies

**Required Before Implementation:**
- Phase 1 database schema (organizations, users, sessions)
- Phase 2 admin portal base (component library)
- Phase 5 Inngest setup (job monitoring)

**Can Be Parallelized:**
- Health monitoring spec (see HEALTH-MONITORING-SPEC)
- Feature flags spec (see FEATURE-FLAGS-SPEC)
- Logging spec (see LOGGING-SPEC)
- Brand onboarding spec (see BRAND-ONBOARDING-SPEC)
