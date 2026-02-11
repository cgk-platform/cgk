-- Super Admin Access Control Tables
-- Separate table for super admin registry, audit logging, and impersonation sessions
-- These tables are in the public schema (cross-tenant)

--------------------------------------------------------------------------------
-- Super Admin Users Table
-- Registry of users with super admin privileges (separate from regular user roles)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS super_admin_users (
  -- User reference (primary key since one user can only have one super admin record)
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- When super admin access was granted
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Who granted the access (another super admin)
  granted_by UUID REFERENCES users(id),

  -- Notes about why access was granted
  notes TEXT,

  -- Permissions
  can_access_all_tenants BOOLEAN NOT NULL DEFAULT TRUE,
  can_impersonate BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage_super_admins BOOLEAN NOT NULL DEFAULT FALSE,

  -- MFA tracking
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret_encrypted TEXT,
  mfa_backup_codes_encrypted TEXT,
  mfa_verified_at TIMESTAMPTZ,

  -- Access tracking
  last_access_at TIMESTAMPTZ,
  last_access_ip INET,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_super_admin_users_updated_at ON super_admin_users;
CREATE TRIGGER update_super_admin_users_updated_at
  BEFORE UPDATE ON super_admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_super_admin_users_active
  ON super_admin_users(is_active)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_super_admin_users_granted_at
  ON super_admin_users(granted_at DESC);

COMMENT ON TABLE super_admin_users IS 'Registry of super admin users. Separate from regular user roles for security.';
COMMENT ON COLUMN super_admin_users.mfa_secret_encrypted IS 'TOTP secret, encrypted at rest. Required for sensitive operations.';
COMMENT ON COLUMN super_admin_users.can_manage_super_admins IS 'Only platform owner should have this permission.';


--------------------------------------------------------------------------------
-- Super Admin Audit Log Table
-- Immutable audit log for all super admin actions
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  user_id UUID NOT NULL REFERENCES users(id),

  -- What action was performed
  action VARCHAR(100) NOT NULL,

  -- Resource affected
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,

  -- Tenant context (if action was tenant-specific)
  tenant_id UUID REFERENCES organizations(id),

  -- Before and after state (for change tracking)
  old_value JSONB,
  new_value JSONB,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(64),

  -- Additional context
  metadata JSONB,

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent updates and deletes on audit log (immutability)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_super_admin_audit_log_update ON super_admin_audit_log;
CREATE TRIGGER prevent_super_admin_audit_log_update
  BEFORE UPDATE ON super_admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS prevent_super_admin_audit_log_delete ON super_admin_audit_log;
CREATE TRIGGER prevent_super_admin_audit_log_delete
  BEFORE DELETE ON super_admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON super_admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id
  ON super_admin_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON super_admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type
  ON super_admin_audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id
  ON super_admin_audit_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON super_admin_audit_log(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action_time
  ON super_admin_audit_log(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_action_time
  ON super_admin_audit_log(tenant_id, action, created_at DESC);

COMMENT ON TABLE super_admin_audit_log IS 'Immutable audit log for all super admin actions. 90-day minimum retention.';
COMMENT ON COLUMN super_admin_audit_log.old_value IS 'State before the change (for updates/deletes).';
COMMENT ON COLUMN super_admin_audit_log.new_value IS 'State after the change (for creates/updates).';


--------------------------------------------------------------------------------
-- Impersonation Sessions Table
-- Tracks when super admins impersonate regular users
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Super admin who initiated impersonation
  super_admin_id UUID NOT NULL REFERENCES users(id),

  -- User being impersonated
  target_user_id UUID NOT NULL REFERENCES users(id),

  -- Tenant context
  target_tenant_id UUID NOT NULL REFERENCES organizations(id),

  -- Reason for impersonation (required for audit)
  reason TEXT NOT NULL,

  -- Session tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_impersonation_super_admin
  ON impersonation_sessions(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target_user
  ON impersonation_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target_tenant
  ON impersonation_sessions(target_tenant_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_active
  ON impersonation_sessions(is_active, expires_at)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_impersonation_created_at
  ON impersonation_sessions(created_at DESC);

COMMENT ON TABLE impersonation_sessions IS 'Tracks super admin impersonation of regular users. 1-hour max session.';
COMMENT ON COLUMN impersonation_sessions.reason IS 'Required justification for the impersonation (e.g., ticket number).';
COMMENT ON COLUMN impersonation_sessions.expires_at IS 'Maximum 1 hour from started_at.';


--------------------------------------------------------------------------------
-- Super Admin Sessions Table
-- Separate session tracking for super admin with stricter limits
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS super_admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Super admin user reference
  user_id UUID NOT NULL REFERENCES super_admin_users(user_id) ON DELETE CASCADE,

  -- Session token hash (SHA-256)
  token_hash TEXT NOT NULL,

  -- MFA status for this session
  mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_verified_at TIMESTAMPTZ,
  mfa_challenge_expires_at TIMESTAMPTZ,

  -- Session timing (4-hour max)
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Inactivity timeout (30 min)
  inactivity_timeout_minutes INTEGER NOT NULL DEFAULT 30,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Status
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_user
  ON super_admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_token
  ON super_admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires
  ON super_admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_active
  ON super_admin_sessions(token_hash, expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE super_admin_sessions IS 'Super admin sessions with stricter 4-hour limit and single session per user.';
COMMENT ON COLUMN super_admin_sessions.mfa_verified IS 'Whether MFA was verified for this session.';
COMMENT ON COLUMN super_admin_sessions.last_activity_at IS 'Last activity time for inactivity timeout (30 min).';


--------------------------------------------------------------------------------
-- Rate Limiting Table
-- Track request counts for rate limiting
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS super_admin_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User being rate limited
  user_id UUID NOT NULL REFERENCES users(id),

  -- Rate limit bucket (e.g., 'api', 'sensitive', 'login')
  bucket VARCHAR(50) NOT NULL,

  -- Request count in current window
  request_count INTEGER NOT NULL DEFAULT 1,

  -- Window start time
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Window duration in seconds
  window_seconds INTEGER NOT NULL DEFAULT 60,

  -- Unique constraint for user + bucket
  UNIQUE(user_id, bucket)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_bucket
  ON super_admin_rate_limits(user_id, bucket);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON super_admin_rate_limits(window_start);

COMMENT ON TABLE super_admin_rate_limits IS 'Rate limiting for super admin requests. 100 req/min default.';


--------------------------------------------------------------------------------
-- IP Allowlist Table
-- Optional IP restrictions for super admin access
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS super_admin_ip_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- IP address or CIDR block
  ip_address INET NOT NULL,

  -- Description
  description TEXT,

  -- Who added this IP
  added_by UUID REFERENCES users(id),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(ip_address)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_super_admin_ip_allowlist_updated_at ON super_admin_ip_allowlist;
CREATE TRIGGER update_super_admin_ip_allowlist_updated_at
  BEFORE UPDATE ON super_admin_ip_allowlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for active IPs
CREATE INDEX IF NOT EXISTS idx_ip_allowlist_active
  ON super_admin_ip_allowlist(ip_address)
  WHERE is_active = TRUE;

COMMENT ON TABLE super_admin_ip_allowlist IS 'Optional IP allowlist for super admin access. Empty = no restriction.';
