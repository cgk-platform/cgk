-- Context switching support
-- Add columns for default tenant and last active tracking

-- Add is_default column to track user's preferred tenant
ALTER TABLE user_organizations
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Add last_active_at column to track when user last used this tenant
ALTER TABLE user_organizations
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Add constraint: only one default per user
-- Drop if exists first to avoid conflicts on re-run
DO $$ BEGIN
  ALTER TABLE user_organizations
    DROP CONSTRAINT IF EXISTS unique_user_default_organization;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create partial unique index for default constraint
-- This ensures only one is_default = TRUE per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_organizations_unique_default
  ON user_organizations (user_id)
  WHERE is_default = TRUE;

-- Add index for last_active_at for sorting
CREATE INDEX IF NOT EXISTS idx_user_organizations_last_active
  ON user_organizations (user_id, last_active_at DESC NULLS LAST);

-- Comment on new columns
COMMENT ON COLUMN user_organizations.is_default IS 'User''s preferred default tenant for login';
COMMENT ON COLUMN user_organizations.last_active_at IS 'Last time user actively used this tenant';
