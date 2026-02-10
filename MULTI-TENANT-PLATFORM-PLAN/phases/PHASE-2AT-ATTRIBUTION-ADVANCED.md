# PHASE-2AT-C: Attribution Advanced Analytics - Journeys, MMM, Incrementality & AI Insights

**Duration**: 1.5 weeks (Week 11-12)
**Depends On**: PHASE-2AT-A (Attribution Core)
**Parallel With**: PHASE-2AT-B (Analytics), PHASE-2AT-D (Integrations)
**Blocks**: None

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Advanced analytics must be strictly tenant-scoped. ML models trained per-tenant.

---

## Goal

Build advanced analytics capabilities: customer journey visualization, Media Mix Modeling (MMM), incrementality testing, and AI-powered insights. These features provide strategic decision-making tools beyond basic attribution.

---

## Success Criteria

- [ ] Journeys page visualizes customer touchpoint paths
- [ ] MMM page shows channel saturation and budget recommendations
- [ ] Incrementality page manages geo-holdout experiments
- [ ] AI Insights page surfaces anomalies and trends automatically
- [ ] All advanced features respect tenant isolation
- [ ] ML models train per-tenant on scheduled basis

---

## Deliverables

### Journeys Page (/admin/attribution/journeys)

Customer touchpoint journey visualization.

**UI Components:**

1. **Journey List**
   - List of recent conversions (50 limit default)
   - Search by order ID or customer email
   - Filter: New vs Returning customers
   - Attribution window: 7d, 14d, 28d, 30d

2. **Journey Timeline**
   - Horizontal timeline showing touchpoints
   - Touchpoint icons by channel (Meta=, Google=, TikTok=, Email=, Direct=)
   - Time between touchpoints displayed
   - Click to expand touchpoint details

3. **Journey Detail Panel**
   - Slide-out panel when journey selected
   - Full touchpoint details: channel, campaign, timestamp, device
   - Credit allocation per model (tabs for each model)
   - Customer info: email, order value, products purchased

4. **Path Analysis Summary**
   - Most common paths (top 10)
   - Average touchpoints per conversion
   - Average time to conversion
   - Path length distribution chart

**Data Structure:**
```typescript
interface CustomerJourney {
  conversionId: string
  orderId: string
  orderTotal: number
  customerEmail: string
  isNewCustomer: boolean
  conversionDate: Date
  touchpointCount: number
  touchpoints: Array<{
    id: string
    timestamp: Date
    channel: string
    platform?: string
    campaign?: string
    adSet?: string
    ad?: string
    device: string
    browser?: string
    creditByModel: Record<AttributionModel, number> // 0-100 percentage
  }>
}

interface PathAnalysis {
  commonPaths: Array<{
    path: string[] // e.g., ['meta', 'google', 'direct']
    count: number
    avgOrderValue: number
  }>
  avgTouchpoints: number
  avgTimeToConversion: number // hours
  pathLengthDistribution: Array<{ length: number; count: number }>
}
```

### MMM Page (/admin/attribution/mmm)

Media Mix Modeling for budget optimization.

**UI Components:**

1. **MMM Configuration**
   - Channel input: comma-separated list of channels to model
   - Date range: Historical data period for training
   - Run model button (async, shows progress)

2. **Model Results Dashboard**
   - Model fit metrics: R², MAPE, Bayesian R²
   - Last run timestamp
   - Model status: draft, running, completed, failed

3. **Channel Contributions Table**
   - Channel name
   - Contribution % (share of attributed revenue)
   - Current ROI (actual performance)
   - Marginal ROI (next dollar return)
   - Saturation point (spend level where diminishing returns start)
   - Optimal spend recommendation

4. **Saturation Curves Chart**
   - Line chart per channel
   - X-axis: Spend level
   - Y-axis: Revenue (or conversions)
   - Current spend marked with vertical line
   - Saturation point marked

5. **Budget Optimizer**
   - Total budget input
   - Drag sliders for channel allocation
   - Projected outcome comparison: Current vs Optimized
   - Auto-optimize button (runs optimization algorithm)

**Data Structure:**
```typescript
interface MMMResults {
  modelId: string
  status: 'draft' | 'running' | 'completed' | 'failed'
  lastRunAt: Date
  modelFit: {
    r2: number
    mape: number
    bayesianR2: number
  }
  channels: Array<{
    channel: string
    contributionPercent: number
    currentRoi: number
    marginalRoi: number
    saturationPoint: number
    optimalSpend: number
    currentSpend: number
  }>
  saturationCurves: Array<{
    channel: string
    curve: Array<{ spend: number; revenue: number }>
  }>
}
```

### Incrementality Page (/admin/attribution/incrementality)

Geo-holdout experiment management.

**UI Components:**

1. **Experiment List**
   - Table of all experiments
   - Status: draft, running, completed, cancelled
   - Columns: Name, Platform, Test Period, Status, Lift Result

2. **Create Experiment Modal**
   - Experiment name
   - Platform selection (Meta, Google, TikTok)
   - Test regions (states/countries)
   - Control regions (holdout states/countries)
   - Start date, end date
   - Pre-test days (for baseline)
   - Budget impact estimate

3. **Experiment Detail Page**
   - Status header with progress indicator
   - Test vs Control performance comparison
   - Daily spend and conversion charts

4. **Results Dashboard** (for completed experiments)
   - Incremental lift percentage
   - Incremental revenue (attributed to ads)
   - P-value and statistical significance
   - Confidence interval
   - Recommendation summary

**Data Structure:**
```typescript
interface IncrementalityExperiment {
  id: string
  name: string
  platform: 'meta' | 'google' | 'tiktok'
  status: 'draft' | 'running' | 'completed' | 'cancelled'
  testRegions: string[]
  controlRegions: string[]
  startDate: Date
  endDate: Date
  preTestDays: number
  budgetEstimate: number
  results?: {
    incrementalLiftPercent: number
    incrementalRevenue: number
    pValue: number
    isSignificant: boolean
    confidenceInterval: { lower: number; upper: number }
    recommendation: string
  }
}
```

### AI Insights Page (/admin/attribution/ai-insights)

Automated anomaly detection and trend analysis.

**UI Components:**

1. **Date Range Filter**
   - Select analysis period
   - Default: Last 30 days

2. **Executive Summary Card**
   - AI-generated 2-3 sentence summary
   - Key metrics snapshot
   - Overall health indicator

3. **Anomalies Section**
   - List of detected anomalies
   - Each anomaly: type, severity, affected metric, date range
   - Confidence level (high/medium/low)
   - Recommended action

4. **Trends Section**
   - List of identified trends
   - Each trend: direction (up/down), metric, magnitude
   - Time period of trend
   - Projected impact if trend continues

5. **Recommendations Section**
   - Actionable recommendations based on analysis
   - Priority ranking
   - Estimated impact
   - Click to expand for details

**Data Structure:**
```typescript
interface AIInsightsData {
  dateRange: { start: Date; end: Date }
  executiveSummary: string
  healthScore: number // 0-100
  anomalies: Array<{
    id: string
    type: 'spike' | 'drop' | 'pattern_break' | 'outlier'
    severity: 'critical' | 'warning' | 'info'
    metric: string
    dateRange: { start: Date; end: Date }
    description: string
    confidence: 'high' | 'medium' | 'low'
    recommendation: string
  }>
  trends: Array<{
    id: string
    direction: 'up' | 'down' | 'stable'
    metric: string
    magnitude: number // percentage change
    period: string
    description: string
    projectedImpact: string
  }>
  recommendations: Array<{
    id: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    estimatedImpact: string
    actionSteps: string[]
  }>
}
```

---

## Constraints

- MMM training must complete within 30 minutes (async job)
- AI insights generation uses Claude API with tenant context
- Incrementality experiments require sufficient statistical power
- Journey visualization limited to 50 recent conversions for performance
- All ML models trained per-tenant (no cross-tenant data)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for journey timeline and MMM visualizations
- Context7 MCP: "D3.js timeline visualization"
- Context7 MCP: "Recharts area chart with multiple series"

**RAWDOG code to reference:**
- `src/app/admin/attribution/journeys/page.tsx` - Journey visualization
- `src/app/admin/attribution/mmm/page.tsx` - MMM dashboard
- `src/app/admin/attribution/incrementality/page.tsx` - Geo-holdout
- `src/app/admin/attribution/ai-insights/page.tsx` - AI analysis
- `src/lib/attribution/ml/bayesian-mmm.ts` - MMM algorithm
- `src/lib/attribution/ml/geo-holdout.ts` - Incrementality
- `src/lib/attribution/insights-engine.ts` - AI insights

---

## AI Discretion Areas

1. Journey timeline visualization library (D3 vs custom SVG)
2. MMM training algorithm parameters
3. Anomaly detection thresholds
4. AI prompt engineering for insights generation

---

## Tasks

### [PARALLEL] Journeys Page
- [ ] Create `apps/admin/src/app/admin/attribution/journeys/page.tsx`
- [ ] Create journey list with search and filters
- [ ] Create horizontal timeline component
- [ ] Create journey detail slide-out panel
- [ ] Create path analysis summary section
- [ ] Implement model-specific credit display tabs

### [PARALLEL] MMM Page
- [ ] Create `apps/admin/src/app/admin/attribution/mmm/page.tsx`
- [ ] Create MMM configuration form
- [ ] Create channel contributions table
- [ ] Create saturation curves chart
- [ ] Create budget optimizer with sliders
- [ ] Implement async model training trigger

### [PARALLEL] Incrementality Page
- [ ] Create `apps/admin/src/app/admin/attribution/incrementality/page.tsx`
- [ ] Create experiment list table
- [ ] Create experiment creation modal
- [ ] Create experiment detail page
- [ ] Create results dashboard with significance display
- [ ] Implement experiment status tracking

### [PARALLEL] AI Insights Page
- [ ] Create `apps/admin/src/app/admin/attribution/ai-insights/page.tsx`
- [ ] Create executive summary card
- [ ] Create anomalies list component
- [ ] Create trends list component
- [ ] Create recommendations section
- [ ] Implement Claude API integration for insights generation

### [SEQUENTIAL after pages] ML Pipeline Integration
- [ ] Configure background job for MMM training (PHASE-5D)
- [ ] Configure background job for insights generation (PHASE-5D)
- [ ] Set up per-tenant model storage
- [ ] Implement model versioning

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/attribution/journeys` | GET | List customer journeys |
| `/api/admin/attribution/journeys/[id]` | GET | Single journey detail |
| `/api/admin/attribution/journeys/paths` | GET | Path analysis |
| `/api/admin/attribution/mmm` | GET | MMM results |
| `/api/admin/attribution/mmm/run` | POST | Trigger MMM training |
| `/api/admin/attribution/mmm/optimize` | POST | Run budget optimization |
| `/api/admin/attribution/incrementality` | GET | List experiments |
| `/api/admin/attribution/incrementality` | POST | Create experiment |
| `/api/admin/attribution/incrementality/[id]` | GET/PUT/DELETE | Manage experiment |
| `/api/admin/attribution/ai-insights` | GET | Get AI insights |
| `/api/admin/attribution/ai-insights/generate` | POST | Force regenerate |

---

## Database Tables

```sql
-- Incrementality experiments
CREATE TABLE incrementality_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  test_regions TEXT[] NOT NULL,
  control_regions TEXT[] NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pre_test_days INTEGER NOT NULL DEFAULT 14,
  budget_estimate NUMERIC(12,2),
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MMM model storage
CREATE TABLE mmm_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  channels TEXT[] NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  model_fit JSONB,
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- AI insights cache
CREATE TABLE ai_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  insights JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date_range_start, date_range_end)
);
```

---

## Definition of Done

- [ ] Journeys show touchpoint paths with timeline
- [ ] MMM displays channel contributions and saturation curves
- [ ] Incrementality experiments can be created and monitored
- [ ] AI insights surface anomalies and recommendations
- [ ] All pages respect tenant isolation
- [ ] Background job integration points documented
- [ ] `npx tsc --noEmit` passes
- [ ] Mobile responsive at 390px
