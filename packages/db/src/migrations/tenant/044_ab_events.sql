-- Migration: 044_ab_events
-- Description: A/B test event tracking for experiment analytics
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS ab_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'purchase', 'add_to_cart', 'checkout_start', 'custom')),
  event_data JSONB DEFAULT '{}',
  revenue_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ab_events_test_id ON ab_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_variant_id ON ab_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_event_type ON ab_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_events_created_at ON ab_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ab_events_visitor ON ab_events(visitor_id);

-- Composite index for common analytics query
CREATE INDEX IF NOT EXISTS idx_ab_events_analytics ON ab_events(test_id, variant_id, event_type, created_at);

COMMENT ON TABLE ab_events IS 'Event tracking for A/B test analytics and conversion measurement';
COMMENT ON COLUMN ab_events.event_type IS 'Type of event: view, click, purchase, add_to_cart, checkout_start, custom';
COMMENT ON COLUMN ab_events.revenue_cents IS 'Revenue in cents for purchase events';
