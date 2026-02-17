-- Migration: 048_template_ab_tests
-- Description: Template A/B tests for email/notification template comparison
-- Phase: PHASE-4-API-MOCK-REMOVAL

CREATE TABLE IF NOT EXISTS template_ab_tests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  template_a_id TEXT NOT NULL,
  template_a_name TEXT NOT NULL,
  template_b_id TEXT NOT NULL,
  template_b_name TEXT NOT NULL,
  traffic_allocation JSONB NOT NULL DEFAULT '{"a": 50, "b": 50}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{"opens": {"a": 0, "b": 0}, "clicks": {"a": 0, "b": 0}, "conversions": {"a": 0, "b": 0}}'::jsonb,
  is_significant BOOLEAN DEFAULT false,
  winner TEXT CHECK (winner IS NULL OR winner IN ('a', 'b')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_ab_tests_tenant ON template_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_template_ab_tests_status ON template_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_template_ab_tests_created_at ON template_ab_tests(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_template_ab_tests_updated_at ON template_ab_tests;
CREATE TRIGGER update_template_ab_tests_updated_at
  BEFORE UPDATE ON template_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE template_ab_tests IS 'A/B tests for comparing email/notification templates';
COMMENT ON COLUMN template_ab_tests.traffic_allocation IS 'JSON object with a/b keys representing percentage split';
COMMENT ON COLUMN template_ab_tests.metrics IS 'Tracked metrics: opens, clicks, conversions for both variants';
COMMENT ON COLUMN template_ab_tests.winner IS 'Winning variant (a or b) when test is completed';
