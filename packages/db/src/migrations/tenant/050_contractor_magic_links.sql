-- Migration: 050_contractor_magic_links
-- Description: Passwordless authentication magic links for contractors
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS contractor_magic_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contractor_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_magic_links_token ON contractor_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_contractor_magic_links_contractor ON contractor_magic_links(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_magic_links_expires ON contractor_magic_links(expires_at);

-- Clean up expired links (partial index for active links)
CREATE INDEX IF NOT EXISTS idx_contractor_magic_links_active ON contractor_magic_links(token, expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE contractor_magic_links IS 'One-time magic links for passwordless contractor authentication';
COMMENT ON COLUMN contractor_magic_links.token IS 'Secure token sent to contractor email';
