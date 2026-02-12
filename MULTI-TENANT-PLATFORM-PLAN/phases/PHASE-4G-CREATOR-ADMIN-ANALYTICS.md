# PHASE-4G: Creator Admin Analytics & Pipeline Analytics

**Status**: COMPLETE
**Completed**: 2026-02-12

**Duration**: 1 week (Week 18)
**Depends On**: PHASE-4A (creator portal), PHASE-4B (payments), PHASE-4C (projects)
**Parallel With**: PHASE-4E (vendor management)
**Blocks**: None

---

## Goal

Implement comprehensive admin-side analytics for creator program management, including pipeline analytics, performance tracking, earnings visualization, application funnel analysis, and creator health monitoring. These features give admins visibility into program health and individual creator performance.

---

## Success Criteria

- [x] Creator analytics dashboard with KPIs displayed
- [x] Application funnel visualization working
- [x] Creator performance leaderboard implemented
- [x] Earnings trends chart functional
- [x] Creator health indicators calculated and displayed
- [x] Project completion metrics tracked
- [x] Response time tracking operational
- [ ] Metrics aggregation jobs running daily/weekly/monthly (deferred to Phase 5C background jobs)
- [x] Export functionality for reports

---

## Deliverables

### 1. Admin Creator Analytics Dashboard

**Location**: `/admin/creators/analytics`

**Overview KPIs Section**:
| Metric | Description | Calculation |
|--------|-------------|-------------|
| Total Creators | Count by status | `COUNT(*) GROUP BY status` |
| Active Creators | Projects in last 30 days | Creators with recent project activity |
| New Applications (Week) | Applications this week | `created_at >= NOW() - INTERVAL '7 days'` |
| New Applications (Month) | Applications this month | `created_at >= date_trunc('month', NOW())` |
| Approval Rate | Applications approved / total | `approved / (approved + rejected) * 100` |
| Avg Time to Approval | Mean days from apply to approved | `AVG(approved_at - applied_at)` |
| Creator Churn Rate | Inactive in 90d / total active | `inactive_90d / previously_active * 100` |
| Avg Creator Lifetime Value | Mean earnings per creator lifetime | `SUM(earnings) / COUNT(creators)` |

**UI Components**:
- KPI cards with sparkline trends
- Period selector (7d, 30d, 90d, 12m, All time)
- Comparison to previous period (% change)

### 2. Application Funnel Analytics

**Location**: `/admin/creators/analytics` (section)

**Funnel Stages**:
```
Applications Received → In Review → Approved → Onboarding Started → Onboarding Complete → First Project → Active (1+ project/month)
```

**Metrics per Stage**:
- Count at each stage
- Conversion rate to next stage
- Drop-off rate
- Average time in stage
- Trend vs previous period

**Visualizations**:
- Funnel chart with conversion percentages
- Cohort analysis (monthly cohorts progressing through stages)
- Time-based heat map (applications by day/hour)

### 3. Creator Performance Metrics

**Location**: `/admin/creators/analytics/performance`

**Performance Leaderboards**:

| Leaderboard | Metric | Timeframe Options |
|-------------|--------|-------------------|
| Top Earners | Total earnings (cents) | Week, Month, Quarter, Year, All |
| Most Productive | Project count completed | Week, Month, Quarter, Year, All |
| Highest Rated | Quality score (if applicable) | All time |
| Best Response Time | Avg response to messages (hours) | Last 30d |
| Fastest Delivery | Avg days from start to submit | Last 30d |
| Best Revision Rate | % projects with no revisions | Last 30d |

**Individual Creator Stats Card**:
- Total earnings (lifetime, YTD, this month)
- Projects completed (total, this month)
- Average project value
- On-time delivery rate
- Response time average
- Revision request rate
- Active since date
- Last activity date

### 4. Earnings Analytics (Admin View)

**Location**: `/admin/creators/analytics/earnings`

**Aggregated Metrics**:
| Metric | Description |
|--------|-------------|
| Total Payouts (Period) | Sum of all payouts |
| Total Pending | Sum of pending balances |
| Average Earnings per Creator | Mean payout per active creator |
| Median Earnings | Median to show distribution |
| Commission Conversion Rate | Approved commissions / total orders with codes |
| ROAS (Creator Program) | Revenue from creator codes / payouts |

**Visualizations**:
- Earnings distribution histogram (how many creators in each bracket)
- Earnings over time line chart
- Top creators pie chart (% of total)
- Payout method breakdown (Stripe vs Wise vs other)
- Geographic distribution of payouts

**Filters**:
- Date range
- Creator tier
- Payment status
- Country/region

### 5. Creator Health Dashboard

**Location**: `/admin/creators/analytics/health`

**Health Categories**:

| Category | Criteria | Count |
|----------|----------|-------|
| **Champions** | Active, high earnings, on-time | `score >= 90` |
| **Healthy** | Active, good performance | `score 70-89` |
| **At Risk** | Declining activity or delays | `score 50-69` |
| **Inactive** | No activity in 30+ days | `last_activity > 30d` |
| **Churned** | No activity in 90+ days | `last_activity > 90d` |

**Health Score Calculation**:
```
health_score = (
  activity_score * 0.30 +       // Projects in last 30d
  earnings_score * 0.20 +       // Earnings trend
  response_score * 0.20 +       // Response time
  delivery_score * 0.20 +       // On-time delivery %
  engagement_score * 0.10       // Message/file activity
)
```

**At-Risk Indicators**:
- No activity in X days (configurable threshold)
- Declining earnings trend (3+ months)
- Missed deadlines (last 2+ projects)
- Slow response time (>48h average)
- High revision rate (>50%)

**Health Dashboard UI**:
- Health distribution pie chart
- At-risk creators list with call-to-action buttons
- Pending actions (onboarding incomplete, tax forms missing)
- Churn prediction (creators likely to churn next 30d)

### 6. Project Pipeline Analytics

**Location**: Integrated into `/admin/creator-pipeline`

**Pipeline Metrics**:
| Metric | Description |
|--------|-------------|
| Total Value at Risk | Sum of overdue + due soon projects |
| Average Time in Stage | Mean days per pipeline stage |
| Bottleneck Detection | Stage with longest average duration |
| Throughput | Projects completed per week |
| Lead Time | Avg days from created to completed |

**Stage Analytics**:
- Count per stage over time
- Avg time in each stage
- Stage transition heat map
- WIP limits and violations

### 7. Response Rate Tracking

**Database Table**: `creator_response_metrics`

```sql
CREATE TABLE creator_response_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  metric_date DATE NOT NULL,

  -- Response metrics
  messages_received INTEGER DEFAULT 0,
  messages_responded INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  median_response_time_minutes INTEGER,

  -- Project metrics
  projects_started INTEGER DEFAULT 0,
  projects_submitted INTEGER DEFAULT 0,
  projects_approved INTEGER DEFAULT 0,
  projects_revision_requested INTEGER DEFAULT 0,
  avg_delivery_days NUMERIC(5,2),

  -- Engagement
  files_uploaded INTEGER DEFAULT 0,
  logins INTEGER DEFAULT 0,
  portal_time_minutes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, creator_id, metric_date)
);

CREATE INDEX idx_creator_response_metrics_lookup
  ON creator_response_metrics(tenant_id, creator_id, metric_date DESC);
```

### 8. Aggregated Metrics Table

**Database Table**: `creator_analytics_snapshots`

```sql
CREATE TABLE creator_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Creator counts
  total_creators INTEGER,
  active_creators INTEGER,
  pending_creators INTEGER,
  inactive_creators INTEGER,
  churned_creators INTEGER,

  -- Application funnel
  applications_received INTEGER,
  applications_approved INTEGER,
  applications_rejected INTEGER,
  onboarding_started INTEGER,
  onboarding_completed INTEGER,

  -- Earnings
  total_earnings_cents BIGINT,
  total_pending_cents BIGINT,
  total_payouts_cents BIGINT,
  avg_earnings_cents INTEGER,

  -- Performance
  projects_created INTEGER,
  projects_completed INTEGER,
  avg_project_value_cents INTEGER,
  avg_delivery_days NUMERIC(5,2),
  avg_response_hours NUMERIC(5,2),

  -- Health distribution (JSON)
  health_distribution JSONB, -- { champions: 10, healthy: 25, at_risk: 5, ... }

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, snapshot_date, snapshot_type)
);

CREATE INDEX idx_creator_analytics_snapshots_lookup
  ON creator_analytics_snapshots(tenant_id, snapshot_date DESC, snapshot_type);
```

---

## Background Jobs (Add to Phase 5C)

### Daily Creator Metrics Aggregation

**Schedule**: Daily at 3 AM (before other daily jobs)

**Function**: `aggregateCreatorDailyMetrics`

```typescript
// packages/jobs/src/creators/aggregate-daily-metrics.ts
export const aggregateCreatorDailyMetrics = inngest.createFunction(
  { id: 'aggregate-creator-daily-metrics' },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    // Get all active tenants
    const tenants = await step.run('get-tenants', async () => {
      return getAllActiveTenants()
    })

    // Process each tenant
    for (const tenant of tenants) {
      await step.run(`aggregate-${tenant.id}`, async () => {
        // Calculate per-creator metrics for yesterday
        await calculateCreatorResponseMetrics(tenant.id)

        // Calculate daily snapshot
        await createDailySnapshot(tenant.id)
      })
    }
  }
)
```

### Weekly Creator Summary

**Schedule**: Sunday at 6 AM

**Function**: `generateWeeklyCreatorSummary`

- Create weekly snapshot aggregation
- Calculate week-over-week trends
- Identify at-risk creators (for admin notification)
- Generate top performer highlights

### Monthly Creator Report

**Schedule**: 1st of month at 4 AM

**Function**: `generateMonthlyCreatorReport`

- Application funnel analysis for month
- Earnings breakdown by tier/country
- Creator health assessment
- Churn analysis
- Monthly snapshot creation
- Optional: Email report to admins

---

## API Routes

### Analytics Endpoints

```
GET /api/admin/creators/analytics/overview
  Query: period (7d, 30d, 90d, 12m)
  Returns: KPI cards data with trends

GET /api/admin/creators/analytics/funnel
  Query: period, cohort (optional)
  Returns: Funnel stages with conversion rates

GET /api/admin/creators/analytics/performance
  Query: metric (earnings, projects, response), period, limit
  Returns: Leaderboard data

GET /api/admin/creators/analytics/earnings
  Query: period, tier (optional), country (optional)
  Returns: Earnings aggregates and distribution

GET /api/admin/creators/analytics/health
  Query: None
  Returns: Health distribution and at-risk list

GET /api/admin/creators/analytics/pipeline
  Query: period
  Returns: Pipeline stage metrics

GET /api/admin/creators/analytics/export
  Query: type (funnel, performance, earnings, health), format (csv, xlsx)
  Returns: Download file
```

### Individual Creator Stats

```
GET /api/admin/creators/[id]/stats
  Returns: Individual creator performance metrics

GET /api/admin/creators/[id]/activity
  Query: period
  Returns: Activity timeline (projects, messages, files)
```

---

## Constraints

- All metrics must be tenant-isolated
- Use pre-aggregated snapshots for dashboard (avoid expensive queries)
- Real-time queries only for individual creator lookups
- Background jobs must be idempotent (re-running same day updates, not duplicates)
- Export files must be < 100MB (paginate if larger)
- Dashboard must load in < 3 seconds

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Analytics dashboard, charts, KPI cards

**MCPs to consult:**
- Context7 MCP: "Chart.js or Recharts patterns for React"
- Context7 MCP: "PostgreSQL window functions for analytics"
- Context7 MCP: "Inngest cron job patterns"

**RAWDOG code to reference:**
- `src/app/admin/creators/page.tsx` - Existing creator stats (basic)
- `src/app/admin/creator-pipeline/page.tsx` - Pipeline stats banner
- `src/app/admin/creator-payments/page.tsx` - Payment stats
- `src/app/admin/commissions/page.tsx` - Commission summary
- `src/app/admin/analytics/` - General analytics patterns

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Chart library choice (Recharts vs Chart.js vs Tremor)
2. Health score weights and thresholds
3. Cohort analysis granularity (weekly vs monthly)
4. Export format handling (server-side vs client-side generation)
5. Caching strategy for dashboard data (Redis TTL)

---

## Tasks

### [PARALLEL] Database tables
- [ ] Create migration for `creator_response_metrics`
- [ ] Create migration for `creator_analytics_snapshots`
- [ ] Add indexes for analytics queries

### [PARALLEL with tables] Analytics data layer
- [ ] Create `packages/admin-core/src/lib/creators/analytics.ts`
- [ ] Implement `getCreatorOverviewKPIs(tenantId, period)`
- [ ] Implement `getApplicationFunnel(tenantId, period)`
- [ ] Implement `getPerformanceLeaderboard(tenantId, metric, period, limit)`
- [ ] Implement `getEarningsAnalytics(tenantId, period, filters)`
- [ ] Implement `getCreatorHealth(tenantId)`
- [ ] Implement `getPipelineAnalytics(tenantId, period)`

### [SEQUENTIAL after data layer] API routes
- [ ] Create `/api/admin/creators/analytics/overview` route
- [ ] Create `/api/admin/creators/analytics/funnel` route
- [ ] Create `/api/admin/creators/analytics/performance` route
- [ ] Create `/api/admin/creators/analytics/earnings` route
- [ ] Create `/api/admin/creators/analytics/health` route
- [ ] Create `/api/admin/creators/analytics/pipeline` route
- [ ] Create `/api/admin/creators/analytics/export` route
- [ ] Create `/api/admin/creators/[id]/stats` route

### [PARALLEL with API routes] Background jobs
- [ ] Implement `aggregateCreatorDailyMetrics` function
- [ ] Implement `generateWeeklyCreatorSummary` function
- [ ] Implement `generateMonthlyCreatorReport` function
- [ ] Add functions to Phase 5C task list

### [SEQUENTIAL after API routes] UI components
- [ ] Build KPI cards component with sparklines
- [ ] Build funnel chart component
- [ ] Build leaderboard table component
- [ ] Build earnings distribution chart
- [ ] Build health dashboard component
- [ ] Build at-risk creators list
- [ ] Build analytics page layout
- [ ] Add analytics link to creator admin nav

### [SEQUENTIAL after UI] Testing
- [ ] Test dashboard with large dataset (10k+ creators)
- [ ] Verify snapshot jobs run correctly
- [ ] Test export functionality
- [ ] Performance test (< 3s load time)

---

## Definition of Done

- [ ] Analytics dashboard loads in < 3 seconds
- [ ] All KPIs display correctly with trends
- [ ] Application funnel shows accurate conversion rates
- [ ] Leaderboards rank creators correctly
- [ ] Health scores calculate and categorize creators
- [ ] Background jobs run on schedule
- [ ] CSV/Excel exports work
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing: all charts render, data is accurate
