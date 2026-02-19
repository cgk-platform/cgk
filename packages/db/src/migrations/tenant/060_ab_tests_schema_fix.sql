-- Migration: 060_ab_tests_schema_fix
-- Description: Fix A/B testing schema mismatches — add missing columns, create missing tables
-- Phase: REMEDIATION (P0 Schema Fix)
-- Refs: AGENT-09-AB-TESTING.md

-- ============================================================
-- 1. ab_tests — Add ~18 missing columns the app code expects
-- ============================================================

ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'redirect';
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS test_type TEXT DEFAULT 'split';
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS goal_event TEXT;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS optimization_metric TEXT DEFAULT 'conversion_rate';
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS confidence_level DECIMAL(4,2) DEFAULT 0.95;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS base_url TEXT;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS is_significant BOOLEAN DEFAULT false;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS winner_variant_id TEXT;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS traffic_override_variant_id TEXT;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS shipping_config JSONB;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS schedule_timezone TEXT DEFAULT 'UTC';
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS auto_start BOOLEAN DEFAULT false;
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS auto_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ab_tests_test_type ON ab_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_ab_tests_started_at ON ab_tests(started_at);

-- ============================================================
-- 2. ab_variants — Add missing columns (code uses different names)
-- ============================================================

ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS url_type TEXT DEFAULT 'redirect';
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS landing_page_id TEXT;
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS traffic_allocation INTEGER DEFAULT 50;
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS preserve_query_params BOOLEAN DEFAULT true;
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS shipping_rate_name TEXT;
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS shipping_price_cents INTEGER;
ALTER TABLE ab_variants ADD COLUMN IF NOT EXISTS shipping_suffix TEXT;

-- ============================================================
-- 3. ab_visitors — Add geo/UTM/device columns for segmentation
-- ============================================================

ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE ab_visitors ADD COLUMN IF NOT EXISTS referrer TEXT;

CREATE INDEX IF NOT EXISTS idx_ab_visitors_device_type ON ab_visitors(device_type);
CREATE INDEX IF NOT EXISTS idx_ab_visitors_country ON ab_visitors(country);

-- ============================================================
-- 4. ab_events — Add missing columns + expand event_type CHECK
-- ============================================================

ALTER TABLE ab_events ADD COLUMN IF NOT EXISTS event_value_cents INTEGER;
ALTER TABLE ab_events ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE ab_events ADD COLUMN IF NOT EXISTS page_url TEXT;

-- Expand the CHECK constraint to include event types the code uses
ALTER TABLE ab_events DROP CONSTRAINT IF EXISTS ab_events_event_type_check;
ALTER TABLE ab_events ADD CONSTRAINT ab_events_event_type_check
  CHECK (event_type IN ('view', 'click', 'purchase', 'add_to_cart', 'checkout_start', 'custom',
                        'page_view', 'begin_checkout'));

CREATE INDEX IF NOT EXISTS idx_ab_events_order_id ON ab_events(order_id);

-- ============================================================
-- 5. ab_shipping_attributions — Add columns code actually writes
-- ============================================================

ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS assigned_variant_id TEXT;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS assigned_suffix TEXT;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS actual_shipping_method TEXT;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS actual_shipping_price_cents INTEGER;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS product_revenue_cents INTEGER;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS net_revenue_cents INTEGER;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS is_mismatch BOOLEAN DEFAULT false;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS mismatch_reason TEXT;
ALTER TABLE ab_shipping_attributions ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMPTZ DEFAULT NOW();

-- Unique constraint for ON CONFLICT (order_id, test_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_shipping_order_test_uniq
  ON ab_shipping_attributions(order_id, test_id);

-- ============================================================
-- 6. template_ab_tests — Fix tenant_id type (UUID -> TEXT)
--    Code passes tenant slug (text) but column is UUID
-- ============================================================

ALTER TABLE template_ab_tests ALTER COLUMN tenant_id TYPE TEXT;

-- ============================================================
-- 7. CREATE TABLE ab_daily_metrics (missing entirely)
-- ============================================================

CREATE TABLE IF NOT EXISTS ab_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  date DATE NOT NULL,
  visitors INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  add_to_carts INTEGER NOT NULL DEFAULT 0,
  begin_checkouts INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_daily_metrics_uniq
  ON ab_daily_metrics(test_id, variant_id, date);
CREATE INDEX IF NOT EXISTS idx_ab_daily_metrics_test ON ab_daily_metrics(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_daily_metrics_variant ON ab_daily_metrics(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_daily_metrics_date ON ab_daily_metrics(date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ab_daily_metrics_updated_at ON ab_daily_metrics;
CREATE TRIGGER update_ab_daily_metrics_updated_at
  BEFORE UPDATE ON ab_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE ab_daily_metrics IS 'Daily aggregated A/B test metrics per variant';

-- ============================================================
-- 8. CREATE TABLE ab_targeting_rules (missing entirely)
-- ============================================================

CREATE TABLE IF NOT EXISTS ab_targeting_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]',
  logic TEXT NOT NULL DEFAULT 'and',
  action TEXT NOT NULL DEFAULT 'include',
  assigned_variant_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_targeting_rules_test ON ab_targeting_rules(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_targeting_rules_priority ON ab_targeting_rules(test_id, priority);

COMMENT ON TABLE ab_targeting_rules IS 'Audience targeting rules for A/B tests';

-- ============================================================
-- 9. CREATE TABLE ab_exclusion_groups (missing entirely)
-- ============================================================

CREATE TABLE IF NOT EXISTS ab_exclusion_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ab_exclusion_groups IS 'Mutual exclusion groups to prevent test interference';

-- ============================================================
-- 10. CREATE TABLE ab_test_exclusion_groups (join table)
-- ============================================================

CREATE TABLE IF NOT EXISTS ab_test_exclusion_groups (
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  exclusion_group_id TEXT NOT NULL REFERENCES ab_exclusion_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (test_id, exclusion_group_id)
);

-- ============================================================
-- 11. CREATE TABLE ab_guardrails (missing entirely)
-- ============================================================

CREATE TABLE IF NOT EXISTS ab_guardrails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  threshold DECIMAL(10,4),
  direction TEXT DEFAULT 'below',
  is_triggered BOOLEAN DEFAULT false,
  current_value DECIMAL(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_guardrails_test ON ab_guardrails(test_id);

DROP TRIGGER IF EXISTS update_ab_guardrails_updated_at ON ab_guardrails;
CREATE TRIGGER update_ab_guardrails_updated_at
  BEFORE UPDATE ON ab_guardrails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE ab_guardrails IS 'Safety guardrail metrics for running A/B tests';
