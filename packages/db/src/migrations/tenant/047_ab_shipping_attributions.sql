-- Migration: 047_ab_shipping_attributions
-- Description: Shipping method attribution for shipping A/B tests
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS ab_shipping_attributions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  shipping_method TEXT,
  shipping_cost_cents INTEGER,
  delivery_days INTEGER,
  carrier TEXT,
  tracking_number TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_shipping_test ON ab_shipping_attributions(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_shipping_order ON ab_shipping_attributions(order_id);
CREATE INDEX IF NOT EXISTS idx_ab_shipping_variant ON ab_shipping_attributions(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_shipping_method ON ab_shipping_attributions(shipping_method);

COMMENT ON TABLE ab_shipping_attributions IS 'Shipping method selection and delivery tracking for shipping A/B tests';
COMMENT ON COLUMN ab_shipping_attributions.delivery_days IS 'Actual delivery time in days from order placement';
