-- Stripe Top-ups tables for balance management
-- Migration: 016_stripe_topups

CREATE TABLE IF NOT EXISTS stripe_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe IDs
  stripe_topup_id TEXT NOT NULL UNIQUE,
  stripe_source_id TEXT,

  -- Amount
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status
  status TEXT NOT NULL,
  failure_code TEXT,
  failure_message TEXT,

  -- Timing
  expected_available_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Linking to withdrawals
  linked_withdrawal_ids UUID[],

  -- Metadata
  statement_descriptor TEXT,
  description TEXT,
  created_by TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_topup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Default funding source
  default_source_id TEXT,
  default_source_last4 TEXT,
  default_source_bank_name TEXT,

  -- Auto top-up configuration
  auto_topup_enabled BOOLEAN DEFAULT false,
  auto_topup_threshold_cents INTEGER,
  auto_topup_amount_cents INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_topups_status ON stripe_topups(status);
CREATE INDEX IF NOT EXISTS idx_stripe_topups_created_at ON stripe_topups(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_stripe_topups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stripe_topups_updated_at ON stripe_topups;
CREATE TRIGGER stripe_topups_updated_at
  BEFORE UPDATE ON stripe_topups
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_topups_updated_at();

DROP TRIGGER IF EXISTS stripe_topup_settings_updated_at ON stripe_topup_settings;
CREATE TRIGGER stripe_topup_settings_updated_at
  BEFORE UPDATE ON stripe_topup_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_topups_updated_at();
