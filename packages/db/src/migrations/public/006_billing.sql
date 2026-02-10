-- Billing table
-- Subscription and billing records for organizations

-- Billing status enum
DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'paused');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Billing plan enum
DO $$ BEGIN
  CREATE TYPE billing_plan AS ENUM ('free', 'starter', 'growth', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization reference
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stripe references
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Plan and status
  plan billing_plan NOT NULL DEFAULT 'free',
  status billing_status NOT NULL DEFAULT 'trialing',

  -- Trial
  trial_ends_at TIMESTAMPTZ,

  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Usage limits
  usage_limits JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_billing_updated_at ON billing;
CREATE TRIGGER update_billing_updated_at
  BEFORE UPDATE ON billing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_org_id ON billing(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_customer ON billing(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_subscription ON billing(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);
CREATE INDEX IF NOT EXISTS idx_billing_plan ON billing(plan);

COMMENT ON TABLE billing IS 'Subscription and billing records for organizations';
COMMENT ON COLUMN billing.usage_limits IS 'Plan limits: {orders_per_month, api_calls_per_day, etc}';
