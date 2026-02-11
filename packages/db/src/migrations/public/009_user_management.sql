-- User Management Schema Updates for Phase 2SA-USERS
-- Adds user activity logging and status tracking for super admin user management

--------------------------------------------------------------------------------
-- User Status Column Extension (extends users table from 003_users.sql)
-- Note: The enum already exists but we need to add 'pending_verification'
--------------------------------------------------------------------------------

-- Extend the user_status enum to include pending_verification
DO $$ BEGIN
  ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending_verification';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

--------------------------------------------------------------------------------
-- User Activity Log Table (Platform-wide)
-- Tracks user actions across all tenants for super admin visibility
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who performed the action
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Tenant context (NULL for platform-level actions)
  tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Action performed
  action VARCHAR(100) NOT NULL,

  -- Resource affected
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id
  ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_id
  ON user_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at
  ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action
  ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_resource
  ON user_activity_log(resource_type, resource_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_activity_user_time
  ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_time
  ON user_activity_log(tenant_id, created_at DESC);

COMMENT ON TABLE user_activity_log IS 'User activity log for tracking actions across the platform';
COMMENT ON COLUMN user_activity_log.tenant_id IS 'NULL for platform-level actions like login/logout';
COMMENT ON COLUMN user_activity_log.metadata IS 'Additional context specific to the action type';

--------------------------------------------------------------------------------
-- User Disable Reason Tracking
-- Track why and when users are disabled
--------------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- Index for finding disabled users
CREATE INDEX IF NOT EXISTS idx_users_disabled_at
  ON users(disabled_at)
  WHERE disabled_at IS NOT NULL;

COMMENT ON COLUMN users.disabled_at IS 'When the user account was disabled';
COMMENT ON COLUMN users.disabled_by IS 'Super admin who disabled the account';
COMMENT ON COLUMN users.disabled_reason IS 'Reason for disabling the account';

--------------------------------------------------------------------------------
-- User Avatar URL Column
-- Store avatar URLs for user display
--------------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN users.avatar_url IS 'URL to user profile avatar image';

--------------------------------------------------------------------------------
-- Full-Text Search Support for Users
-- Enable fast user search by name and email
--------------------------------------------------------------------------------

-- Add a generated column for full-text search vector
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(email, '')), 'B')
  ) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_users_search_vector
  ON users USING GIN(search_vector);

COMMENT ON COLUMN users.search_vector IS 'Auto-generated full-text search vector for name and email';
