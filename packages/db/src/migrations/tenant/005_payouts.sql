-- Payouts table
-- Creator payout history and transactions

-- Payout status enum
DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payout method enum
DO $$ BEGIN
  CREATE TYPE payout_method AS ENUM ('stripe', 'wise', 'paypal', 'bank_transfer', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Creator reference
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,

  -- Amount
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Method
  method payout_method NOT NULL,

  -- Status
  status payout_status NOT NULL DEFAULT 'pending',

  -- External references
  stripe_transfer_id TEXT,
  wise_transfer_id TEXT,
  external_reference TEXT,

  -- Payout details snapshot
  payout_details JSONB,

  -- Notes
  notes TEXT,

  -- Failure tracking
  failure_reason TEXT,
  failure_code TEXT,

  -- Timestamps
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Balance transactions (detailed ledger)
CREATE TABLE IF NOT EXISTS balance_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Creator reference
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,

  -- Transaction type
  type TEXT NOT NULL, -- 'commission', 'payout', 'adjustment', 'refund'

  -- Amount (positive for credits, negative for debits)
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Running balance after this transaction
  balance_after_cents INTEGER NOT NULL,

  -- References
  order_id TEXT,
  payout_id TEXT REFERENCES payouts(id) ON DELETE SET NULL,

  -- Description
  description TEXT,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payouts
CREATE INDEX IF NOT EXISTS idx_payouts_creator_id ON payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_method ON payouts(method);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_transfer ON payouts(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);

-- Indexes for balance_transactions
CREATE INDEX IF NOT EXISTS idx_balance_transactions_creator_id ON balance_transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_order_id ON balance_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_payout_id ON balance_transactions(payout_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at);

COMMENT ON TABLE payouts IS 'Creator payout records';
COMMENT ON TABLE balance_transactions IS 'Detailed ledger of creator balance changes';
COMMENT ON COLUMN balance_transactions.amount_cents IS 'Positive = credit, Negative = debit';
