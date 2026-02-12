-- Feature Flags Database Schema
-- Migration: 012_feature_flags
-- Created: 2026-02-10

-- Feature flag type enum
DO $$ BEGIN
  CREATE TYPE feature_flag_type AS ENUM (
    'boolean',
    'percentage',
    'tenant_list',
    'user_list',
    'schedule',
    'variant'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Feature flag status enum
DO $$ BEGIN
  CREATE TYPE feature_flag_status AS ENUM (
    'active',
    'archived',
    'disabled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Main feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type feature_flag_type NOT NULL DEFAULT 'boolean',
  status feature_flag_status NOT NULL DEFAULT 'active',
  default_value JSONB NOT NULL DEFAULT 'false',
  targeting JSONB NOT NULL DEFAULT '{}',
  salt VARCHAR(64) NOT NULL,
  category VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Flag key format constraint
DO $$ BEGIN
  ALTER TABLE feature_flags
  ADD CONSTRAINT feature_flags_key_format
  CHECK (key ~ '^[a-z][a-z0-9._]+$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Flag overrides table
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  flag_key VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(100),
  user_id UUID,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Must have either tenant_id or user_id
  CONSTRAINT override_target_check
  CHECK (tenant_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Unique constraint for tenant overrides
CREATE UNIQUE INDEX IF NOT EXISTS feature_flag_overrides_tenant_unique
ON feature_flag_overrides (flag_id, tenant_id)
WHERE tenant_id IS NOT NULL AND user_id IS NULL;

-- Unique constraint for user overrides (without tenant)
CREATE UNIQUE INDEX IF NOT EXISTS feature_flag_overrides_user_unique
ON feature_flag_overrides (flag_id, user_id)
WHERE user_id IS NOT NULL AND tenant_id IS NULL;

-- Unique constraint for tenant+user overrides
CREATE UNIQUE INDEX IF NOT EXISTS feature_flag_overrides_tenant_user_unique
ON feature_flag_overrides (flag_id, tenant_id, user_id)
WHERE tenant_id IS NOT NULL AND user_id IS NOT NULL;

-- Feature flag audit table
CREATE TABLE IF NOT EXISTS feature_flag_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL,
  flag_key VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  ip_address INET,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for feature_flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_status ON feature_flags(status);
CREATE INDEX IF NOT EXISTS idx_feature_flags_type ON feature_flags(type);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_created_at ON feature_flags(created_at DESC);

-- Indexes for feature_flag_overrides
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag_id ON feature_flag_overrides(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag_key ON feature_flag_overrides(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_tenant_id ON feature_flag_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_user_id ON feature_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_expires_at ON feature_flag_overrides(expires_at)
WHERE expires_at IS NOT NULL;

-- Indexes for feature_flag_audit
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_id ON feature_flag_audit(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_key ON feature_flag_audit(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_action ON feature_flag_audit(action);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_user_id ON feature_flag_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_created_at ON feature_flag_audit(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_feature_flag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_flags_updated_at ON feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_updated_at();

-- Comments
COMMENT ON TABLE feature_flags IS 'Platform-wide feature flags with 6 flag types';
COMMENT ON TABLE feature_flag_overrides IS 'Per-tenant and per-user flag overrides';
COMMENT ON TABLE feature_flag_audit IS 'Complete audit trail of all flag changes';
COMMENT ON COLUMN feature_flags.key IS 'Unique flag key matching pattern ^[a-z][a-z0-9._]+$';
COMMENT ON COLUMN feature_flags.salt IS 'Unique salt for consistent hashing in percentage rollouts';
COMMENT ON COLUMN feature_flags.targeting IS 'JSON containing targeting rules (enabledTenants, enabledUsers, percentage, schedule, variants)';
