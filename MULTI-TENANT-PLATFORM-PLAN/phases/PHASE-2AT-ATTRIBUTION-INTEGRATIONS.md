# PHASE-2AT-D: Attribution Integrations - Pixels, Platforms, Influencers, Reports & Exports

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Duration**: 1 week (Week 11-12)
**Depends On**: PHASE-2AT-A (Attribution Core)
**Parallel With**: PHASE-2AT-B (Analytics), PHASE-2AT-C (Advanced)
**Blocks**: None

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All platform connections, exports, and reports must be strictly tenant-scoped.

---

## Goal

Build integration management pages: pixel monitoring, platform connections, influencer tracking, scheduled reports, data exports, and custom dashboards. These features connect attribution to external systems and enable data portability.

---

## Success Criteria

- [x] Pixels page shows real-time conversion accuracy
- [x] Platforms page manages secondary ad platform connections
- [x] Influencers page tracks creator attribution
- [x] Reports page enables scheduled PDF delivery
- [x] Exports page configures automated data exports
- [x] Dashboards page allows custom dashboard creation
- [x] All integrations respect tenant boundaries

---

## Deliverables

### Pixels Page (/admin/attribution/pixels)

Real-time pixel monitoring and troubleshooting.

**UI Components:**

1. **Accuracy Overview**
   - Cards for each platform: GA4, Meta, TikTok
   - Last 24h accuracy percentage
   - Trend indicator (up/down from previous period)

2. **Session Stitching Rates**
   - Percentage of sessions successfully stitched
   - By platform breakdown
   - Issue detection alerts

3. **Event Stream Table**
   - Real-time event log (paginated)
   - Columns: Timestamp, Event Type, Platform, Order ID, Match Status
   - Filters: Platform, Event Type, Status, Time Range
   - Search by Order ID

4. **Alert Configuration**
   - Set accuracy thresholds
   - Enable/disable alerts per platform
   - Notification channel (email/Slack)

5. **Meta EMQ Scores** (Event Match Quality)
   - Current EMQ score
   - EMQ trend over time
   - Parameter match breakdown

6. **Recent Failures**
   - List of failed events
   - Error type and message
   - Retry button

**Data Structure:**
```typescript
interface PixelHealth {
  platform: 'ga4' | 'meta' | 'tiktok'
  accuracy24h: number
  accuracyTrend: number // change from previous period
  sessionStitchingRate: number
  lastEvent: Date
  eventCount24h: number
}

interface PixelEvent {
  id: string
  timestamp: Date
  eventType: 'purchase' | 'add_to_cart' | 'page_view' | 'checkout'
  platform: string
  orderId?: string
  matchStatus: 'matched' | 'unmatched' | 'partial'
  errorMessage?: string
}

interface MetaEMQ {
  overallScore: number
  parameterScores: Record<string, number>
  trend: Array<{ date: string; score: number }>
}
```

### Platforms Page (/admin/attribution/platforms)

Manage connections for secondary ad platforms.

**Supported Platforms:**
- Snapchat
- Pinterest
- LinkedIn
- MNTN (CTV)
- Affiliate networks

**UI Components:**

1. **Platform Cards**
   - Card per platform
   - Connection status: Connected, Not Connected, Error
   - Last sync timestamp
   - Sync button

2. **Connection Modal**
   - OAuth flow initiation
   - API key input (where applicable)
   - Account selection
   - Permission scopes display

3. **Sync Status**
   - Last successful sync
   - Records synced count
   - Error log (if any)

4. **Platform Settings**
   - Enable/disable sync
   - Sync frequency
   - Data retention period

**Data Structure:**
```typescript
interface PlatformConnection {
  platform: string
  displayName: string
  status: 'connected' | 'not_connected' | 'error'
  connectedAt?: Date
  lastSyncAt?: Date
  lastSyncStatus?: 'success' | 'partial' | 'failed'
  recordsSynced?: number
  errorMessage?: string
  enabled: boolean
  syncFrequency: 'hourly' | 'daily' | 'weekly'
}
```

### Influencers Page (/admin/attribution/influencers)

Creator/influencer attribution tracking.

**UI Components:**

1. **Influencer List**
   - Search and filter
   - Status filter: Active, Inactive, All
   - Sort by: Revenue, Conversions, ROAS

2. **Influencer Card/Row**
   - Name and profile image
   - Status badge
   - Discount code(s)
   - Creator link(s)
   - UTM campaign pattern
   - Landing page

3. **Performance Metrics**
   - Attributed revenue
   - Attributed conversions
   - Average order value
   - New customer %
   - Commission earned (if integrated with creator module)

4. **Add/Edit Modal**
   - Influencer name
   - Discount codes (multiple)
   - Creator links (multiple)
   - UTM patterns to match
   - Landing page URL
   - Commission rate (if applicable)
   - Active toggle

**Data Structure:**
```typescript
interface Influencer {
  id: string
  name: string
  profileImageUrl?: string
  status: 'active' | 'inactive'
  discountCodes: string[]
  creatorLinks: string[]
  utmPatterns: string[]
  landingPage?: string
  commissionRate?: number
  createdAt: Date
  updatedAt: Date
  // Computed metrics
  metrics?: {
    revenue: number
    conversions: number
    aov: number
    newCustomerPercent: number
    commissionEarned: number
  }
}
```

### Reports Page (/admin/attribution/reports)

Scheduled report generation and delivery.

**UI Components:**

1. **Report List**
   - Table of configured reports
   - Columns: Name, Frequency, Recipients, Last Sent, Status
   - Actions: Edit, Delete, Send Now

2. **Create/Edit Report Modal**
   - Report name
   - Frequency: Daily, Weekly, Monthly
   - Day of week / Day of month (based on frequency)
   - Time to send
   - Timezone
   - Recipients (email list)
   - Slack channel (optional)

3. **Report Configuration**
   - Included metrics (checkboxes)
   - Attribution model to use
   - Attribution window
   - Channels to include
   - Date range (relative: last 7 days, last 30 days, etc.)

4. **Report Preview**
   - Preview PDF layout
   - Sample data

**Data Structure:**
```typescript
interface ScheduledReport {
  id: string
  name: string
  frequency: 'daily' | 'weekly' | 'monthly'
  scheduleConfig: {
    dayOfWeek?: number // 0-6 for weekly
    dayOfMonth?: number // 1-31 for monthly
    hour: number // 0-23
    minute: number // 0-59
    timezone: string
  }
  recipients: string[]
  slackChannel?: string
  reportConfig: {
    model: AttributionModel
    window: AttributionWindow
    metrics: string[]
    channels?: string[]
    dateRange: 'last_7d' | 'last_30d' | 'last_mtd' | 'last_month'
  }
  enabled: boolean
  lastSentAt?: Date
  lastStatus?: 'success' | 'failed'
  createdAt: Date
  updatedAt: Date
}
```

### Exports Page (/admin/attribution/exports)

Automated data export configuration.

**UI Components:**

1. **Export List**
   - Configured exports
   - Columns: Name, Destination, Schedule, Last Export, Status

2. **Create/Edit Export Modal**
   - Export name
   - Destination: S3, GCS, Webhook, SFTP
   - Destination configuration (bucket, URL, credentials)
   - Schedule: Hourly, Daily, Weekly
   - Tables to export (checkboxes)
   - Format: CSV, JSON, Parquet

3. **Tables Available for Export:**
   - attribution_touchpoints
   - attribution_conversions
   - attribution_results
   - attribution_daily_metrics
   - customer_identities (anonymized)

4. **Export History**
   - Recent exports
   - Status, record count, file size
   - Download link (for last 7 days)

**Data Structure:**
```typescript
interface ExportConfiguration {
  id: string
  name: string
  destination: {
    type: 's3' | 'gcs' | 'webhook' | 'sftp'
    config: Record<string, string> // credentials, bucket, url
  }
  schedule: 'hourly' | 'daily' | 'weekly'
  tables: string[]
  format: 'csv' | 'json' | 'parquet'
  enabled: boolean
  lastExportAt?: Date
  lastExportStatus?: 'success' | 'failed'
  lastExportRecordCount?: number
}
```

### Dashboards Page (/admin/attribution/dashboards)

Custom dashboard builder.

**UI Components:**

1. **Dashboard List**
   - User's saved dashboards
   - Default dashboard marker
   - Last modified date
   - Quick preview

2. **Create/Edit Dashboard**
   - Dashboard name
   - Description
   - Date range default
   - Refresh interval
   - Mark as default toggle

3. **Dashboard Editor**
   - Drag-and-drop widget placement
   - Grid-based layout (12 columns)
   - Resize widgets

4. **Widget Library**
   - KPI cards
   - Line charts
   - Bar charts
   - Tables
   - Pie charts
   - Text/markdown
   - Custom filters

5. **Widget Configuration**
   - Select data source
   - Select metrics
   - Configure filters
   - Set title and description

**Data Structure:**
```typescript
interface CustomDashboard {
  id: string
  name: string
  description?: string
  isDefault: boolean
  dateRangeDefault: 'last_7d' | 'last_14d' | 'last_30d'
  refreshIntervalMinutes?: number
  layout: Array<{
    widgetId: string
    widgetType: 'kpi' | 'line_chart' | 'bar_chart' | 'table' | 'pie' | 'text'
    x: number // 0-11
    y: number
    width: number // 1-12
    height: number
    config: Record<string, unknown>
  }>
  createdAt: Date
  updatedAt: Date
}
```

---

## Constraints

- OAuth tokens must be encrypted at rest (AES-256-GCM)
- Export credentials stored encrypted
- Scheduled reports limited to 10 per tenant
- Export files auto-deleted after 30 days
- Dashboard widgets limited to 20 per dashboard
- Real-time event stream limited to last 1000 events

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for dashboard builder and pixel monitoring
- Context7 MCP: "React DnD grid layout"
- Context7 MCP: "OAuth 2.0 flow in Next.js"

**RAWDOG code to reference:**
- `src/app/admin/attribution/pixels/page.tsx` - Pixel monitoring
- `src/app/admin/attribution/platforms/page.tsx` - Platform connections
- `src/app/admin/attribution/influencers/page.tsx` - Influencer list
- `src/app/admin/attribution/reports/page.tsx` - Scheduled reports
- `src/app/admin/attribution/exports/page.tsx` - Export config
- `src/app/admin/attribution/dashboards/page.tsx` - Custom dashboards
- `src/lib/attribution/exports/` - Export implementation
- `src/lib/attribution/reports/` - Report generation

---

## AI Discretion Areas

1. Dashboard widget library extent
2. Export file format options (Parquet support)
3. Real-time event streaming (SSE vs polling)
4. Influencer matching algorithm (discount code vs UTM)

---

## Tasks

### [PARALLEL] Pixels Page
- [x] Create `apps/admin/src/app/admin/attribution/pixels/page.tsx`
- [x] Create accuracy overview cards
- [x] Create event stream table with pagination
- [x] Create alert configuration panel
- [x] Create Meta EMQ section
- [x] Create failure retry functionality

### [PARALLEL] Platforms Page
- [x] Create `apps/admin/src/app/admin/attribution/platforms/page.tsx`
- [x] Create platform connection cards
- [x] Implement OAuth flows for each platform
- [x] Create sync status display
- [x] Create platform settings panel

### [PARALLEL] Influencers Page
- [x] Create `apps/admin/src/app/admin/attribution/influencers/page.tsx`
- [x] Create influencer list with filters
- [x] Create add/edit modal
- [x] Implement attribution matching logic
- [x] Display performance metrics
- [x] Link to creator module (if exists)

### [PARALLEL] Reports Page
- [x] Create `apps/admin/src/app/admin/attribution/reports/page.tsx`
- [x] Create report list table
- [x] Create report configuration modal
- [x] Implement schedule configuration
- [x] Create report preview functionality
- [x] Implement "Send Now" action

### [PARALLEL] Exports Page
- [x] Create `apps/admin/src/app/admin/attribution/exports/page.tsx`
- [x] Create export configuration list
- [x] Create destination configuration forms
- [x] Create table selection UI
- [x] Create export history table
- [x] Implement download functionality

### [PARALLEL] Dashboards Page
- [x] Create `apps/admin/src/app/admin/attribution/dashboards/page.tsx`
- [x] Create dashboard list
- [x] Create dashboard editor with grid layout
- [x] Create widget library panel
- [x] Implement widget configuration
- [x] Implement save/load functionality

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/attribution/pixels/stats` | GET | Accuracy stats |
| `/api/admin/attribution/pixels/events` | GET | Event stream |
| `/api/admin/attribution/pixels/alerts` | GET/PUT | Alert config |
| `/api/admin/attribution/pixels/emq` | GET | Meta EMQ data |
| `/api/admin/attribution/platforms/connections` | GET | Platform list |
| `/api/admin/attribution/platforms/[platform]/connect` | POST | Start OAuth |
| `/api/admin/attribution/platforms/[platform]/sync` | POST | Trigger sync |
| `/api/admin/attribution/influencers` | GET/POST | List/create |
| `/api/admin/attribution/influencers/[id]` | GET/PUT/DELETE | Manage |
| `/api/admin/attribution/reports` | GET/POST | List/create |
| `/api/admin/attribution/reports/[id]` | GET/PUT/DELETE | Manage |
| `/api/admin/attribution/reports/[id]/send` | POST | Send now |
| `/api/admin/attribution/exports` | GET/POST | List/create |
| `/api/admin/attribution/exports/[id]` | GET/PUT/DELETE | Manage |
| `/api/admin/attribution/exports/[id]/run` | POST | Run now |
| `/api/admin/attribution/dashboards` | GET/POST | List/create |
| `/api/admin/attribution/dashboards/[id]` | GET/PUT/DELETE | Manage |

---

## Database Tables

```sql
-- Platform connections (encrypted OAuth tokens)
CREATE TABLE attribution_platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_connected',
  encrypted_credentials BYTEA,
  credentials_iv BYTEA,
  account_id TEXT,
  account_name TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sync_frequency TEXT NOT NULL DEFAULT 'daily',
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, platform)
);

-- Influencers
CREATE TABLE attribution_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profile_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  discount_codes TEXT[] NOT NULL DEFAULT '{}',
  creator_links TEXT[] NOT NULL DEFAULT '{}',
  utm_patterns TEXT[] NOT NULL DEFAULT '{}',
  landing_page TEXT,
  commission_rate NUMERIC(5,4),
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled reports
CREATE TABLE attribution_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  schedule_config JSONB NOT NULL,
  recipients TEXT[] NOT NULL,
  slack_channel TEXT,
  report_config JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Export configurations
CREATE TABLE attribution_export_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  encrypted_destination_config BYTEA,
  destination_config_iv BYTEA,
  schedule TEXT NOT NULL,
  tables TEXT[] NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_export_at TIMESTAMPTZ,
  last_export_status TEXT,
  last_export_record_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom dashboards
CREATE TABLE attribution_custom_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  date_range_default TEXT NOT NULL DEFAULT 'last_30d',
  refresh_interval_minutes INTEGER,
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Definition of Done

- [x] Pixels page shows real-time accuracy metrics
- [x] Platform OAuth flows work for all supported platforms
- [x] Influencers can be added and show attributed performance
- [x] Reports can be scheduled and delivered via email/Slack
- [x] Exports can be configured and files downloaded
- [x] Custom dashboards can be created and saved
- [x] All credentials encrypted at rest
- [x] All pages respect tenant isolation
- [x] `npx tsc --noEmit` passes
- [x] Mobile responsive at 390px

---

## Status: COMPLETE

All tasks for PHASE-2AT-D Attribution Integrations have been implemented.
