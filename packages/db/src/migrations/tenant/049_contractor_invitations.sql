-- Migration: 049_contractor_invitations
-- Description: Contractor invitation tokens for onboarding
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS contractor_invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'contractor',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES public.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_invitations_email ON contractor_invitations(email);
CREATE INDEX IF NOT EXISTS idx_contractor_invitations_token ON contractor_invitations(token);
CREATE INDEX IF NOT EXISTS idx_contractor_invitations_expires ON contractor_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_contractor_invitations_pending ON contractor_invitations(email, expires_at)
  WHERE accepted_at IS NULL;

COMMENT ON TABLE contractor_invitations IS 'Pending invitations for contractors to join the platform';
COMMENT ON COLUMN contractor_invitations.token IS 'Secure token sent to contractor email for signup';
COMMENT ON COLUMN contractor_invitations.metadata IS 'Additional invitation data (projects, notes, etc.)';
