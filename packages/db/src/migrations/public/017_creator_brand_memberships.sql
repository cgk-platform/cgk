-- Creator-Brand Memberships table
-- Many-to-many relationship between creators and organizations (brands)
-- Each membership has unique commission rates, discount codes, and balances

-- Membership status enum
DO $$ BEGIN
  CREATE TYPE creator_membership_status AS ENUM ('active', 'paused', 'terminated', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS creator_brand_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Status
  status creator_membership_status NOT NULL DEFAULT 'pending',

  -- Commission and discount
  commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 15.00,  -- e.g., 15.00 for 15%
  discount_code TEXT,  -- e.g., CREATOR15

  -- Balances (in cents to avoid floating point issues)
  balance_cents INTEGER NOT NULL DEFAULT 0,       -- Available for withdrawal
  pending_cents INTEGER NOT NULL DEFAULT 0,       -- Awaiting approval/processing
  lifetime_earnings_cents INTEGER NOT NULL DEFAULT 0,  -- Total earned all time

  -- Contract/Agreement
  contract_signed BOOLEAN NOT NULL DEFAULT FALSE,
  contract_signed_at TIMESTAMPTZ,
  contract_version TEXT,

  -- Activity tracking
  active_projects_count INTEGER NOT NULL DEFAULT 0,
  completed_projects_count INTEGER NOT NULL DEFAULT 0,
  last_project_at TIMESTAMPTZ,
  last_payout_at TIMESTAMPTZ,

  -- Timestamps
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one membership per creator-org pair
  UNIQUE(creator_id, organization_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_brand_memberships_updated_at ON creator_brand_memberships;
CREATE TRIGGER update_creator_brand_memberships_updated_at
  BEFORE UPDATE ON creator_brand_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_memberships_creator_id ON creator_brand_memberships(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_memberships_org_id ON creator_brand_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_creator_memberships_status ON creator_brand_memberships(status);
CREATE INDEX IF NOT EXISTS idx_creator_memberships_balance ON creator_brand_memberships(balance_cents) WHERE balance_cents > 0;

COMMENT ON TABLE creator_brand_memberships IS 'Creator-brand relationships with per-brand commission, discount codes, and balances.';
COMMENT ON COLUMN creator_brand_memberships.commission_percent IS 'Commission rate as percentage (e.g., 15.00 = 15%)';
COMMENT ON COLUMN creator_brand_memberships.balance_cents IS 'Available balance in cents (e.g., 10000 = $100.00)';
COMMENT ON COLUMN creator_brand_memberships.pending_cents IS 'Pending earnings awaiting approval in cents';
