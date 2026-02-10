-- Sessions table
-- User sessions with token hashes for authentication

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Organization context (nullable for super admin sessions)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Token hash (SHA-256 of the session token)
  token_hash TEXT NOT NULL,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,

  -- Session metadata
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Revocation
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_org_id ON sessions(organization_id);

-- Partial index for active sessions
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(token_hash, expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE sessions IS 'User authentication sessions';
COMMENT ON COLUMN sessions.token_hash IS 'SHA-256 hash of session token. Never store raw token.';
COMMENT ON COLUMN sessions.organization_id IS 'Current organization context. NULL for super admin.';
COMMENT ON COLUMN sessions.revoked_at IS 'When session was revoked. NULL if still valid.';
