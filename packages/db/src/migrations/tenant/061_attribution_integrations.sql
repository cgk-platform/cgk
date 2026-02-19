-- Migration: 061_attribution_integrations
-- Description: Create missing attribution tables + fix column mismatches
-- Phase: REMEDIATION (P0 Schema Fix)
-- Refs: AGENT-10-ATTRIBUTION-ANALYTICS.md

-- ============================================================
-- 1. attribution_settings — Add default_window alias column
--    Code reads/writes "default_window" but migration has "default_attribution_window"
-- ============================================================

ALTER TABLE attribution_settings ADD COLUMN IF NOT EXISTS default_window TEXT DEFAULT '7d';

-- Backfill from existing column
UPDATE attribution_settings
SET default_window = default_attribution_window
WHERE default_window IS NULL OR default_window = '7d';

-- ============================================================
-- 2. attribution_results — Add columns for pixel event monitoring
--    integrations-db.ts queries attribution_results as if it stores
--    pixel events with source, event_type, session_id, etc.
-- ============================================================

ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS matched_order_id TEXT;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS raw_data JSONB;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE attribution_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_attribution_results_source ON attribution_results(source);
CREATE INDEX IF NOT EXISTS idx_attribution_results_created_at ON attribution_results(created_at);
CREATE INDEX IF NOT EXISTS idx_attribution_results_matched_order ON attribution_results(matched_order_id);

-- Trigger for updated_at on attribution_results
DROP TRIGGER IF EXISTS update_attribution_results_updated_at ON attribution_results;
CREATE TRIGGER update_attribution_results_updated_at
  BEFORE UPDATE ON attribution_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. mmm_models — Add missing columns code expects
-- ============================================================

ALTER TABLE mmm_models ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE mmm_models ADD COLUMN IF NOT EXISTS model_fit JSONB DEFAULT '{}';
ALTER TABLE mmm_models ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}';
ALTER TABLE mmm_models ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add additional status values: code uses 'draft', 'running', 'completed', 'failed'
-- but enum only has 'training', 'ready', 'failed', 'archived'.
-- Add 'draft', 'running', 'completed' to the enum.
DO $$ BEGIN
  ALTER TYPE mmm_model_status ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE mmm_model_status ADD VALUE IF NOT EXISTS 'running';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE mmm_model_status ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. CREATE TABLE attribution_platform_connections
-- ============================================================

CREATE TABLE IF NOT EXISTS attribution_platform_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_connected',
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  records_synced INTEGER,
  error_message TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  sync_frequency TEXT NOT NULL DEFAULT 'daily',
  account_id TEXT,
  account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attr_platform_conn_tenant_platform
  ON attribution_platform_connections(tenant_id, platform);
CREATE INDEX IF NOT EXISTS idx_attr_platform_conn_tenant
  ON attribution_platform_connections(tenant_id);

DROP TRIGGER IF EXISTS update_attr_platform_conn_updated_at ON attribution_platform_connections;
CREATE TRIGGER update_attr_platform_conn_updated_at
  BEFORE UPDATE ON attribution_platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE attribution_platform_connections IS 'Secondary ad platform connections (Snapchat, Pinterest, LinkedIn, MNTN, Affiliate)';

-- ============================================================
-- 5. CREATE TABLE attribution_influencers
-- ============================================================

CREATE TABLE IF NOT EXISTS attribution_influencers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  discount_codes TEXT[] DEFAULT '{}',
  creator_links TEXT[] DEFAULT '{}',
  utm_patterns TEXT[] DEFAULT '{}',
  landing_page TEXT,
  commission_rate DECIMAL(5,2),
  creator_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attr_influencers_tenant ON attribution_influencers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attr_influencers_status ON attribution_influencers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_attr_influencers_creator ON attribution_influencers(creator_id);

DROP TRIGGER IF EXISTS update_attr_influencers_updated_at ON attribution_influencers;
CREATE TRIGGER update_attr_influencers_updated_at
  BEFORE UPDATE ON attribution_influencers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE attribution_influencers IS 'Influencer/creator attribution tracking with discount codes and UTM patterns';

-- ============================================================
-- 6. CREATE TABLE attribution_scheduled_reports
-- ============================================================

CREATE TABLE IF NOT EXISTS attribution_scheduled_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  schedule_config JSONB NOT NULL DEFAULT '{}',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  slack_channel TEXT,
  report_config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attr_sched_reports_tenant ON attribution_scheduled_reports(tenant_id);

DROP TRIGGER IF EXISTS update_attr_sched_reports_updated_at ON attribution_scheduled_reports;
CREATE TRIGGER update_attr_sched_reports_updated_at
  BEFORE UPDATE ON attribution_scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE attribution_scheduled_reports IS 'Automated attribution report scheduling and delivery';

-- ============================================================
-- 7. CREATE TABLE attribution_export_configs
-- ============================================================

CREATE TABLE IF NOT EXISTS attribution_export_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  schedule TEXT NOT NULL DEFAULT 'daily',
  tables TEXT[] NOT NULL DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'csv',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_export_at TIMESTAMPTZ,
  last_export_status TEXT,
  last_export_record_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attr_export_configs_tenant ON attribution_export_configs(tenant_id);

DROP TRIGGER IF EXISTS update_attr_export_configs_updated_at ON attribution_export_configs;
CREATE TRIGGER update_attr_export_configs_updated_at
  BEFORE UPDATE ON attribution_export_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE attribution_export_configs IS 'Data export configurations for attribution data warehouse sync';

-- ============================================================
-- 8. CREATE TABLE attribution_custom_dashboards
-- ============================================================

CREATE TABLE IF NOT EXISTS attribution_custom_dashboards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  date_range_default TEXT DEFAULT 'last_30d',
  refresh_interval_minutes INTEGER,
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attr_dashboards_tenant_user
  ON attribution_custom_dashboards(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_attr_dashboards_default
  ON attribution_custom_dashboards(tenant_id, user_id) WHERE is_default = true;

DROP TRIGGER IF EXISTS update_attr_dashboards_updated_at ON attribution_custom_dashboards;
CREATE TRIGGER update_attr_dashboards_updated_at
  BEFORE UPDATE ON attribution_custom_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE attribution_custom_dashboards IS 'User-customized attribution dashboard layouts';

-- ============================================================
-- 9. meta_ad_connections — Add EMQ columns if table exists
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_ad_connections') THEN
    EXECUTE 'ALTER TABLE meta_ad_connections ADD COLUMN IF NOT EXISTS emq_score INTEGER';
    EXECUTE 'ALTER TABLE meta_ad_connections ADD COLUMN IF NOT EXISTS emq_parameter_scores JSONB DEFAULT ''{}''';
    EXECUTE 'ALTER TABLE meta_ad_connections ADD COLUMN IF NOT EXISTS last_emq_check_at TIMESTAMPTZ';
  END IF;
END $$;
