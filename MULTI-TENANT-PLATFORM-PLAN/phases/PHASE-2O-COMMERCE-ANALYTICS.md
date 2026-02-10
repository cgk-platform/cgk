# PHASE-2O: Commerce - Analytics Complete System

**Duration**: 1 week (after PHASE-2B)
**Depends On**: PHASE-2B-ADMIN-COMMERCE (base analytics overview)
**Parallel With**: PHASE-2O-COMMERCE-SUBSCRIPTIONS, PHASE-2O-COMMERCE-REVIEWS

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Analytics contains aggregated revenue and customer data - highly sensitive.
- ALL analytics queries use `withTenant(tenantId, ...)`
- Revenue metrics never cross tenant boundaries
- Customer cohort data tenant-scoped
- Export data includes only tenant's data

---

## Goal

Document and specify the complete commerce analytics system including all 6 sub-pages plus 6 dashboard tabs: main dashboard, BRI analytics, pipeline, P&L breakdown, reports, and settings. Tabs include: Unit Economics, Spend Sensitivity, Geography, Burn Rate, Platform Data, and Slack Notifications.

---

## Success Criteria

- [ ] All 6 analytics admin pages fully specified
- [ ] All 6 dashboard tabs documented
- [ ] Revenue metrics with accurate calculations
- [ ] Attribution integration points defined
- [ ] Custom report builder specified
- [ ] Export functionality complete
- [ ] Slack notification system

---

## Complete Page Specifications

### 1. `/admin/analytics` - Main Analytics Dashboard

**Purpose**: Central analytics hub with key commerce metrics

**Tab Navigation**:
- Unit Economics
- Spend Sensitivity
- Geography
- Burn Rate
- Platform Data
- Slack Notifications

---

#### Tab 1: Unit Economics

**Purpose**: Per-unit profitability analysis

**Metrics**:
1. **Customer Acquisition**:
   - CAC (Customer Acquisition Cost)
   - CAC by channel
   - CAC trend over time

2. **Customer Value**:
   - LTV (Customer Lifetime Value)
   - LTV:CAC ratio
   - Average Order Value (AOV)
   - Purchase frequency
   - Retention rate

3. **Product Economics**:
   - COGS per product
   - Gross margin per product
   - Contribution margin
   - Fully-loaded unit economics

4. **Cohort Economics**:
   - LTV by acquisition month
   - Payback period by cohort
   - Revenue per customer over time

**Visualization**:
- LTV:CAC ratio gauge (healthy >3:1)
- Margin waterfall chart
- Cohort retention heatmap

---

#### Tab 2: Spend Sensitivity

**Purpose**: Analyze relationship between ad spend and revenue

**Metrics**:
1. **Spend Overview**:
   - Total ad spend (all channels)
   - Spend by channel (Meta, Google, TikTok)
   - Spend trend

2. **Efficiency Metrics**:
   - ROAS (Return on Ad Spend)
   - CPO (Cost Per Order)
   - CPA (Cost Per Acquisition)
   - Blended ROAS

3. **Sensitivity Analysis**:
   - Marginal ROAS curve
   - Optimal spend range
   - Diminishing returns threshold

4. **Channel Comparison**:
   - ROAS by channel
   - Spend efficiency ranking
   - Cross-channel attribution impact

**Visualization**:
- Spend vs Revenue scatter plot
- Marginal ROAS curve
- Channel efficiency comparison

---

#### Tab 3: Geography

**Purpose**: Geographic performance analysis

**Metrics**:
1. **Revenue by Region**:
   - Revenue by country
   - Revenue by state/region
   - Revenue by city (top 20)

2. **Customer Distribution**:
   - Customers by location
   - New vs returning by region
   - Acquisition source by region

3. **Product Preferences**:
   - Best-selling products by region
   - AOV by region
   - Subscription rate by region

4. **Shipping Analysis**:
   - Avg shipping cost by zone
   - Delivery time by zone
   - Shipping method by region

**Visualization**:
- Interactive map with revenue overlay
- Regional comparison charts
- Heat map of customer density

---

#### Tab 4: Burn Rate

**Purpose**: Financial runway and cash flow analysis

**Metrics**:
1. **Cash Position**:
   - Current cash balance
   - Cash in (revenue)
   - Cash out (expenses)
   - Net cash flow

2. **Burn Rate**:
   - Monthly burn rate
   - Burn rate trend
   - Fixed vs variable costs
   - Runway (months remaining)

3. **Break-Even Analysis**:
   - Current vs break-even revenue
   - Orders needed to break even
   - Path to profitability

4. **Forecast**:
   - Projected revenue (next 3/6/12 months)
   - Projected expenses
   - Projected runway

**Visualization**:
- Runway countdown
- Cash flow waterfall
- Burn rate trend line

---

#### Tab 5: Platform Data

**Purpose**: E-commerce platform metrics (Shopify, etc.)

**Metrics**:
1. **Store Health**:
   - Total orders (period)
   - Total revenue (period)
   - Average order value
   - Conversion rate

2. **Product Performance**:
   - Top selling products
   - Inventory levels
   - Low stock alerts
   - Velocity by product

3. **Customer Metrics**:
   - New customers
   - Returning customers
   - Customer retention rate
   - Repeat purchase rate

4. **Cart & Checkout**:
   - Cart abandonment rate
   - Checkout completion rate
   - Payment success rate
   - Average cart size

**Data Sources**:
- Shopify Analytics API
- Stripe dashboard
- Google Analytics

---

#### Tab 6: Slack Notifications

**Purpose**: Configure analytics alerts to Slack

**Alert Types**:
1. **Revenue Alerts**:
   - Daily revenue summary
   - Revenue milestone reached
   - Revenue below threshold

2. **Order Alerts**:
   - High-value order placed
   - Order volume spike/drop
   - First-time customer order

3. **Subscription Alerts**:
   - Churn spike
   - MRR milestone
   - Failed payments

4. **Inventory Alerts**:
   - Low stock warning
   - Out of stock
   - Reorder needed

**Configuration**:
- Slack channel selection
- Alert frequency (real-time, daily, weekly)
- Threshold configuration
- Enable/disable per alert type
- Time window (business hours only option)

---

### 2. `/admin/analytics/bri` - BRI Analytics

**Purpose**: Analytics for BRI (Brand Relationship Intelligence) AI interactions

**Sections**:
1. **Conversation Volume**:
   - Total conversations
   - Conversations by channel (chat, voice, email)
   - Peak times

2. **Performance Metrics**:
   - Response time
   - Resolution rate
   - Escalation rate
   - Customer satisfaction (CSAT)

3. **Topic Analysis**:
   - Common topics/intents
   - Trending issues
   - Topic resolution time

4. **AI Efficiency**:
   - Automated resolution rate
   - AI confidence scores
   - Human handoff rate
   - Cost savings

5. **Quality Metrics**:
   - Accuracy rate
   - Hallucination rate
   - Customer feedback

**Date Range**: Last 7d, 30d, 90d, Custom

---

### 3. `/admin/analytics/pipeline` - Sales Pipeline

**Purpose**: Visualize and analyze the sales funnel

**Pipeline Stages**:
1. **Awareness**:
   - Website visitors
   - Ad impressions
   - Social reach

2. **Interest**:
   - Product page views
   - Email signups
   - Wishlist adds

3. **Consideration**:
   - Add to cart
   - Checkout initiated
   - Email engaged

4. **Conversion**:
   - Purchases
   - Conversion rate
   - AOV

5. **Retention**:
   - Repeat purchases
   - Subscription signups
   - Loyalty program joins

**Visualization**:
- Funnel chart with conversion rates
- Drop-off analysis
- Stage-to-stage velocity

**Filters**:
- Date range
- Channel/source
- Product category
- Customer segment

---

### 4. `/admin/analytics/pl-breakdown` - P&L Breakdown

**Purpose**: Detailed profit and loss analysis

**P&L Structure**:
```
Revenue
├── Gross Sales
├── - Discounts
├── - Returns & Refunds
└── = Net Revenue

Cost of Goods Sold (COGS)
├── Product Cost
├── Shipping (inbound)
├── Packaging
└── = Gross Profit

Operating Expenses
├── Marketing
│   ├── Meta Ads
│   ├── Google Ads
│   ├── TikTok Ads
│   └── Other
├── Payroll
│   ├── Creators
│   ├── Contractors
│   └── Internal
├── Software/Tools
├── Shipping (outbound)
├── Payment Processing
│   ├── Stripe fees
│   └── Shopify fees
└── Other OpEx

= Operating Profit (EBITDA)

Other
├── Interest
├── Taxes
└── Depreciation

= Net Profit
```

**Features**:
- Expandable/collapsible categories
- Period comparison (vs previous)
- Percentage of revenue
- Trend sparklines
- Export to Excel

**Views**:
- Monthly P&L
- Quarterly P&L
- YTD P&L
- Custom date range

---

### 5. `/admin/analytics/reports` - Custom Reports

**Purpose**: Build and run custom analytics reports

**Report Types**:
1. **Pre-Built Reports**:
   - Sales Summary
   - Product Performance
   - Customer Cohort
   - Channel Attribution
   - Subscription Health
   - Marketing ROI

2. **Custom Report Builder**:
   - Select dimensions (date, product, channel, etc.)
   - Select metrics (revenue, orders, customers, etc.)
   - Apply filters
   - Choose visualization
   - Save as template

**Report Features**:
- Schedule recurring reports
- Email delivery
- Export (CSV, Excel, PDF)
- Share link (read-only)
- Dashboard pins

**Saved Reports**:
- List of saved reports
- Run history
- Edit/delete
- Duplicate

---

### 6. `/admin/analytics/settings` - Analytics Settings

**Purpose**: Configure analytics data sources and preferences

**Sections**:
1. **Data Sources**:
   - Shopify connection status
   - Google Analytics connection
   - Ad platform connections (Meta, Google, TikTok)
   - Refresh frequency

2. **Attribution Settings**:
   - Default attribution window
   - Attribution model (first-touch, last-touch, linear, etc.)
   - Cross-device tracking

3. **Goals & Targets**:
   - Revenue targets (monthly, quarterly)
   - CAC target
   - LTV target
   - ROAS target

4. **Display Preferences**:
   - Default date range
   - Currency display
   - Timezone
   - Fiscal year start

5. **Export Settings**:
   - Default export format
   - Include headers
   - Date format

---

## Integration Points

### With Attribution System (PHASE-22)

```typescript
interface AttributionData {
  // Channel-level attribution
  getChannelAttribution(dateRange: DateRange): Promise<ChannelAttribution[]>

  // Order-level attribution
  getOrderAttribution(orderId: string): Promise<OrderAttribution>

  // Aggregate metrics
  getAttributedRevenue(filters: AttributionFilters): Promise<AttributedRevenue>
}
```

### With Ad Platforms

```typescript
interface AdPlatformData {
  // Spend data
  getSpend(platform: AdPlatform, dateRange: DateRange): Promise<SpendData>

  // Performance data
  getPerformance(platform: AdPlatform, dateRange: DateRange): Promise<AdPerformance>

  // Campaign-level data
  getCampaignData(platform: AdPlatform, campaignId: string): Promise<CampaignData>
}
```

### With Shopify

```typescript
interface ShopifyAnalytics {
  // Store metrics
  getStoreMetrics(dateRange: DateRange): Promise<StoreMetrics>

  // Product metrics
  getProductMetrics(productId: string, dateRange: DateRange): Promise<ProductMetrics>

  // Customer metrics
  getCustomerMetrics(dateRange: DateRange): Promise<CustomerMetrics>
}
```

---

## Database Schema Additions

```sql
-- Custom reports
CREATE TABLE analytics_reports (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- preset, custom
  config JSONB NOT NULL, -- dimensions, metrics, filters, viz
  schedule JSONB, -- cron, email recipients
  created_by UUID REFERENCES users(id),
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report runs
CREATE TABLE analytics_report_runs (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES analytics_reports(id),
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  result_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics targets/goals
CREATE TABLE analytics_targets (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metric VARCHAR(100) NOT NULL, -- revenue, cac, ltv, roas
  target_value DECIMAL(15,2) NOT NULL,
  period VARCHAR(50) NOT NULL, -- monthly, quarterly, yearly
  period_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slack notification config
CREATE TABLE analytics_slack_alerts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  alert_type VARCHAR(100) NOT NULL,
  channel_id VARCHAR(100) NOT NULL,
  channel_name VARCHAR(255),
  config JSONB NOT NULL, -- threshold, frequency, etc.
  is_enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- P&L data cache
CREATE TABLE pl_data (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period_type VARCHAR(50) NOT NULL, -- daily, monthly, quarterly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL, -- full P&L breakdown
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_type, period_start)
);
```

---

## API Routes Required

```
-- Main Dashboard
GET    /api/admin/analytics/overview
GET    /api/admin/analytics/unit-economics
GET    /api/admin/analytics/spend-sensitivity
GET    /api/admin/analytics/geography
GET    /api/admin/analytics/burn-rate
GET    /api/admin/analytics/platform-data

-- BRI Analytics
GET    /api/admin/analytics/bri
GET    /api/admin/analytics/bri/conversations
GET    /api/admin/analytics/bri/topics

-- Pipeline
GET    /api/admin/analytics/pipeline
GET    /api/admin/analytics/pipeline/funnel
GET    /api/admin/analytics/pipeline/velocity

-- P&L
GET    /api/admin/analytics/pl-breakdown
GET    /api/admin/analytics/pl-breakdown/category/[category]
POST   /api/admin/analytics/pl-breakdown/recalculate

-- Reports
GET    /api/admin/analytics/reports
GET    /api/admin/analytics/reports/[id]
POST   /api/admin/analytics/reports
PUT    /api/admin/analytics/reports/[id]
DELETE /api/admin/analytics/reports/[id]
POST   /api/admin/analytics/reports/[id]/run
GET    /api/admin/analytics/reports/[id]/history

-- Settings
GET    /api/admin/analytics/settings
PUT    /api/admin/analytics/settings

-- Slack Alerts
GET    /api/admin/analytics/slack-alerts
POST   /api/admin/analytics/slack-alerts
PUT    /api/admin/analytics/slack-alerts/[id]
DELETE /api/admin/analytics/slack-alerts/[id]
POST   /api/admin/analytics/slack-alerts/test

-- Targets
GET    /api/admin/analytics/targets
POST   /api/admin/analytics/targets
PUT    /api/admin/analytics/targets/[id]
DELETE /api/admin/analytics/targets/[id]
```

---

## Definition of Done

- [ ] All 6 analytics pages documented with full specifications
- [ ] All 6 dashboard tabs fully specified
- [ ] Unit economics calculations accurate (LTV, CAC, margins)
- [ ] P&L breakdown with category drill-down
- [ ] Custom report builder specified
- [ ] Slack notification system complete
- [ ] Integration points with attribution defined
- [ ] All APIs listed with tenant isolation
- [ ] Database schema additions specified
