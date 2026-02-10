-- Users table
-- Platform users with organization membership
-- Note: Super admins have no organization (null organization_id)

-- User role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User status enum
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'invited', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email (unique across platform)
  email TEXT UNIQUE NOT NULL,

  -- Display name
  name TEXT,

  -- Password hash (nullable for magic-link-only users)
  password_hash TEXT,

  -- Role (super_admin for platform admins, others for org users)
  role user_role NOT NULL DEFAULT 'member',

  -- Status
  status user_status NOT NULL DEFAULT 'active',

  -- Email verification
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,

  -- Last login
  last_login_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- User-Organization membership (many-to-many)
-- Allows users to belong to multiple organizations
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Role within this organization
  role user_role NOT NULL DEFAULT 'member',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one membership per user-org pair
  UNIQUE(user_id, organization_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_organizations_updated_at ON user_organizations;
CREATE TRIGGER update_user_organizations_updated_at
  BEFORE UPDATE ON user_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);

COMMENT ON TABLE users IS 'Platform users. Super admins have no org membership.';
COMMENT ON TABLE user_organizations IS 'User-organization membership (many-to-many)';
COMMENT ON COLUMN users.password_hash IS 'Argon2 password hash. NULL for magic-link-only users.';
COMMENT ON COLUMN users.role IS 'Global role. super_admin bypasses org membership.';
