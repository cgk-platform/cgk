-- Migration: Super Admin Tenant Preferences
-- Description: Add columns to track last-used and default tenant for super admins
-- Date: 2026-02-28

--------------------------------------------------------------------------------
-- Add Tenant Preference Columns to super_admin_sessions
--------------------------------------------------------------------------------

-- Add last_tenant_slug column
ALTER TABLE super_admin_sessions
ADD COLUMN IF NOT EXISTS last_tenant_slug TEXT;

-- Add default_tenant_slug column
ALTER TABLE super_admin_sessions
ADD COLUMN IF NOT EXISTS default_tenant_slug TEXT;

-- Add comments
COMMENT ON COLUMN super_admin_sessions.last_tenant_slug IS 'Last tenant context selected by super admin for auto-restore on login';
COMMENT ON COLUMN super_admin_sessions.default_tenant_slug IS 'Default tenant context preference for super admin (future enhancement)';

-- Create index for efficient lookup of last tenant
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_last_tenant
  ON super_admin_sessions(user_id, last_tenant_slug)
  WHERE last_tenant_slug IS NOT NULL;

-- Create index for default tenant lookups
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_default_tenant
  ON super_admin_sessions(user_id, default_tenant_slug)
  WHERE default_tenant_slug IS NOT NULL;
