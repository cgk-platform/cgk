# PHASE-2AT-A: Attribution Core - Dashboard, Settings & Data Quality

**Duration**: 1 week (Week 9-10)
**Depends On**: PHASE-2A (Admin Shell), PHASE-1B (Database Schema)
**Parallel With**: PHASE-2AT-B (Analytics), PHASE-2PO-HEALTH (Platform Ops)
**Blocks**: PHASE-5D (Analytics Jobs - needs admin UI first)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All attribution queries MUST use `withTenant()` wrapper. Never query without tenant context.

Key requirements for this phase:
- All database queries use `withTenant(tenantId, async () => { ... })`
- All attribution data is scoped to tenant's schema
- Attribution results cannot leak across tenants
- Settings and configurations are per-tenant

---

## Goal

Build the core attribution admin infrastructure: the main dashboard, settings management, data quality monitoring, and setup wizard. This is the foundation that all other attribution features depend on.

---

## Success Criteria

- [ ] Attribution dashboard loads with real-time metrics
- [ ] Model selector switches data across all widgets
- [ ] Time range picker filters all data correctly
- [ ] Settings page saves attribution configuration
- [ ] Data quality dashboard shows tracking health
- [ ] Setup wizard guides new tenant configuration
- [ ] All pages enforce tenant isolation

---

## Deliverables

### Overview Dashboard (/admin/attribution)

The main attribution landing page showing key performance metrics.

**Components:**
- **KPI Cards Row**: Revenue, Conversions, ROAS, MER (Marketing Efficiency Ratio)
- **Model Selector**: Dropdown to switch between 7 attribution models
- **Time Range Picker**: 7d, 14d, 28d, 30d, 90d, custom range
- **Channel Breakdown Widget**: Horizontal bar chart of revenue by channel
- **Platform Comparison Widget**: Meta vs Google vs TikTok side-by-side
- **Real-time Toggle**: Switch between 48hr view and historical

**Data Requirements:**
```typescript
interface AttributionOverview {
  kpis: {
    revenue: { value: number; change: number }
    conversions: { value: number; change: number }
    roas: { value: number; change: number }
    mer: { value: number; change: number }
  }
  channelBreakdown: Array<{
    channel: string
    revenue: number
    spend: number
    conversions: number
  }>
  platformComparison: Array<{
    platform: 'meta' | 'google' | 'tiktok'
    spend: number
    revenue: number
    roas: number
  }>
}
```

### Settings Page (/admin/attribution/settings)

Configuration for tenant-specific attribution behavior.

**Settings Groups:**

1. **Global Settings**
   - Enable/disable attribution tracking
   - Default attribution model
   - Default attribution window
   - Attribution mode (clicks_only vs clicks_plus_views)

2. **Model Configuration**
   - Enabled models (checkboxes for all 7)
   - Time decay half-life (hours, default 168)
   - Position-based weights (40/20/40 default)

3. **Window Configuration**
   - Enabled windows (checkboxes for 1d, 3d, 7d, 14d, 28d, 30d, 90d, LTV)
   - Default window for dashboards

4. **Integration Settings**
   - Fairing survey bridge enable/disable
   - Sync interval for Fairing data
   - Manual sync button

**Database Schema:**
```sql
CREATE TABLE attribution_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  default_model TEXT NOT NULL DEFAULT 'time_decay',
  default_window TEXT NOT NULL DEFAULT '7d',
  attribution_mode TEXT NOT NULL DEFAULT 'clicks_only',
  enabled_models TEXT[] NOT NULL DEFAULT ARRAY['first_touch','last_touch','linear','time_decay','position_based','data_driven','last_non_direct'],
  enabled_windows TEXT[] NOT NULL DEFAULT ARRAY['1d','7d','14d','28d','30d'],
  time_decay_half_life_hours INTEGER NOT NULL DEFAULT 168,
  position_based_weights JSONB NOT NULL DEFAULT '{"first": 40, "middle": 20, "last": 40}',
  fairing_bridge_enabled BOOLEAN NOT NULL DEFAULT false,
  fairing_sync_interval TEXT NOT NULL DEFAULT 'hourly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Data Quality Dashboard (/admin/attribution/data-quality)

Comprehensive tracking health monitoring.

**Sections:**

1. **Coverage Score** (0-100%)
   - Percentage of orders with attribution touchpoints
   - Trend over last 30 days

2. **Tracking Health Grid**
   - GA4 Pixel status (firing/not firing, last event)
   - Meta Pixel status (EMQ score, last event)
   - TikTok Pixel status (firing/not firing, last event)
   - First-party tracking status

3. **Visit Coverage**
   - Session ID coverage %
   - Visitor ID coverage %
   - Email hash coverage %
   - Device fingerprint coverage %

4. **Server-Side Events**
   - GA4 Measurement Protocol status
   - Meta CAPI status (match quality)
   - TikTok Events API status

5. **Webhook Queue Health**
   - Pending webhooks count
   - Failed webhooks count
   - Processing rate
   - Average latency

6. **Device Graph**
   - Cross-device match rate
   - Identity resolution success rate
   - Visitors linked to customers %

**Data Requirements:**
```typescript
interface DataQualityMetrics {
  coverageScore: number // 0-100
  coverageTrend: Array<{ date: string; score: number }>
  pixelHealth: {
    ga4: { status: 'healthy' | 'warning' | 'error'; lastEvent: Date; eventCount24h: number }
    meta: { status: 'healthy' | 'warning' | 'error'; emqScore: number; lastEvent: Date }
    tiktok: { status: 'healthy' | 'warning' | 'error'; lastEvent: Date; eventCount24h: number }
  }
  visitCoverage: {
    sessionId: number // percentage
    visitorId: number
    emailHash: number
    deviceFingerprint: number
  }
  serverSideEvents: {
    ga4: { enabled: boolean; successRate: number }
    metaCapi: { enabled: boolean; matchQuality: number }
    tiktokApi: { enabled: boolean; successRate: number }
  }
  webhookQueue: {
    pending: number
    failed: number
    processingRate: number // per minute
    avgLatencyMs: number
  }
  deviceGraph: {
    crossDeviceMatchRate: number
    identityResolutionRate: number
    visitorsLinked: number // percentage
  }
}
```

### Setup Wizard (/admin/attribution/setup)

Guided configuration for new tenants or reconfiguration.

**Wizard Steps:**

1. **Introduction**
   - What attribution tracking does
   - Overview of the setup process
   - Time estimate (~10 minutes)

2. **Platform Connections**
   - Meta Ads (already in integrations)
   - Google Ads (already in integrations)
   - TikTok Ads (OAuth flow link)
   - Show connected/not connected status

3. **Tracking Parameters**
   - Documentation on required URL parameters
   - Meta: fbclid + nbt parameter format
   - Google: gclid + ValueTrack macros
   - TikTok: Manual UTM requirements
   - Validation checker input

4. **Pixel Installation**
   - First-party tracking script snippet
   - GA4 setup instructions
   - Meta Pixel verification
   - Test event button

5. **Attribution Defaults**
   - Select default model
   - Select default window
   - Enable/disable models

6. **Verification**
   - Test conversion flow
   - Verify touchpoint capture
   - Success/failure status

**Wizard State:**
```typescript
interface SetupWizardState {
  currentStep: number
  completedSteps: number[]
  platformConnections: {
    meta: boolean
    google: boolean
    tiktok: boolean
  }
  pixelVerified: {
    firstParty: boolean
    ga4: boolean
    meta: boolean
  }
  testConversionPassed: boolean
}
```

### Layout Component (/admin/attribution/layout.tsx)

Shared navigation wrapper for all attribution pages.

**Features:**
- Consistent sidebar navigation with all 21 pages
- Model selector in header (affects all child pages)
- Time range picker in header (affects all child pages)
- Breadcrumb navigation
- Page title and description

---

## Constraints

- Must use `@cgk/db` sql template tag (never raw db.query)
- All queries wrapped with `withTenant(tenantId, ...)`
- Model and window selectors persist to URL query params
- Use shadcn/ui components exclusively
- Follow existing RAWDOG admin layout patterns
- Charts use Recharts library

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED before creating dashboard and settings components
- Context7 MCP: "Recharts bar chart with Tailwind CSS"
- Context7 MCP: "shadcn/ui form with Zod validation"

**RAWDOG code to reference:**
- `src/app/admin/attribution/page.tsx` - Dashboard layout
- `src/app/admin/attribution/settings/page.tsx` - Settings pattern
- `src/app/admin/attribution/data-quality/page.tsx` - Health metrics
- `src/app/admin/attribution/setup/page.tsx` - Wizard flow
- `src/lib/attribution/config.ts` - Configuration validation
- `src/lib/attribution/db/schema.ts` - Complete schema (655 lines)

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Chart library selection (Recharts vs Chart.js)
2. Caching strategy for dashboard metrics (Redis TTL)
3. Wizard state persistence (URL vs localStorage)
4. Real-time update frequency for dashboard

---

## Tasks

### [PARALLEL] Database Schema
- [ ] Create `attribution_settings` table migration
- [ ] Create `attribution_data_quality_snapshots` table for historical tracking
- [ ] Create indexes for tenant + date range queries
- [ ] Implement `getAttributionSettings()` with caching
- [ ] Implement `saveAttributionSettings()` with validation

### [PARALLEL] Dashboard Components
- [ ] Create `apps/admin/src/app/admin/attribution/page.tsx`
- [ ] Create KPI cards component with loading states
- [ ] Create channel breakdown bar chart
- [ ] Create platform comparison widget
- [ ] Implement model selector component (shared across pages)
- [ ] Implement time range picker component (shared across pages)

### [PARALLEL] Settings Page
- [ ] Create `apps/admin/src/app/admin/attribution/settings/page.tsx`
- [ ] Create settings form with Zod validation
- [ ] Implement model enable/disable toggles
- [ ] Implement window enable/disable toggles
- [ ] Implement Fairing bridge settings
- [ ] Add save confirmation toast

### [SEQUENTIAL after Dashboard] Data Quality Page
- [ ] Create `apps/admin/src/app/admin/attribution/data-quality/page.tsx`
- [ ] Create coverage score gauge component
- [ ] Create pixel health status cards
- [ ] Create server-side events status grid
- [ ] Create webhook queue health widget
- [ ] Create device graph metrics

### [SEQUENTIAL after Settings] Setup Wizard
- [ ] Create `apps/admin/src/app/admin/attribution/setup/page.tsx`
- [ ] Create wizard step navigation
- [ ] Create platform connection status component
- [ ] Create tracking parameter documentation
- [ ] Create pixel verification tool
- [ ] Create test conversion flow

### [PARALLEL] Attribution Layout
- [ ] Create `apps/admin/src/app/admin/attribution/layout.tsx`
- [ ] Create AttributionNav component with all 21 pages
- [ ] Implement model selector in layout header
- [ ] Implement time range picker in layout header
- [ ] Create context provider for shared state

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/attribution/overview` | GET | Dashboard KPIs and charts |
| `/api/admin/attribution/settings` | GET | Load settings |
| `/api/admin/attribution/settings` | PUT | Save settings |
| `/api/admin/attribution/data-quality` | GET | Health metrics |
| `/api/admin/attribution/setup/verify-pixel` | POST | Test pixel |
| `/api/admin/attribution/setup/test-conversion` | POST | Test flow |

---

## Definition of Done

- [ ] Dashboard renders with all KPI cards
- [ ] Model selector changes data across all widgets
- [ ] Time range picker filters all data correctly
- [ ] Settings save and load correctly
- [ ] Data quality page shows all health metrics
- [ ] Setup wizard completes without errors
- [ ] All queries use tenant isolation
- [ ] `npx tsc --noEmit` passes
- [ ] Mobile responsive at 390px
