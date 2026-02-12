-- Contractors table (per-tenant schema)
-- Contractors are single-tenant workers assigned to projects
-- Different from creators (multi-brand affiliates)

CREATE TABLE IF NOT EXISTS contractors (
  id TEXT PRIMARY KEY DEFAULT 'contractor_' || gen_random_uuid()::text,
  tenant_id UUID NOT NULL,  -- References public.organizations

  -- Profile information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Authentication
  password_hash TEXT,  -- NULL if using magic link only

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended', 'inactive')),

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,  -- Admin-only notes

  -- Contract information
  contract_url TEXT,
  contract_type TEXT CHECK (contract_type IN ('uploaded', 'link') OR contract_type IS NULL),
  contract_signed_at TIMESTAMPTZ,

  -- Tracking
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique email per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractors_tenant_email
  ON contractors(tenant_id, email);

-- Status lookups
CREATE INDEX IF NOT EXISTS idx_contractors_status
  ON contractors(status);

-- Tenant lookups
CREATE INDEX IF NOT EXISTS idx_contractors_tenant_id
  ON contractors(tenant_id);

COMMENT ON TABLE contractors IS 'Contractors assigned to projects within a tenant. Single-tenant relationship.';
COMMENT ON COLUMN contractors.status IS 'pending=awaiting approval, active=can work, suspended=temporarily disabled, inactive=no longer working';
COMMENT ON COLUMN contractors.tags IS 'Custom tags for categorization (e.g., designer, writer, developer)';
