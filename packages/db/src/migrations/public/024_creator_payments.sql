-- Creator Payments System
-- Global balance transactions, withdrawal requests, and payment methods

-- Transaction type enum
DO $$ BEGIN
  CREATE TYPE balance_transaction_type AS ENUM (
    'commission_pending',
    'commission_available',
    'project_payment',
    'bonus',
    'adjustment',
    'withdrawal',
    'store_credit'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Withdrawal status enum
DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM (
    'pending',
    'pending_topup',
    'processing',
    'completed',
    'rejected',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payout type enum
DO $$ BEGIN
  CREATE TYPE payout_type AS ENUM ('cash', 'store_credit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment method type enum
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM (
    'stripe_connect',
    'wise',
    'paypal',
    'venmo',
    'check'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment method status enum
DO $$ BEGIN
  CREATE TYPE payment_method_status AS ENUM (
    'pending',
    'active',
    'setup_required',
    'failed',
    'removed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Creator Balance Transactions (cross-brand unified ledger)
-- This table lives in public schema because it aggregates across all tenants/brands
CREATE TABLE IF NOT EXISTS creator_balance_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Creator reference (public.creators)
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Brand context (tenant identifier, nullable for platform-level transactions)
  brand_id TEXT,

  -- Transaction type
  type balance_transaction_type NOT NULL,

  -- Amount in cents (positive = credit, negative = debit)
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Running balance after this transaction
  balance_after_cents INTEGER NOT NULL,

  -- For commissions: when it becomes available (30-day hold)
  available_at TIMESTAMPTZ,

  -- References
  order_id TEXT,
  commission_id TEXT,
  project_id TEXT,
  withdrawal_id TEXT,

  -- Description
  description TEXT,

  -- Metadata (extra context)
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Creator reference
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Amount
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 2500), -- $25 minimum
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Payout type and bonus
  payout_type payout_type NOT NULL DEFAULT 'cash',
  store_credit_bonus_cents INTEGER, -- 10% bonus for store credit

  -- Payment method used
  payment_method_id TEXT,

  -- Status tracking
  status withdrawal_status NOT NULL DEFAULT 'pending',

  -- Provider details
  provider TEXT, -- 'stripe' or 'wise'
  transfer_id TEXT,
  external_reference TEXT,

  -- Estimated and actual completion
  estimated_arrival TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Failure tracking
  failure_reason TEXT,
  failure_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Admin notes
  admin_note TEXT,
  processed_by TEXT,

  -- Shopify store credit details
  shopify_customer_id TEXT,
  shopify_credit_transaction_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator Payment Methods
CREATE TABLE IF NOT EXISTS creator_payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Creator reference
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Method type and status
  type payment_method_type NOT NULL,
  status payment_method_status NOT NULL DEFAULT 'pending',

  -- Is this the default method?
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- Stripe Connect details
  stripe_account_id TEXT,
  stripe_account_type TEXT, -- 'express' or 'standard'
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  stripe_charges_enabled BOOLEAN DEFAULT false,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  stripe_country TEXT,

  -- Wise details
  wise_recipient_id TEXT,
  wise_account_holder_name TEXT,
  wise_currency TEXT,
  wise_country TEXT,

  -- Legacy method details (PayPal, Venmo, Check)
  legacy_identifier TEXT, -- email for PayPal, username for Venmo
  legacy_verified BOOLEAN DEFAULT false,
  legacy_details JSONB,

  -- Last 4 digits or masked identifier for display
  display_name TEXT,

  -- Verification
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for creator_balance_transactions
CREATE INDEX IF NOT EXISTS idx_cbt_creator_id ON creator_balance_transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_cbt_brand_id ON creator_balance_transactions(brand_id);
CREATE INDEX IF NOT EXISTS idx_cbt_type ON creator_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cbt_created_at ON creator_balance_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cbt_available_at ON creator_balance_transactions(available_at)
  WHERE available_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cbt_creator_brand ON creator_balance_transactions(creator_id, brand_id);

-- Indexes for withdrawal_requests
CREATE INDEX IF NOT EXISTS idx_wr_creator_id ON withdrawal_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_wr_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_wr_created_at ON withdrawal_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_wr_transfer_id ON withdrawal_requests(transfer_id)
  WHERE transfer_id IS NOT NULL;
-- Index for checking pending withdrawals (one active per creator)
CREATE INDEX IF NOT EXISTS idx_wr_creator_pending ON withdrawal_requests(creator_id)
  WHERE status IN ('pending', 'pending_topup', 'processing');

-- Indexes for creator_payment_methods
CREATE INDEX IF NOT EXISTS idx_cpm_creator_id ON creator_payment_methods(creator_id);
CREATE INDEX IF NOT EXISTS idx_cpm_type ON creator_payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_cpm_status ON creator_payment_methods(status);
CREATE INDEX IF NOT EXISTS idx_cpm_stripe_account ON creator_payment_methods(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpm_wise_recipient ON creator_payment_methods(wise_recipient_id)
  WHERE wise_recipient_id IS NOT NULL;
-- Unique constraint for default payment method per creator
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpm_creator_default ON creator_payment_methods(creator_id)
  WHERE is_default = true;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS update_creator_payment_methods_updated_at ON creator_payment_methods;
CREATE TRIGGER update_creator_payment_methods_updated_at
  BEFORE UPDATE ON creator_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- Comments
COMMENT ON TABLE creator_balance_transactions IS 'Unified ledger for creator balance changes across all brands';
COMMENT ON TABLE withdrawal_requests IS 'Creator withdrawal/payout requests';
COMMENT ON TABLE creator_payment_methods IS 'Creator payout method configurations';
COMMENT ON COLUMN creator_balance_transactions.available_at IS 'When pending commissions become available (30-day hold)';
COMMENT ON COLUMN withdrawal_requests.store_credit_bonus_cents IS '10% bonus for store credit withdrawals';
