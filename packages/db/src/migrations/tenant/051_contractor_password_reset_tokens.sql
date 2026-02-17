-- Migration: 051_contractor_password_reset_tokens
-- Description: Password reset tokens for contractor accounts
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS contractor_password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contractor_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_reset_token ON contractor_password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_contractor_reset_contractor ON contractor_password_reset_tokens(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_reset_expires ON contractor_password_reset_tokens(expires_at);

-- Partial index for unused tokens
CREATE INDEX IF NOT EXISTS idx_contractor_reset_active ON contractor_password_reset_tokens(token, expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE contractor_password_reset_tokens IS 'Password reset tokens for contractor accounts';
COMMENT ON COLUMN contractor_password_reset_tokens.token IS 'Secure reset token sent to contractor email';
