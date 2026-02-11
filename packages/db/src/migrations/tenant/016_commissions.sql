-- Commissions table
-- Individual commission records linked to orders and creators

-- Commission status enum
DO $$ BEGIN
  CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Order reference
  order_id TEXT NOT NULL,
  order_number TEXT,
  order_date TIMESTAMPTZ NOT NULL,

  -- Creator reference
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Promo code used
  promo_code TEXT,

  -- Financial details
  net_sales_cents INTEGER NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Status tracking
  status commission_status NOT NULL DEFAULT 'pending',

  -- Approval
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  -- Payment
  payout_id TEXT,
  paid_at TIMESTAMPTZ,

  -- Rejection
  rejected_reason TEXT,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on order
  UNIQUE(order_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions;
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commissions_creator ON commissions(creator_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_order_date ON commissions(order_date);
CREATE INDEX IF NOT EXISTS idx_commissions_promo_code ON commissions(promo_code);
CREATE INDEX IF NOT EXISTS idx_commissions_payout ON commissions(payout_id) WHERE payout_id IS NOT NULL;

COMMENT ON TABLE commissions IS 'Individual commission records for creator referrals';
COMMENT ON COLUMN commissions.net_sales_cents IS 'Order total minus discounts, shipping, tax';
COMMENT ON COLUMN commissions.commission_percent IS 'Rate at time of order calculation';
