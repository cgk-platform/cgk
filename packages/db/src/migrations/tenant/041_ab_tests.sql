-- Migration: 041_ab_tests
-- Description: A/B testing core table for experiment management
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS ab_tests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'split' CHECK (type IN ('split', 'multivariate', 'shipping')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  traffic_percentage INTEGER DEFAULT 100 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  winning_variant_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_type ON ab_tests(type);
CREATE INDEX IF NOT EXISTS idx_ab_tests_dates ON ab_tests(start_date, end_date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ab_tests_updated_at ON ab_tests;
CREATE TRIGGER update_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE ab_tests IS 'A/B test experiments with split, multivariate, and shipping test support';
COMMENT ON COLUMN ab_tests.type IS 'split=traditional A/B, multivariate=multiple factors, shipping=delivery optimization';
COMMENT ON COLUMN ab_tests.traffic_percentage IS 'Percentage of traffic to include in the test (0-100)';
