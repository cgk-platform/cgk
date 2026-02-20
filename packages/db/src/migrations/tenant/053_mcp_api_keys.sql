-- Migration: 053_mcp_api_keys
-- Description: API keys for MCP (Model Context Protocol) server authentication
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_hash ON mcp_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_prefix ON mcp_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_active ON mcp_api_keys(key_hash)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE mcp_api_keys IS 'API keys for authenticating MCP server requests';
COMMENT ON COLUMN mcp_api_keys.key_hash IS 'SHA-256 hash of the API key (never store raw key)';
COMMENT ON COLUMN mcp_api_keys.key_prefix IS 'First 8 characters of the key for identification';
COMMENT ON COLUMN mcp_api_keys.permissions IS 'JSON array of allowed MCP tools and operations';
