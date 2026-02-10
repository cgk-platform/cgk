-- Creators table
-- Creator/influencer/ambassador records

-- Creator status enum
DO $$ BEGIN
  CREATE TYPE creator_status AS ENUM ('pending', 'approved', 'active', 'paused', 'terminated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Creator tier enum
DO $$ BEGIN
  CREATE TYPE creator_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Contact info
  email TEXT UNIQUE NOT NULL,
  phone TEXT,

  -- Name
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,

  -- Status and tier
  status creator_status NOT NULL DEFAULT 'pending',
  tier creator_tier NOT NULL DEFAULT 'bronze',

  -- Commission settings
  commission_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  commission_type TEXT NOT NULL DEFAULT 'percentage',

  -- Referral/affiliate code
  referral_code TEXT UNIQUE,

  -- Social profiles
  instagram_handle TEXT,
  tiktok_handle TEXT,
  youtube_handle TEXT,
  social_profiles JSONB NOT NULL DEFAULT '{}',

  -- Stats (denormalized)
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents INTEGER NOT NULL DEFAULT 0,
  total_commission_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Balance
  balance_cents INTEGER NOT NULL DEFAULT 0,
  pending_balance_cents INTEGER NOT NULL DEFAULT 0,

  -- Payout settings
  payout_method TEXT,
  payout_details JSONB,

  -- Notes
  notes TEXT,
  tags TEXT[],

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creators_updated_at ON creators;
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creators_email ON creators(email);
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
CREATE INDEX IF NOT EXISTS idx_creators_tier ON creators(tier);
CREATE INDEX IF NOT EXISTS idx_creators_referral_code ON creators(referral_code);
CREATE INDEX IF NOT EXISTS idx_creators_total_revenue ON creators(total_revenue_cents);
CREATE INDEX IF NOT EXISTS idx_creators_created_at ON creators(created_at);

COMMENT ON TABLE creators IS 'Creator/influencer/ambassador records';
COMMENT ON COLUMN creators.commission_rate_pct IS 'Commission percentage (e.g., 10.00 for 10%)';
COMMENT ON COLUMN creators.balance_cents IS 'Available balance for payout';
COMMENT ON COLUMN creators.pending_balance_cents IS 'Pending commission not yet available';
