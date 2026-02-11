-- Creators table
-- Stores creator profiles in public schema (not per-tenant)
-- Creators can work with multiple brands via creator_brand_memberships

-- Creator status enum
DO $$ BEGIN
  CREATE TYPE creator_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,  -- bcrypt hash, nullable for magic-link-only

  -- Profile
  name TEXT NOT NULL,
  bio TEXT,  -- 160 character limit enforced in app
  phone TEXT,
  avatar_url TEXT,

  -- Shipping Address (for product samples)
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country_code TEXT DEFAULT 'US',

  -- Tax Information
  tax_form_status TEXT DEFAULT 'pending',  -- pending, submitted, approved
  tax_form_submitted_at TIMESTAMPTZ,

  -- Status and verification
  status creator_status NOT NULL DEFAULT 'pending',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,

  -- Onboarding
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  first_login_at TIMESTAMPTZ,
  guided_tour_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creators_updated_at ON creators;
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creators_email ON creators(email);
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
CREATE INDEX IF NOT EXISTS idx_creators_created_at ON creators(created_at);

COMMENT ON TABLE creators IS 'Creator profiles in public schema. Creators can work with multiple brands.';
COMMENT ON COLUMN creators.password_hash IS 'bcrypt password hash. NULL for magic-link-only creators.';
COMMENT ON COLUMN creators.bio IS '160 character bio for creator profile.';
COMMENT ON COLUMN creators.tax_form_status IS 'W-9 tax form status: pending, submitted, approved';
