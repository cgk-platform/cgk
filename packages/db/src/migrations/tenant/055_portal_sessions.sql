-- Migration: 055_portal_sessions
-- Description: Customer portal session management for storefront authentication
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS portal_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions(token);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_customer ON portal_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON portal_sessions(expires_at);

-- Partial index for active sessions
CREATE INDEX IF NOT EXISTS idx_portal_sessions_active ON portal_sessions(customer_id, expires_at)
  WHERE expires_at > NOW();

-- Function to clean up expired portal sessions
CREATE OR REPLACE FUNCTION cleanup_expired_portal_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM portal_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE portal_sessions IS 'Active sessions for customer portal authentication';
COMMENT ON COLUMN portal_sessions.customer_id IS 'Shopify customer ID or internal customer ID';
COMMENT ON COLUMN portal_sessions.last_activity_at IS 'Last activity for session timeout management';
