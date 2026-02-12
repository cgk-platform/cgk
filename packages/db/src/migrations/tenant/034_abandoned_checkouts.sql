-- Migration: 034_abandoned_checkouts
-- Description: Abandoned checkout recovery system for e-commerce recovery features
-- Phase: 3E-ECOMMERCE-RECOVERY

-- Abandoned checkouts table
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_checkout_id TEXT NOT NULL,
  shopify_checkout_token TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_id TEXT,
  customer_name TEXT,
  cart_total_cents INTEGER NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  line_items JSONB NOT NULL DEFAULT '[]',
  billing_address JSONB,
  shipping_address JSONB,
  recovery_url TEXT,
  status TEXT DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'processing', 'recovered', 'expired')),
  recovery_email_count INTEGER DEFAULT 0,
  max_recovery_emails INTEGER DEFAULT 3,
  recovery_run_id TEXT,
  last_email_sent_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ NOT NULL,
  recovered_at TIMESTAMPTZ,
  recovered_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shopify_checkout_id)
);

-- Index for recovery queue processing
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_recovery ON abandoned_checkouts(
  status, abandoned_at
) WHERE recovered_at IS NULL;

-- Index for customer email lookups
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_email ON abandoned_checkouts(customer_email);

-- Index for date range filtering
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_abandoned_at ON abandoned_checkouts(abandoned_at DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_status ON abandoned_checkouts(status);

-- Recovery email queue
CREATE TABLE IF NOT EXISTS recovery_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_checkout_id UUID NOT NULL REFERENCES abandoned_checkouts(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL DEFAULT 1 CHECK (sequence_number BETWEEN 1 AND 3),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'skipped', 'cancelled')),
  incentive_code TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  trigger_run_id TEXT,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(abandoned_checkout_id, sequence_number)
);

-- Index for processing scheduled emails
CREATE INDEX IF NOT EXISTS idx_recovery_email_queue_scheduled ON recovery_email_queue(
  status, scheduled_at
) WHERE status = 'scheduled';

-- Tenant recovery settings
CREATE TABLE IF NOT EXISTS tenant_recovery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  abandonment_timeout_hours INTEGER DEFAULT 1,
  max_recovery_emails INTEGER DEFAULT 3,
  sequence_1_delay_hours INTEGER DEFAULT 1,
  sequence_2_delay_hours INTEGER DEFAULT 24,
  sequence_3_delay_hours INTEGER DEFAULT 72,
  sequence_1_incentive_code TEXT,
  sequence_2_incentive_code TEXT,
  sequence_3_incentive_code TEXT,
  sequence_1_enabled BOOLEAN DEFAULT true,
  sequence_2_enabled BOOLEAN DEFAULT true,
  sequence_3_enabled BOOLEAN DEFAULT false,
  checkout_expiry_days INTEGER DEFAULT 30,
  high_value_threshold_cents INTEGER DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default recovery settings if not exists
INSERT INTO tenant_recovery_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Draft orders table for tracking draft orders created from abandoned checkouts
CREATE TABLE IF NOT EXISTS draft_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_checkout_id UUID REFERENCES abandoned_checkouts(id) ON DELETE SET NULL,
  shopify_draft_order_id TEXT NOT NULL,
  shopify_draft_order_name TEXT,
  customer_email TEXT,
  customer_id TEXT,
  subtotal_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  line_items JSONB NOT NULL DEFAULT '[]',
  discount_code TEXT,
  discount_amount_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'invoice_sent', 'completed', 'cancelled')),
  invoice_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_order_id TEXT,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shopify_draft_order_id)
);

-- Index for draft order status
CREATE INDEX IF NOT EXISTS idx_draft_orders_status ON draft_orders(status);

-- Index for linking to abandoned checkouts
CREATE INDEX IF NOT EXISTS idx_draft_orders_checkout ON draft_orders(abandoned_checkout_id);

-- Recovery analytics aggregates (daily)
CREATE TABLE IF NOT EXISTS recovery_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_abandoned INTEGER DEFAULT 0,
  total_abandoned_value_cents BIGINT DEFAULT 0,
  total_recovered INTEGER DEFAULT 0,
  total_recovered_value_cents BIGINT DEFAULT 0,
  total_expired INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  draft_orders_created INTEGER DEFAULT 0,
  draft_orders_completed INTEGER DEFAULT 0,
  sequence_1_sent INTEGER DEFAULT 0,
  sequence_1_recovered INTEGER DEFAULT 0,
  sequence_2_sent INTEGER DEFAULT 0,
  sequence_2_recovered INTEGER DEFAULT 0,
  sequence_3_sent INTEGER DEFAULT 0,
  sequence_3_recovered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date)
);

-- Index for date range queries on analytics
CREATE INDEX IF NOT EXISTS idx_recovery_analytics_date ON recovery_analytics_daily(date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_abandoned_checkout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_abandoned_checkouts_updated ON abandoned_checkouts;
CREATE TRIGGER trigger_abandoned_checkouts_updated
  BEFORE UPDATE ON abandoned_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_abandoned_checkout_timestamp();

DROP TRIGGER IF EXISTS trigger_draft_orders_updated ON draft_orders;
CREATE TRIGGER trigger_draft_orders_updated
  BEFORE UPDATE ON draft_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_abandoned_checkout_timestamp();

DROP TRIGGER IF EXISTS trigger_recovery_settings_updated ON tenant_recovery_settings;
CREATE TRIGGER trigger_recovery_settings_updated
  BEFORE UPDATE ON tenant_recovery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_abandoned_checkout_timestamp();
