-- Organizations table (tenant registry)
-- Each organization represents a brand/tenant with its own isolated schema

-- Organization status enum
DO $$ BEGIN
  CREATE TYPE organization_status AS ENUM ('onboarding', 'active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Slug used for schema name (tenant_{slug})
  slug TEXT UNIQUE NOT NULL,

  -- Display name
  name TEXT NOT NULL,

  -- Tenant-specific settings
  settings JSONB NOT NULL DEFAULT '{}',

  -- Shopify integration
  shopify_store_domain TEXT,
  shopify_access_token_encrypted TEXT,

  -- Stripe integration
  stripe_account_id TEXT,
  stripe_customer_id TEXT,

  -- Status
  status organization_status NOT NULL DEFAULT 'onboarding',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_shopify_domain ON organizations(shopify_store_domain);

-- Slug validation constraint (alphanumeric + underscore only)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_slug_format;
ALTER TABLE organizations ADD CONSTRAINT chk_organizations_slug_format
  CHECK (slug ~ '^[a-z0-9_]+$');

COMMENT ON TABLE organizations IS 'Tenant registry - each org has isolated tenant_{slug} schema';
COMMENT ON COLUMN organizations.slug IS 'Used for schema name: tenant_{slug}. Alphanumeric + underscore only.';
COMMENT ON COLUMN organizations.settings IS 'Tenant settings: theme, features, preferences';
COMMENT ON COLUMN organizations.shopify_access_token_encrypted IS 'Encrypted Shopify API token';
