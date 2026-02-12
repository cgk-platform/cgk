-- Commerce Analytics Schema
-- Tenant-scoped analytics tables for reports, targets, P&L data, and Slack alerts

-- Custom reports table
CREATE TABLE IF NOT EXISTS analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'custom', -- preset, custom
  config JSONB NOT NULL DEFAULT '{}', -- dimensions, metrics, filters, visualization
  schedule JSONB, -- cron expression, email recipients, enabled
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report runs / execution history
CREATE TABLE IF NOT EXISTS analytics_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES analytics_reports(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  result_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics targets/goals
CREATE TABLE IF NOT EXISTS analytics_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric VARCHAR(100) NOT NULL, -- revenue, cac, ltv, roas, aov, conversion_rate
  target_value DECIMAL(15,2) NOT NULL,
  period VARCHAR(50) NOT NULL, -- monthly, quarterly, yearly
  period_start DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric, period, period_start)
);

-- Slack notification configuration
CREATE TABLE IF NOT EXISTS analytics_slack_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL, -- revenue_daily, revenue_milestone, revenue_threshold, high_value_order, order_spike, first_time_customer, churn_spike, mrr_milestone, failed_payments, low_stock, out_of_stock, reorder_needed
  channel_id VARCHAR(100) NOT NULL,
  channel_name VARCHAR(255),
  config JSONB NOT NULL DEFAULT '{}', -- threshold, frequency (realtime, daily, weekly), conditions
  is_enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- P&L data cache (pre-computed P&L breakdowns)
CREATE TABLE IF NOT EXISTS pl_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(50) NOT NULL, -- daily, monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL, -- full P&L breakdown structure
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_type, period_start)
);

-- Analytics settings
CREATE TABLE IF NOT EXISTS analytics_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Data source connections
  shopify_connected BOOLEAN DEFAULT false,
  shopify_last_sync_at TIMESTAMPTZ,
  ga4_connected BOOLEAN DEFAULT false,
  ga4_property_id VARCHAR(100),
  ga4_last_sync_at TIMESTAMPTZ,
  meta_connected BOOLEAN DEFAULT false,
  meta_account_id VARCHAR(100),
  meta_last_sync_at TIMESTAMPTZ,
  google_ads_connected BOOLEAN DEFAULT false,
  google_ads_account_id VARCHAR(100),
  google_ads_last_sync_at TIMESTAMPTZ,
  tiktok_connected BOOLEAN DEFAULT false,
  tiktok_account_id VARCHAR(100),
  tiktok_last_sync_at TIMESTAMPTZ,

  -- Refresh settings
  auto_refresh_enabled BOOLEAN DEFAULT true,
  refresh_frequency VARCHAR(50) DEFAULT 'hourly', -- hourly, daily, manual

  -- Attribution settings reference (uses attribution_settings table)

  -- Display preferences
  default_date_range VARCHAR(50) DEFAULT '30d', -- 7d, 14d, 30d, 90d, custom
  default_currency VARCHAR(10) DEFAULT 'USD',
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  fiscal_year_start_month INT DEFAULT 1, -- 1=January

  -- Export settings
  default_export_format VARCHAR(20) DEFAULT 'csv', -- csv, excel, pdf
  export_include_headers BOOLEAN DEFAULT true,
  export_date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated daily metrics cache for quick dashboard loading
CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  -- Revenue metrics
  gross_sales_cents BIGINT DEFAULT 0,
  discounts_cents BIGINT DEFAULT 0,
  refunds_cents BIGINT DEFAULT 0,
  net_revenue_cents BIGINT DEFAULT 0,
  -- Order metrics
  total_orders INT DEFAULT 0,
  new_customer_orders INT DEFAULT 0,
  returning_customer_orders INT DEFAULT 0,
  avg_order_value_cents BIGINT DEFAULT 0,
  -- Customer metrics
  new_customers INT DEFAULT 0,
  returning_customers INT DEFAULT 0,
  total_customers INT DEFAULT 0,
  -- Conversion metrics
  sessions INT DEFAULT 0,
  cart_adds INT DEFAULT 0,
  checkouts_initiated INT DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  cart_abandonment_rate DECIMAL(5,4) DEFAULT 0,
  -- Spend metrics (from ad platforms)
  total_ad_spend_cents BIGINT DEFAULT 0,
  meta_spend_cents BIGINT DEFAULT 0,
  google_spend_cents BIGINT DEFAULT 0,
  tiktok_spend_cents BIGINT DEFAULT 0,
  other_spend_cents BIGINT DEFAULT 0,
  -- Efficiency metrics
  roas DECIMAL(10,4) DEFAULT 0,
  blended_roas DECIMAL(10,4) DEFAULT 0,
  cac_cents BIGINT DEFAULT 0,
  -- Timestamp
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- Geographic metrics cache
CREATE TABLE IF NOT EXISTS analytics_geo_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  country VARCHAR(2) NOT NULL, -- ISO country code
  region VARCHAR(100), -- state/province
  city VARCHAR(255),
  -- Metrics
  revenue_cents BIGINT DEFAULT 0,
  orders INT DEFAULT 0,
  new_customers INT DEFAULT 0,
  returning_customers INT DEFAULT 0,
  avg_order_value_cents BIGINT DEFAULT 0,
  avg_shipping_cents BIGINT DEFAULT 0,
  -- Top products (stored as JSONB array)
  top_products JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, country, region, city)
);

-- BRI (Brand Relationship Intelligence) conversation analytics
CREATE TABLE IF NOT EXISTS analytics_bri_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel VARCHAR(50) NOT NULL, -- chat, voice, email
  -- Volume metrics
  total_conversations INT DEFAULT 0,
  automated_resolutions INT DEFAULT 0,
  human_handoffs INT DEFAULT 0,
  escalations INT DEFAULT 0,
  -- Performance metrics
  avg_response_time_seconds INT DEFAULT 0,
  resolution_rate DECIMAL(5,4) DEFAULT 0,
  csat_score DECIMAL(3,2) DEFAULT 0,
  -- AI metrics
  avg_confidence_score DECIMAL(5,4) DEFAULT 0,
  accuracy_rate DECIMAL(5,4) DEFAULT 0,
  hallucination_rate DECIMAL(5,4) DEFAULT 0,
  -- Cost metrics
  estimated_cost_savings_cents BIGINT DEFAULT 0,
  -- Topics (JSONB array of {topic, count})
  top_topics JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, channel)
);

-- Pipeline/funnel metrics
CREATE TABLE IF NOT EXISTS analytics_pipeline_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  source VARCHAR(100), -- channel source (optional for aggregate)
  -- Awareness stage
  website_visitors INT DEFAULT 0,
  ad_impressions INT DEFAULT 0,
  social_reach INT DEFAULT 0,
  -- Interest stage
  product_page_views INT DEFAULT 0,
  email_signups INT DEFAULT 0,
  wishlist_adds INT DEFAULT 0,
  -- Consideration stage
  add_to_cart INT DEFAULT 0,
  checkout_initiated INT DEFAULT 0,
  email_engaged INT DEFAULT 0,
  -- Conversion stage
  purchases INT DEFAULT 0,
  purchase_value_cents BIGINT DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  avg_order_value_cents BIGINT DEFAULT 0,
  -- Retention stage
  repeat_purchases INT DEFAULT 0,
  subscription_signups INT DEFAULT 0,
  loyalty_joins INT DEFAULT 0,
  -- Velocity metrics (avg days between stages)
  awareness_to_interest_days DECIMAL(5,2) DEFAULT 0,
  interest_to_consideration_days DECIMAL(5,2) DEFAULT 0,
  consideration_to_conversion_days DECIMAL(5,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, source)
);

-- Burn rate / cash flow tracking
CREATE TABLE IF NOT EXISTS analytics_burn_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Cash position
  opening_balance_cents BIGINT DEFAULT 0,
  closing_balance_cents BIGINT DEFAULT 0,
  -- Inflows
  revenue_cents BIGINT DEFAULT 0,
  other_income_cents BIGINT DEFAULT 0,
  total_inflow_cents BIGINT DEFAULT 0,
  -- Outflows
  cogs_cents BIGINT DEFAULT 0,
  marketing_cents BIGINT DEFAULT 0,
  payroll_cents BIGINT DEFAULT 0,
  software_cents BIGINT DEFAULT 0,
  shipping_cents BIGINT DEFAULT 0,
  payment_processing_cents BIGINT DEFAULT 0,
  other_opex_cents BIGINT DEFAULT 0,
  total_outflow_cents BIGINT DEFAULT 0,
  -- Net
  net_cash_flow_cents BIGINT DEFAULT 0,
  -- Calculated metrics
  burn_rate_cents BIGINT DEFAULT 0, -- monthly burn rate (normalized)
  runway_months DECIMAL(5,2) DEFAULT 0,
  break_even_revenue_cents BIGINT DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_type, period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON analytics_reports(type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_created_by ON analytics_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_report_runs_report_id ON analytics_report_runs(report_id);
CREATE INDEX IF NOT EXISTS idx_analytics_report_runs_status ON analytics_report_runs(status);
CREATE INDEX IF NOT EXISTS idx_analytics_targets_metric ON analytics_targets(metric);
CREATE INDEX IF NOT EXISTS idx_analytics_targets_period ON analytics_targets(period, period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_slack_alerts_type ON analytics_slack_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_analytics_slack_alerts_enabled ON analytics_slack_alerts(is_enabled);
CREATE INDEX IF NOT EXISTS idx_pl_data_period ON pl_data(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_date ON analytics_daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_geo_metrics_date ON analytics_geo_metrics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_geo_metrics_country ON analytics_geo_metrics(country);
CREATE INDEX IF NOT EXISTS idx_analytics_bri_metrics_date ON analytics_bri_metrics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_bri_metrics_channel ON analytics_bri_metrics(channel);
CREATE INDEX IF NOT EXISTS idx_analytics_pipeline_metrics_date ON analytics_pipeline_metrics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_burn_rate_period ON analytics_burn_rate(period_type, period_start);

-- Insert default analytics settings row
INSERT INTO analytics_settings (id) VALUES (gen_random_uuid());
