-- Migration: 043_ab_visitors
-- Description: A/B test visitor assignments for consistent experiment exposure
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS ab_visitors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  visitor_id TEXT NOT NULL,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(visitor_id, test_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_visitors_test_id ON ab_visitors(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_visitors_visitor_id ON ab_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ab_visitors_variant_id ON ab_visitors(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_visitors_assigned_at ON ab_visitors(assigned_at);

COMMENT ON TABLE ab_visitors IS 'Persistent visitor-to-variant assignments for A/B tests';
COMMENT ON COLUMN ab_visitors.visitor_id IS 'Anonymous visitor ID or customer ID for consistent assignment';
