-- Commission configuration
-- Stores tenant-level commission settings and tier rates

CREATE TABLE IF NOT EXISTS commission_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Default rate
  default_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,

  -- Tier-based rates: [{tier, minLifetimeCents, ratePercent}]
  tier_rates JSONB NOT NULL DEFAULT '[]',

  -- Retroactive settings
  auto_retroactive BOOLEAN NOT NULL DEFAULT true,
  retroactive_lookback_days INTEGER NOT NULL DEFAULT 90,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one config per tenant (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_config_singleton ON commission_config ((1));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_commission_config_updated_at ON commission_config;
CREATE TRIGGER update_commission_config_updated_at
  BEFORE UPDATE ON commission_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE commission_config IS 'Tenant-level commission configuration and tier rates';
COMMENT ON COLUMN commission_config.tier_rates IS 'JSON array of tier definitions with thresholds and rates';
