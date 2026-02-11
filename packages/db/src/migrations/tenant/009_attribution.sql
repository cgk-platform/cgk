-- Attribution Core Tables
-- Settings, touchpoints, conversions, and data quality tracking

-- Attribution Settings table (per-tenant configuration)
CREATE TABLE IF NOT EXISTS attribution_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Global settings
  enabled BOOLEAN NOT NULL DEFAULT true,
  default_model TEXT NOT NULL DEFAULT 'time_decay',
  default_window TEXT NOT NULL DEFAULT '7d',
  attribution_mode TEXT NOT NULL DEFAULT 'clicks_only',

  -- Enabled models (array of: first_touch, last_touch, linear, time_decay, position_based, data_driven, last_non_direct)
  enabled_models TEXT[] NOT NULL DEFAULT ARRAY['first_touch','last_touch','linear','time_decay','position_based','data_driven','last_non_direct'],

  -- Enabled windows (array of: 1d, 3d, 7d, 14d, 28d, 30d, 90d, ltv)
  enabled_windows TEXT[] NOT NULL DEFAULT ARRAY['1d','7d','14d','28d','30d'],

  -- Model-specific configuration
  time_decay_half_life_hours INTEGER NOT NULL DEFAULT 168,
  position_based_weights JSONB NOT NULL DEFAULT '{"first": 40, "middle": 20, "last": 40}',

  -- Fairing integration
  fairing_bridge_enabled BOOLEAN NOT NULL DEFAULT false,
  fairing_sync_interval TEXT NOT NULL DEFAULT 'hourly',
  fairing_last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT attribution_settings_one_per_tenant UNIQUE(tenant_id)
);

-- Attribution Touchpoints table (stores all marketing interactions)
CREATE TABLE IF NOT EXISTS attribution_touchpoints (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Visitor/session info
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  customer_id TEXT,

  -- Channel and source info
  channel TEXT NOT NULL,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,

  -- Platform-specific identifiers
  platform TEXT,
  ad_id TEXT,
  adset_id TEXT,
  campaign_id TEXT,

  -- Click identifiers
  fbclid TEXT,
  gclid TEXT,
  ttclid TEXT,
  msclkid TEXT,
  nbt TEXT,

  -- Interaction type
  touchpoint_type TEXT NOT NULL DEFAULT 'click',
  landing_page TEXT,
  referrer TEXT,

  -- Device info
  device_type TEXT,
  device_fingerprint TEXT,

  -- Timestamp
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attribution Conversions table (stores conversion events)
CREATE TABLE IF NOT EXISTS attribution_conversions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Order/conversion info
  order_id TEXT NOT NULL,
  order_number TEXT,
  customer_id TEXT,

  -- Revenue info
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Conversion type
  conversion_type TEXT NOT NULL DEFAULT 'purchase',
  is_first_purchase BOOLEAN DEFAULT false,

  -- Timestamp
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attribution Results table (stores calculated attribution per model/window)
CREATE TABLE IF NOT EXISTS attribution_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- References
  conversion_id TEXT NOT NULL REFERENCES attribution_conversions(id) ON DELETE CASCADE,
  touchpoint_id TEXT NOT NULL REFERENCES attribution_touchpoints(id) ON DELETE CASCADE,

  -- Attribution model and window
  model TEXT NOT NULL,
  window TEXT NOT NULL,

  -- Attribution credit
  credit DECIMAL(10,6) NOT NULL DEFAULT 0,
  attributed_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Position in journey
  touchpoint_position INTEGER NOT NULL,
  total_touchpoints INTEGER NOT NULL,

  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attribution Data Quality Snapshots (historical tracking health)
CREATE TABLE IF NOT EXISTS attribution_data_quality_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Coverage metrics
  coverage_score INTEGER NOT NULL,
  orders_with_attribution INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,

  -- Visit coverage percentages
  session_id_coverage INTEGER NOT NULL DEFAULT 0,
  visitor_id_coverage INTEGER NOT NULL DEFAULT 0,
  email_hash_coverage INTEGER NOT NULL DEFAULT 0,
  device_fingerprint_coverage INTEGER NOT NULL DEFAULT 0,

  -- Pixel health
  pixel_health JSONB NOT NULL DEFAULT '{}',

  -- Server-side events
  server_side_events JSONB NOT NULL DEFAULT '{}',

  -- Webhook queue health
  webhook_pending INTEGER NOT NULL DEFAULT 0,
  webhook_failed INTEGER NOT NULL DEFAULT 0,
  webhook_processing_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  webhook_avg_latency_ms INTEGER NOT NULL DEFAULT 0,

  -- Device graph
  cross_device_match_rate INTEGER NOT NULL DEFAULT 0,
  identity_resolution_rate INTEGER NOT NULL DEFAULT 0,
  visitors_linked INTEGER NOT NULL DEFAULT 0,

  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT attribution_dq_one_per_day UNIQUE(tenant_id, snapshot_date)
);

-- Attribution Channel Summary (aggregated metrics by channel)
CREATE TABLE IF NOT EXISTS attribution_channel_summary (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Period
  date DATE NOT NULL,
  model TEXT NOT NULL,
  window TEXT NOT NULL,

  -- Channel info
  channel TEXT NOT NULL,
  platform TEXT,

  -- Metrics
  touchpoints INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  spend DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Calculated metrics
  roas DECIMAL(10,4),
  cpa DECIMAL(10,2),
  conversion_rate DECIMAL(10,4),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT attribution_channel_unique UNIQUE(tenant_id, date, model, window, channel, platform)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attribution_settings_tenant ON attribution_settings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_attribution_touchpoints_tenant ON attribution_touchpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attribution_touchpoints_visitor ON attribution_touchpoints(visitor_id);
CREATE INDEX IF NOT EXISTS idx_attribution_touchpoints_customer ON attribution_touchpoints(customer_id);
CREATE INDEX IF NOT EXISTS idx_attribution_touchpoints_occurred ON attribution_touchpoints(occurred_at);
CREATE INDEX IF NOT EXISTS idx_attribution_touchpoints_channel ON attribution_touchpoints(channel);
CREATE INDEX IF NOT EXISTS idx_attribution_touchpoints_tenant_date ON attribution_touchpoints(tenant_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_attribution_conversions_tenant ON attribution_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attribution_conversions_order ON attribution_conversions(order_id);
CREATE INDEX IF NOT EXISTS idx_attribution_conversions_customer ON attribution_conversions(customer_id);
CREATE INDEX IF NOT EXISTS idx_attribution_conversions_converted ON attribution_conversions(converted_at);
CREATE INDEX IF NOT EXISTS idx_attribution_conversions_tenant_date ON attribution_conversions(tenant_id, converted_at);

CREATE INDEX IF NOT EXISTS idx_attribution_results_tenant ON attribution_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_conversion ON attribution_results(conversion_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_touchpoint ON attribution_results(touchpoint_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_model_window ON attribution_results(model, window);

CREATE INDEX IF NOT EXISTS idx_attribution_dq_tenant ON attribution_data_quality_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attribution_dq_date ON attribution_data_quality_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_attribution_channel_tenant ON attribution_channel_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attribution_channel_date ON attribution_channel_summary(date);
CREATE INDEX IF NOT EXISTS idx_attribution_channel_lookup ON attribution_channel_summary(tenant_id, date, model, window);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_attribution_settings_updated_at ON attribution_settings;
CREATE TRIGGER update_attribution_settings_updated_at
  BEFORE UPDATE ON attribution_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_attribution_channel_updated_at ON attribution_channel_summary;
CREATE TRIGGER update_attribution_channel_updated_at
  BEFORE UPDATE ON attribution_channel_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE attribution_settings IS 'Tenant attribution configuration and model preferences';
COMMENT ON TABLE attribution_touchpoints IS 'Marketing interaction touchpoints for attribution';
COMMENT ON TABLE attribution_conversions IS 'Conversion events (purchases, signups, etc.)';
COMMENT ON TABLE attribution_results IS 'Calculated attribution credit per touchpoint/model/window';
COMMENT ON TABLE attribution_data_quality_snapshots IS 'Historical tracking health metrics';
COMMENT ON TABLE attribution_channel_summary IS 'Aggregated attribution metrics by channel';
