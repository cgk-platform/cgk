-- Tenant settings tables
-- AI Settings, Payout Settings, Site Config, and Settings Audit Log

-- AI Settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Feature toggles
  ai_enabled BOOLEAN DEFAULT true,
  brii_enabled BOOLEAN DEFAULT false,
  ai_content_enabled BOOLEAN DEFAULT true,
  ai_insights_enabled BOOLEAN DEFAULT true,

  -- Model preferences
  ai_model_preference VARCHAR(20) DEFAULT 'auto',

  -- Limits
  ai_monthly_budget_usd DECIMAL(10,2),
  ai_current_month_usage_usd DECIMAL(10,2) DEFAULT 0,

  -- Content settings
  ai_content_auto_approve BOOLEAN DEFAULT false,

  -- Memory settings
  ai_memory_enabled BOOLEAN DEFAULT true,
  ai_memory_retention_days INTEGER DEFAULT 90,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT ai_settings_one_per_tenant UNIQUE(tenant_id)
);

-- Payout Settings table
CREATE TABLE IF NOT EXISTS payout_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Method preferences
  default_payment_method VARCHAR(20) DEFAULT 'stripe_connect',
  stripe_connect_enabled BOOLEAN DEFAULT true,
  paypal_enabled BOOLEAN DEFAULT true,
  wise_enabled BOOLEAN DEFAULT false,
  check_enabled BOOLEAN DEFAULT false,
  venmo_enabled BOOLEAN DEFAULT true,

  -- Schedule
  payout_schedule VARCHAR(20) DEFAULT 'weekly',
  payout_day INTEGER DEFAULT 5,

  -- Thresholds
  min_payout_threshold_usd DECIMAL(10,2) DEFAULT 10.00,
  max_pending_withdrawals INTEGER DEFAULT 3,
  hold_period_days INTEGER DEFAULT 7,

  -- Auto-payout
  auto_payout_enabled BOOLEAN DEFAULT true,

  -- Fees
  payout_fee_type VARCHAR(20) DEFAULT 'none',
  payout_fee_amount DECIMAL(10,4) DEFAULT 0,

  -- Compliance
  require_tax_info BOOLEAN DEFAULT true,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT payout_settings_one_per_tenant UNIQUE(tenant_id)
);

-- Site Config table
CREATE TABLE IF NOT EXISTS site_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Pricing configuration (mirrors pricing-config.ts structure)
  pricing_config JSONB DEFAULT '{}',

  -- Promotions
  sale_active BOOLEAN DEFAULT false,
  sale_name VARCHAR(100),
  sale_start_date TIMESTAMPTZ,
  sale_end_date TIMESTAMPTZ,
  sale_config JSONB DEFAULT '{}',

  -- Banners
  announcement_bar_enabled BOOLEAN DEFAULT false,
  announcement_bar_text TEXT,
  announcement_bar_link VARCHAR(500),
  announcement_bar_bg_color VARCHAR(20) DEFAULT '#000000',
  announcement_bar_text_color VARCHAR(20) DEFAULT '#FFFFFF',
  promo_banners JSONB DEFAULT '[]',

  -- Branding
  logo_url VARCHAR(500),
  logo_dark_url VARCHAR(500),
  favicon_url VARCHAR(500),
  brand_colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#374d42"}',
  brand_fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}',

  -- Navigation
  header_nav JSONB DEFAULT '[]',
  footer_nav JSONB DEFAULT '{}',

  -- Social & Meta
  social_links JSONB DEFAULT '{}',
  default_meta_title VARCHAR(100),
  default_meta_description VARCHAR(200),

  -- Analytics
  ga4_measurement_id VARCHAR(50),
  fb_pixel_id VARCHAR(50),
  tiktok_pixel_id VARCHAR(50),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT site_config_one_per_tenant UNIQUE(tenant_id)
);

-- Settings Audit Log table
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  setting_type VARCHAR(50) NOT NULL,
  changes JSONB NOT NULL,
  previous_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_settings_tenant_id ON ai_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payout_settings_tenant_id ON payout_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_config_tenant_id ON site_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_tenant_id ON settings_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_setting_type ON settings_audit_log(setting_type);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_created_at ON settings_audit_log(created_at);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_ai_settings_updated_at ON ai_settings;
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_settings_updated_at ON payout_settings;
CREATE TRIGGER update_payout_settings_updated_at
  BEFORE UPDATE ON payout_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_config_updated_at ON site_config;
CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE ai_settings IS 'Tenant AI feature configuration and usage limits';
COMMENT ON TABLE payout_settings IS 'Tenant payout/payment processing preferences';
COMMENT ON TABLE site_config IS 'Tenant site branding, pricing, and navigation configuration';
COMMENT ON TABLE settings_audit_log IS 'Audit trail for all settings changes';
