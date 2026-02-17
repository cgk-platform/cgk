-- Migration: 046_ab_test_conversions
-- Description: A/B test conversion tracking with attribution
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS ab_test_conversions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES ab_test_assignments(id),
  order_id TEXT,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('purchase', 'signup', 'subscription', 'lead', 'custom')),
  value_cents INTEGER,
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_conversions_test ON ab_test_conversions(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_variant ON ab_test_conversions(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_type ON ab_test_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_order ON ab_test_conversions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ab_conversions_converted_at ON ab_test_conversions(converted_at);

-- Composite index for conversion rate calculations
CREATE INDEX IF NOT EXISTS idx_ab_conversions_analytics ON ab_test_conversions(test_id, variant_id, conversion_type);

COMMENT ON TABLE ab_test_conversions IS 'Conversion events attributed to A/B test variants';
COMMENT ON COLUMN ab_test_conversions.conversion_type IS 'purchase, signup, subscription, lead, or custom';
COMMENT ON COLUMN ab_test_conversions.value_cents IS 'Monetary value of the conversion in cents';
