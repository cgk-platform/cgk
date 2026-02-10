-- API Keys table
-- API key management for programmatic access

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization that owns this key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Key hash (SHA-256 of the API key)
  key_hash TEXT NOT NULL,

  -- Key prefix for identification (first 8 chars, like "cgk_live")
  key_prefix TEXT NOT NULL,

  -- Human-readable name
  name TEXT NOT NULL,

  -- Scopes/permissions
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Expiration (nullable for non-expiring keys)
  expires_at TIMESTAMPTZ,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,

  -- Rate limiting
  rate_limit_per_minute INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Revocation
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- Partial index for active keys
CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys(key_hash)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of API key. Never store raw key.';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 chars of key for identification (e.g., cgk_live)';
COMMENT ON COLUMN api_keys.scopes IS 'Permission scopes like: read:orders, write:products';
