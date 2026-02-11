-- Onboarding Database Schema
-- Migration: 013_onboarding
-- Created: 2026-02-10

-- Onboarding session status enum
DO $$ BEGIN
  CREATE TYPE onboarding_status AS ENUM (
    'in_progress',
    'completed',
    'abandoned'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Onboarding step status enum
DO $$ BEGIN
  CREATE TYPE onboarding_step_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Onboarding sessions table
-- Tracks wizard progress across sessions
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization being onboarded (nullable until org is created in step 1)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- User performing the onboarding
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Session status
  status onboarding_status NOT NULL DEFAULT 'in_progress',

  -- Current step (1-9)
  current_step INTEGER NOT NULL DEFAULT 1,

  -- Step data stored as JSON (preserves form data between sessions)
  step_data JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Onboarding step progress table
-- Tracks completion of individual steps
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to session
  session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,

  -- Step number (1-9)
  step_number INTEGER NOT NULL CHECK (step_number >= 1 AND step_number <= 9),

  -- Step name for reference
  step_name VARCHAR(50) NOT NULL,

  -- Status
  status onboarding_step_status NOT NULL DEFAULT 'pending',

  -- Step-specific data (form values, selections, etc.)
  data JSONB NOT NULL DEFAULT '{}',

  -- Validation errors if any
  errors JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each session can only have one record per step
  UNIQUE (session_id, step_number)
);

-- Add onboarding fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS setup_checklist JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_domain TEXT,
ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '[]';

-- User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization the user is being invited to
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invited user email
  email VARCHAR(255) NOT NULL,

  -- Role to grant upon acceptance
  role VARCHAR(20) NOT NULL DEFAULT 'member',

  -- Invitation token (hashed)
  token_hash VARCHAR(64) NOT NULL,

  -- Invitation status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Who sent the invitation
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One pending invitation per email per org
  UNIQUE (organization_id, email)
);

-- Indexes for onboarding_sessions
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_org ON onboarding_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user ON onboarding_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_expires ON onboarding_sessions(expires_at)
  WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_last_activity ON onboarding_sessions(last_activity_at DESC);

-- Indexes for onboarding_steps
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_session ON onboarding_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_status ON onboarding_steps(status);

-- Indexes for user_invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_org ON user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token_hash);

-- Trigger for updated_at on onboarding_sessions
CREATE OR REPLACE FUNCTION update_onboarding_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS onboarding_sessions_updated_at ON onboarding_sessions;
CREATE TRIGGER onboarding_sessions_updated_at
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_session_updated_at();

-- Trigger for updated_at on onboarding_steps
DROP TRIGGER IF EXISTS onboarding_steps_updated_at ON onboarding_steps;
CREATE TRIGGER onboarding_steps_updated_at
  BEFORE UPDATE ON onboarding_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_session_updated_at();

-- Trigger for updated_at on user_invitations
DROP TRIGGER IF EXISTS user_invitations_updated_at ON user_invitations;
CREATE TRIGGER user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_session_updated_at();

-- Comments
COMMENT ON TABLE onboarding_sessions IS 'Tracks brand onboarding wizard sessions with step data';
COMMENT ON TABLE onboarding_steps IS 'Individual step progress within onboarding sessions';
COMMENT ON TABLE user_invitations IS 'Pending user invitations to organizations';
COMMENT ON COLUMN onboarding_sessions.step_data IS 'JSON object storing all form data across steps';
COMMENT ON COLUMN onboarding_sessions.expires_at IS 'Sessions expire after 7 days of inactivity';
COMMENT ON COLUMN organizations.setup_checklist IS 'Launch checklist status for the organization';
COMMENT ON COLUMN organizations.enabled_features IS 'Array of enabled feature module keys';
