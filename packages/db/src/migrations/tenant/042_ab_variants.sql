-- Migration: 042_ab_variants
-- Description: A/B test variants for experiment variations
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS ab_variants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
  is_control BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_variants_test_id ON ab_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_control ON ab_variants(test_id) WHERE is_control = true;

COMMENT ON TABLE ab_variants IS 'Variants for A/B tests, including control and treatment groups';
COMMENT ON COLUMN ab_variants.weight IS 'Percentage weight for traffic distribution (0-100)';
COMMENT ON COLUMN ab_variants.is_control IS 'True if this is the control variant';
COMMENT ON COLUMN ab_variants.config IS 'Variant-specific configuration (e.g., shipping rules, UI changes)';
