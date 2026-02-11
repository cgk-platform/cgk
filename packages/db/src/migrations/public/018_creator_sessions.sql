-- Creator Sessions table
-- Session tracking for creator authentication
-- Separate from admin sessions (different auth system)

CREATE TABLE IF NOT EXISTS creator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator reference
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Session token (hashed)
  token_hash TEXT NOT NULL UNIQUE,

  -- Device information
  device_info TEXT,           -- e.g., "Chrome on macOS"
  device_type TEXT,           -- e.g., "desktop", "mobile", "tablet"
  ip_address TEXT,
  user_agent TEXT,

  -- Session state
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_sessions_creator_id ON creator_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_sessions_token_hash ON creator_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_creator_sessions_expires_at ON creator_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_creator_sessions_active ON creator_sessions(creator_id, expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE creator_sessions IS 'Creator session tracking for security settings.';
COMMENT ON COLUMN creator_sessions.token_hash IS 'SHA-256 hash of the session token';
COMMENT ON COLUMN creator_sessions.device_info IS 'Human-readable device description';
