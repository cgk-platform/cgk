-- Migration: 045_ab_test_assignments
-- Description: Session-based A/B test assignments with optional customer linking
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  customer_id TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, session_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_assignments_test ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_session ON ab_test_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_customer ON ab_test_assignments(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ab_assignments_variant ON ab_test_assignments(variant_id);

COMMENT ON TABLE ab_test_assignments IS 'Session-based test assignments, linkable to customers when they authenticate';
COMMENT ON COLUMN ab_test_assignments.session_id IS 'Browser session ID for anonymous visitors';
COMMENT ON COLUMN ab_test_assignments.customer_id IS 'Optional customer ID when visitor authenticates';
