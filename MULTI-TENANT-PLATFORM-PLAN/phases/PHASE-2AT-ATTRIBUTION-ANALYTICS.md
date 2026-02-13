# PHASE-2AT-B: Attribution Analytics - Channels, Products, Creatives & Cohorts

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Completed**: 2026-02-10
**Duration**: 1.5 weeks (Week 10-11)
**Depends On**: PHASE-2AT-A (Attribution Core)
**Parallel With**: PHASE-2AT-C (Advanced Analytics)
**Blocks**: None

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All attribution queries MUST use `withTenant()` wrapper. Attribution data is strictly tenant-scoped.

---

## Goal

Build the core analytics pages for attribution: channel performance, product attribution, creative performance, cohort analysis, ROAS index, and model comparison. These pages provide the day-to-day operational insights for marketing teams.

---

## Success Criteria

- [x] Channels page shows hierarchical drill-down (channel → campaign → adset → ad)
- [x] Products page shows product-level attribution with scatterplot
- [x] Creatives page shows card gallery with comparison modal
- [x] Cohorts page shows LTV analysis by acquisition date
- [x] ROAS Index shows model comparison with AI recommendations
- [x] Model Comparison shows side-by-side table of all models
- [x] All pages respect model and time range selectors

---

## Deliverables

### Channels Page (/admin/attribution/channels)

Hierarchical drill-down into channel performance.

**UI Components:**

1. **Filter Bar**
   - Model selector (from layout context)
   - Time range picker (from layout context)
   - Quick filters: Top Performers, Underperformers, High Volume, Efficient

2. **Hierarchical Data Table**
   - Expandable rows: Channel → Campaign → Ad Set → Ad
   - Columns: Name, Spend, Revenue, Conversions, ROAS, CPA, New/Existing split
   - Sort by any column
   - Select rows for comparison

3. **Performance Trend Chart**
   - Line chart showing selected channels over time
   - Toggle between Revenue, ROAS, Conversions
   - Comparison mode when multiple rows selected

4. **New vs Existing Toggle**
   - Filter to show new customers only, existing only, or all
   - Updates all metrics accordingly

**Data Structure:**
```typescript
interface ChannelHierarchy {
  level: 'channel' | 'campaign' | 'adset' | 'ad'
  id: string
  name: string
  parentId: string | null
  spend: number
  revenue: number
  conversions: number
  roas: number
  cpa: number
  newCustomerRevenue: number
  existingCustomerRevenue: number
  children?: ChannelHierarchy[]
}
```

### Products Page (/admin/attribution/products)

Product-level attribution analysis.

**UI Components:**

1. **View Mode Tabs**
   - Product view (default)
   - Platform view
   - Campaign view
   - Ad view

2. **Scatterplot Chart**
   - X-axis: ROAS Index (performance vs benchmark)
   - Y-axis: CAC Index (efficiency vs benchmark)
   - Bubble size: Spend amount
   - Color: Platform (Meta=blue, Google=green, TikTok=red)
   - Hover tooltip with full metrics

3. **Metrics Table**
   - Product/Platform/Campaign name
   - Revenue, ROAS, CAC
   - Conversions, New Customer %, Existing Customer %
   - Sortable and searchable

4. **Benchmark Configuration**
   - Set ROAS benchmark (default: 3.0)
   - Set CAC benchmark (default: $30)
   - Quadrant labels (Stars, Cash Cows, Dogs, Question Marks)

**Data Structure:**
```typescript
interface ProductAttribution {
  id: string
  name: string
  imageUrl?: string
  spend: number
  revenue: number
  roas: number
  cac: number
  conversions: number
  newCustomerPercent: number
  roasIndex: number // vs benchmark
  cacIndex: number // vs benchmark
  platform?: string // for platform view
  campaignId?: string // for campaign view
}
```

### Creatives Page (/admin/attribution/creatives)

Creative performance analysis with visual gallery.

**UI Components:**

1. **Gallery Grid**
   - Card-based layout (responsive: 2-4 columns)
   - Thumbnail preview (video thumbnail or image)
   - Checkbox selection (max 6 for comparison)
   - Status badge (Active/Inactive)

2. **Creative Card**
   - Preview thumbnail
   - Creative name
   - Revenue, ROAS, Conversions
   - Platform badge
   - Selection checkbox

3. **Filters**
   - Search by name
   - Sort by Revenue/ROAS/Conversions
   - Hide inactive toggle
   - Platform filter (Meta, Google, TikTok)

4. **Saved Views**
   - Save current filter configuration
   - Load saved views from dropdown
   - Delete saved views

5. **Comparison Modal**
   - Side-by-side view of selected creatives (max 6)
   - All metrics compared
   - Visual preview comparison
   - New/Existing customer split

**Data Structure:**
```typescript
interface CreativePerformance {
  id: string
  name: string
  platform: 'meta' | 'google' | 'tiktok'
  thumbnailUrl: string
  type: 'image' | 'video'
  status: 'active' | 'inactive'
  spend: number
  revenue: number
  roas: number
  conversions: number
  impressions: number
  clicks: number
  ctr: number
  newCustomerRevenue: number
  existingCustomerRevenue: number
  visitCoverage: number // % of visits tracked
}
```

### Cohorts Page (/admin/attribution/cohorts)

Cohort analysis by acquisition date.

**UI Components:**

1. **Cohort Settings**
   - Grouping: Daily, Weekly, Monthly
   - Channel filter (all or specific)
   - Date range for cohorts

2. **Cohort Grid**
   - Rows: Cohort date (acquisition period)
   - Columns: Day 0, Day 7, Day 30, Day 60, Day 90, Day 180 LTV
   - Cell values: Cumulative LTV or revenue
   - Color coding: Green (healthy), Yellow (at risk), Red (poor)

3. **Metrics Table**
   - Cohort date
   - Customer count
   - CAC
   - Day 0 LTV
   - Day 30 LTV
   - Day 60 LTV
   - Payback days (when LTV > CAC)
   - 90-day retention %

4. **Trend Chart**
   - Line chart showing LTV curves for selected cohorts
   - Overlay up to 5 cohorts for comparison

**Data Structure:**
```typescript
interface CohortData {
  cohortDate: string // YYYY-MM or YYYY-Www or YYYY-MM-DD
  grouping: 'daily' | 'weekly' | 'monthly'
  customerCount: number
  cac: number
  ltv: {
    day0: number
    day7: number
    day30: number
    day60: number
    day90: number
    day180: number
  }
  paybackDays: number | null // null if not yet paid back
  retention90d: number
  health: 'healthy' | 'at_risk' | 'poor'
}
```

### ROAS Index Page (/admin/attribution/roas-index)

Compare how different models credit each channel.

**UI Components:**

1. **Model Grid**
   - Rows: Channels
   - Columns: Each attribution model
   - Cell: ROAS for that channel under that model
   - Highlight: Best/worst model for each channel

2. **AI Recommendations**
   - Recommendation card for each major channel
   - Which model best reflects true performance
   - Confidence level (high/medium/low)
   - Reasoning explanation

3. **Revenue Comparison Chart**
   - Grouped bar chart
   - Channels on X-axis
   - Bars for each model, showing attributed revenue
   - Easy visual comparison

**Data Structure:**
```typescript
interface RoasIndexData {
  channel: string
  modelResults: Record<AttributionModel, {
    revenue: number
    roas: number
    conversions: number
  }>
  aiRecommendation?: {
    recommendedModel: AttributionModel
    confidence: 'high' | 'medium' | 'low'
    reasoning: string
  }
}
```

### Model Comparison Page (/admin/attribution/model-comparison)

Side-by-side comparison of all attribution models.

**UI Components:**

1. **Comparison Table**
   - Fixed first column: Metric name
   - Scrollable columns: Each attribution model
   - Rows: Total Revenue, Total Conversions, Total Spend, Overall ROAS, Top Channel, etc.

2. **Model Descriptions**
   - Expandable section explaining each model
   - Use case recommendations
   - Pros and cons

3. **Visual Comparison**
   - Pie charts showing credit distribution per model
   - Same conversion, different credit allocation visualization

**Data Structure:**
```typescript
interface ModelComparisonData {
  model: AttributionModel
  description: string
  totalRevenue: number
  totalConversions: number
  totalSpend: number
  roas: number
  topChannel: string
  creditDistribution: Array<{ channel: string; percentage: number }>
}
```

---

## Constraints

- All pages must use shared model and time range selectors from layout
- Charts must handle loading and error states gracefully
- Tables must support virtual scrolling for large datasets (1000+ rows)
- Use consistent color palette across all charts
- All exports must respect current filters

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED before creating each page component
- Context7 MCP: "Recharts scatterplot with custom tooltips"
- Context7 MCP: "TanStack Table with expandable rows"

**RAWDOG code to reference:**
- `src/app/admin/attribution/channels/page.tsx` - Hierarchical drill-down
- `src/app/admin/attribution/products/page.tsx` - Scatterplot + table
- `src/app/admin/attribution/creatives/page.tsx` - Card gallery
- `src/app/admin/attribution/cohorts/page.tsx` - Cohort grid
- `src/app/admin/attribution/roas-index/page.tsx` - Model grid
- `src/app/admin/attribution/model-comparison/page.tsx` - Comparison table

---

## AI Discretion Areas

1. Virtual scrolling library choice (react-virtual vs react-window)
2. Cohort color gradient algorithm
3. AI recommendation generation approach
4. Saved views storage mechanism

---

## Tasks

### [PARALLEL] Channels Page
- [x] Create `apps/admin/src/app/admin/attribution/channels/page.tsx`
- [x] Create hierarchical data table with expandable rows
- [x] Implement channel → campaign → adset → ad drill-down
- [x] Create performance trend chart
- [x] Implement quick filters (top performers, etc.)
- [x] Add new/existing customer toggle

### [PARALLEL] Products Page
- [x] Create `apps/admin/src/app/admin/attribution/products/page.tsx`
- [x] Create scatterplot with ROAS Index vs CAC Index
- [x] Implement view mode tabs (product/platform/campaign/ad)
- [x] Create metrics table with sorting
- [x] Add benchmark configuration

### [PARALLEL] Creatives Page
- [x] Create `apps/admin/src/app/admin/attribution/creatives/page.tsx`
- [x] Create card gallery component
- [x] Implement selection and comparison modal
- [x] Create saved views functionality
- [x] Add search and filter controls

### [PARALLEL] Cohorts Page
- [x] Create `apps/admin/src/app/admin/attribution/cohorts/page.tsx`
- [x] Create cohort grid with color coding
- [x] Implement grouping (daily/weekly/monthly)
- [x] Create LTV curve chart
- [x] Add payback days calculation

### [PARALLEL] ROAS Index Page
- [x] Create `apps/admin/src/app/admin/attribution/roas-index/page.tsx`
- [x] Create model comparison grid
- [x] Implement AI recommendations display
- [x] Create revenue comparison chart

### [PARALLEL] Model Comparison Page
- [x] Create `apps/admin/src/app/admin/attribution/model-comparison/page.tsx`
- [x] Create side-by-side comparison table
- [x] Add model description expandables
- [x] Create credit distribution pie charts

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/attribution/channels/by-level` | GET | Hierarchical channel data |
| `/api/admin/attribution/products` | GET | Product attribution |
| `/api/admin/attribution/creatives` | GET | Creative performance |
| `/api/admin/attribution/cohorts` | GET | Cohort analysis |
| `/api/admin/attribution/roas-index` | GET | ROAS by model |
| `/api/admin/attribution/model-comparison` | GET | Model comparison |
| `/api/admin/attribution/creatives/saved-views` | GET/POST/DELETE | Saved view management |

---

## Definition of Done

- [x] All 6 pages render with data
- [x] Hierarchical drill-down works in channels
- [x] Scatterplot is interactive in products
- [x] Creative comparison modal works
- [x] Cohort grid shows correct LTV progression
- [x] ROAS Index shows all 7 models
- [x] Model comparison is clear and educational
- [x] All pages respect shared model/time selectors
- [x] Export to CSV works on all pages
- [x] `npx tsc --noEmit` passes (no errors in new files)
