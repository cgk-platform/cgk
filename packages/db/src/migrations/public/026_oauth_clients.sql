-- OAuth 2.0 tables for MCP server authentication
-- Supports Authorization Code flow with PKCE for Claude Connector

-- =============================================================================
-- oauth_clients: Registered OAuth client applications
-- =============================================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- OAuth client credentials
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT,           -- SHA-256 hash (null for public clients)
  name TEXT NOT NULL,

  -- Client type
  is_public BOOLEAN NOT NULL DEFAULT true,   -- Public clients use PKCE only
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Redirect URIs (supports wildcards like https://*.claude.ai/callback)
  allowed_redirect_uris TEXT[] NOT NULL DEFAULT '{}',

  -- Scopes this client is allowed to request
  allowed_scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Tenant association
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Metadata
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_oauth_clients_updated_at ON oauth_clients;
CREATE TRIGGER update_oauth_clients_updated_at
  BEFORE UPDATE ON oauth_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_organization_id ON oauth_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_is_active ON oauth_clients(is_active);

COMMENT ON TABLE oauth_clients IS 'Registered OAuth 2.0 clients for MCP server authentication';
COMMENT ON COLUMN oauth_clients.client_id IS 'Public OAuth client identifier';
COMMENT ON COLUMN oauth_clients.client_secret_hash IS 'SHA-256 hash of client secret (null for public clients)';
COMMENT ON COLUMN oauth_clients.is_public IS 'Public clients rely on PKCE only, no client_secret';
COMMENT ON COLUMN oauth_clients.allowed_redirect_uris IS 'Allowed redirect URIs, supports wildcard patterns';

-- =============================================================================
-- oauth_authorization_codes: Temporary authorization codes (10 min TTL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The authorization code itself
  code TEXT UNIQUE NOT NULL,

  -- Client that requested this code
  client_id TEXT NOT NULL,

  -- OAuth flow parameters
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL,

  -- PKCE parameters
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',

  -- Tenant and user context
  tenant_id TEXT NOT NULL,              -- Organization slug
  user_id UUID,                         -- Set after user authenticates

  -- Lifecycle
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,                  -- Set when code is exchanged for tokens

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_code ON oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expires_at ON oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_client_id ON oauth_authorization_codes(client_id);

COMMENT ON TABLE oauth_authorization_codes IS 'Temporary OAuth authorization codes with 10-minute TTL';
COMMENT ON COLUMN oauth_authorization_codes.code IS 'The authorization code (base64url-encoded random bytes)';
COMMENT ON COLUMN oauth_authorization_codes.code_challenge IS 'PKCE code challenge (S256 hash of code_verifier)';
COMMENT ON COLUMN oauth_authorization_codes.used_at IS 'Set when code is exchanged; prevents replay attacks';

-- =============================================================================
-- oauth_refresh_tokens: Long-lived refresh tokens (30 day TTL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token stored as hash for security
  token_hash TEXT UNIQUE NOT NULL,

  -- Client and user context
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,              -- Organization slug

  -- Scope granted
  scope TEXT NOT NULL DEFAULT '',

  -- Link back to original authorization code (for revocation chain)
  authorization_code TEXT,

  -- Lifecycle
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,              -- Set when token is revoked or rotated

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_hash ON oauth_refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_client_id ON oauth_refresh_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_user_id ON oauth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_auth_code ON oauth_refresh_tokens(authorization_code);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_expires_at ON oauth_refresh_tokens(expires_at);

COMMENT ON TABLE oauth_refresh_tokens IS 'Long-lived OAuth refresh tokens with 30-day TTL and rotation';
COMMENT ON COLUMN oauth_refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token (never store plaintext)';
COMMENT ON COLUMN oauth_refresh_tokens.authorization_code IS 'Original auth code for revocation chain';
COMMENT ON COLUMN oauth_refresh_tokens.revoked_at IS 'Set when rotated or explicitly revoked';
