-- Migration: 052_contractor_sessions
-- Description: Session management for contractor portal authentication
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS contractor_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contractor_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_token ON contractor_sessions(token);
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_contractor ON contractor_sessions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_expires ON contractor_sessions(expires_at);

-- Partial index for active sessions
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_active ON contractor_sessions(contractor_id, expires_at)
  WHERE expires_at > NOW();

-- Function to clean up expired sessions (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_contractor_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM contractor_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE contractor_sessions IS 'Active sessions for contractor portal authentication';
COMMENT ON COLUMN contractor_sessions.last_activity_at IS 'Last activity timestamp for session timeout';
