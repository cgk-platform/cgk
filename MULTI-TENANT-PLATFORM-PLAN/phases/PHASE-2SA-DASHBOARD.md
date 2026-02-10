# PHASE-2SA-DASHBOARD: Super Admin Overview Dashboard

**Duration**: 1 week (Week 6)
**Depends On**: PHASE-2SA-ACCESS
**Parallel With**: PHASE-2B-ADMIN-COMMERCE, PHASE-2C-ADMIN-CONTENT
**Blocks**: PHASE-2SA-ADVANCED

---

## Goal

Build the Orchestrator's main dashboard and navigation structure, providing platform-wide visibility into GMV, MRR, brand health, and real-time alerts. This is the "home base" for platform operators.

---

## Success Criteria

- [ ] Overview dashboard displays all Platform KPIs (GMV, MRR, Active Brands)
- [ ] Brands grid shows all tenants with health indicators and integration status
- [ ] Real-time alert feed updates via WebSocket
- [ ] Navigation between all 7 top-level sections works
- [ ] System status summary shows aggregated health

---

## Deliverables

### Platform KPIs Component
- Total GMV with change percentage
- Platform MRR with change percentage
- Total Brands / Active Brands count
- System Status indicator (healthy/degraded/critical)
- Open Alerts breakdown (P1/P2/P3)
- Uptime percentage

### Brands Grid Component
- Brand card with logo, name, slug
- Health indicator (healthy/degraded/unhealthy)
- Status badge (active/paused/onboarding)
- 24h metrics: revenue, orders, error count
- Integration status badges (Shopify, Stripe connected)
- Link to brand detail page

### Real-Time Alert Feed
- WebSocket connection to `/api/platform/alerts/stream`
- Live alert updates (newest first)
- Alert priority indicators
- Connection status indicator (animate-pulse)
- Max 50 alerts in feed (rolling window)

### Navigation Structure
```
/ (Overview)
  /brands
    /brands/new (Onboarding wizard - placeholder)
    /brands/health
    /brands/[id]
  /ops
    /ops/errors
    /ops/logs
    /ops/health
    /ops/jobs
  /flags (placeholder)
  /users (placeholder)
  /analytics (placeholder)
  /settings (placeholder)
```

### Page Layouts
- `apps/orchestrator/src/app/layout.tsx` - Main layout with sidebar nav
- `apps/orchestrator/src/app/page.tsx` - Overview dashboard

---

## Constraints

- KPIs must be cached with 30-second refresh (avoid hammering database)
- Brands grid must paginate for scalability (20 brands per page default)
- WebSocket must handle reconnection gracefully
- All data fetching must include tenant isolation for cross-tenant queries
- Navigation must be responsive (collapsible sidebar on mobile)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for all dashboard components
- Context7 MCP: "WebSocket React hooks real-time updates"
- Context7 MCP: "Dashboard KPI card patterns"

**RAWDOG code to reference:**
- `src/components/admin/AdminNav.tsx` - Navigation sidebar pattern
- `src/components/admin/dashboard/` - KPI card patterns
- `src/app/admin/page.tsx` - Dashboard layout composition

**Spec documents:**
- `SUPER-ADMIN-ARCHITECTURE-2025-02-10.md` - PlatformKPIs interface, BrandSummary interface
- `UI-PREVIEW-2025-02-10.md` - Component styling guidelines
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Full skill invocation patterns

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - **CRITICAL**: Cache-busting for API routes, Neon pooling gotchas, multi-tenant query patterns

**UI Components:**
- Use `@repo/ui` package components (Card, Badge, ScrollArea)
- Lucide icons for navigation (LayoutDashboard, Building2, Activity, Flag, Users, BarChart3, Settings)

---

## Frontend Design Skill Integration

**MANDATORY**: This phase is UI-intensive. Invoke `/frontend-design` for EVERY component.

### Component-Specific Skill Prompts

**1. Platform KPI Cards:**
```
/frontend-design

Building Platform KPI cards for Super Admin dashboard (PHASE-2SA-DASHBOARD).

Requirements:
- 6 KPI metrics displayed as cards:
  1. Total GMV: Currency value + percentage change (vs last 30d)
  2. Platform MRR: Currency value + percentage change
  3. Total Brands: Count
  4. Active Brands: Count (subset of total)
  5. System Status: healthy/degraded/critical indicator
  6. Open Alerts: P1/P2/P3 breakdown with severity colors

- For GMV/MRR/counts:
  - Large primary value
  - Change percentage with trend arrow (up = green, down = red)
  - Subtle label above value

- For System Status:
  - Large status indicator (dot + text)
  - Color: healthy = green, degraded = amber, critical = red

- For Open Alerts:
  - Three numbers in row: P1 (red), P2 (orange), P3 (yellow)
  - Total count as primary value

Layout:
- Desktop: 6 columns in single row
- Tablet: 3x2 grid
- Mobile: 2x3 grid

Design constraints:
- Professional, data-dense, glanceable
- Platform operators should understand health in < 3 seconds
- Cards clickable to drill down
```

**2. Brands Grid:**
```
/frontend-design

Building Brands Grid for Super Admin (PHASE-2SA-DASHBOARD).

Requirements:
- Grid of brand cards showing all tenants
- Each card contains:
  - Brand logo (with fallback to initials)
  - Brand name (primary text)
  - Slug (secondary/muted text)
  - Status badge: active (green), paused (gray), onboarding (blue)
  - Health indicator dot: healthy (green), degraded (yellow), unhealthy (red)
  - 24h metrics row: $revenue | orders | errors
  - Integration badges: "Shopify" + "Stripe" (faded if not connected)
- Click card to navigate to /brands/[id]

Pagination:
- 20 brands per page
- Pagination controls below grid
- "Showing 1-20 of 45 brands"

Layout:
- Desktop: 4 columns
- Tablet: 2 columns
- Mobile: 1 column (card width expands)

Design:
- Clean cards with subtle hover effect
- Health indicators should be immediately visible
- Brands with issues (unhealthy or high errors) should stand out
```

**3. Real-Time Alert Feed:**
```
/frontend-design

Building real-time alert feed for Super Admin (PHASE-2SA-DASHBOARD).

Requirements:
- WebSocket-connected live feed of platform alerts
- Each alert item shows:
  - Timestamp (relative, e.g., "2m ago")
  - Brand name/logo
  - Severity badge: P1 (red), P2 (orange), P3 (yellow)
  - Alert message (1-2 lines, truncated)
  - Click to view details

- Connection status indicator:
  - Green pulsing dot when connected
  - Red dot + "Reconnecting..." when disconnected

- Behavior:
  - New alerts appear at top with subtle animation
  - Max 50 alerts in view (older ones removed)
  - "X new alerts" banner if scrolled down

Layout:
- Vertical scrollable list in sidebar or panel
- Fixed height with internal scroll
- On mobile: collapsible panel or bottom sheet

Design:
- Compact items for density
- Clear visual hierarchy by severity
- Unread vs read state (subtle left border)
```

**4. Super Admin Navigation Sidebar:**
```
/frontend-design

Building Orchestrator navigation sidebar (PHASE-2SA-DASHBOARD).

Requirements:
- 7 navigation sections with icons:
  1. Overview (LayoutDashboard) - current page
  2. Brands (Building2) - /brands
  3. Operations (Activity) - /ops with sub-nav: Errors, Logs, Health, Jobs
  4. Flags (Flag) - /flags
  5. Users (Users) - /users
  6. Analytics (BarChart3) - /analytics
  7. Settings (Settings) - /settings

- Visual distinction from brand admin:
  - Different color scheme (e.g., dark sidebar)
  - "Platform" or "Orchestrator" label at top
  - MFA indicator if super admin has MFA enabled

- Behavior:
  - Collapsible to icon-only on desktop
  - Slide-out drawer on mobile
  - Active section highlighted
  - Sub-navigation expandable (Operations section)

Design:
- Professional, elevated look (this is internal tooling)
- Quick access to common actions
```

### Workflow for UI Tasks

1. **Read spec documents:** Review `SUPER-ADMIN-ARCHITECTURE-*.md` for interface types
2. **Invoke `/frontend-design`:** With the specific component prompt
3. **Implement with real data:** Wire up to API routes once components built
4. **Test WebSocket connection:** Especially for alert feed
5. **Verify at scale:** Test with many brands in grid

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. KPI caching strategy (Redis vs in-memory with SWR)
2. WebSocket implementation (native ws vs Socket.IO vs Pusher)
3. Brands grid virtualization for large tenant counts
4. Dashboard layout grid system (CSS Grid vs Tailwind grid classes)

---

## Tasks

### [PARALLEL] Core Components
- [ ] Create `PlatformKPICards` component with all 6 KPI types
- [ ] Create `BrandCard` component with health/status indicators
- [ ] Create `BrandsGrid` component with pagination
- [ ] Create `AlertFeed` component with WebSocket connection
- [ ] Create `StatusDot` component for health indicators

### [PARALLEL] API Routes
- [ ] `GET /api/platform/overview` - Platform KPIs aggregation
- [ ] `GET /api/platform/overview/brands` - Paginated brands summary
- [ ] `GET /api/platform/alerts/stream` - WebSocket alert stream
- [ ] `GET /api/platform/health` - Master health status

### [SEQUENTIAL after Components] Pages
- [ ] Create `apps/orchestrator/src/app/layout.tsx` with sidebar navigation
- [ ] Create `apps/orchestrator/src/app/page.tsx` - Overview dashboard
- [ ] Create placeholder pages for all 7 nav sections
- [ ] Create `apps/orchestrator/src/app/brands/page.tsx` - Brands list
- [ ] Create `apps/orchestrator/src/app/brands/[id]/page.tsx` - Brand detail

### [SEQUENTIAL after API Routes] Data Fetching
- [ ] Implement KPI aggregation query (cross-tenant GMV, MRR)
- [ ] Implement brand health calculation logic
- [ ] Add caching layer for KPIs (30-second TTL)
- [ ] Add real-time alert subscription

---

## API Routes

```
/api/platform/overview/
  route.ts              # GET platform KPIs
  brands/route.ts       # GET all brands summary (paginated)

/api/platform/alerts/
  route.ts              # GET alerts list
  stream/route.ts       # WebSocket connection

/api/platform/health/
  route.ts              # GET master health status

/api/platform/brands/
  route.ts              # GET list, POST create brand
  [id]/route.ts         # GET, PATCH, DELETE brand
  [id]/health/route.ts  # GET brand health details
```

---

## Interfaces

### PlatformKPIs
```typescript
interface PlatformKPIs {
  totalGMV: { value: number; change: number }
  platformMRR: { value: number; change: number }
  totalBrands: number
  activeBrands: number
  systemStatus: 'healthy' | 'degraded' | 'critical'
  openAlerts: { p1: number; p2: number; p3: number }
  errorRate24h: number
  avgLatency: number
  uptimePercent: number
  pendingJobs: number
  failedJobs24h: number
}
```

### BrandSummary
```typescript
interface BrandSummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
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

## Definition of Done

- [ ] Overview dashboard loads within 2 seconds
- [ ] All 6 KPI cards display accurate data
- [ ] Brands grid shows all tenants with correct health indicators
- [ ] Alert feed connects via WebSocket and updates in real-time
- [ ] Navigation sidebar allows access to all sections
- [ ] Responsive layout works on desktop and tablet
- [ ] `npx tsc --noEmit` passes
- [ ] Integration tests for KPI aggregation queries
