-- Team Management tables
-- Team invitations and audit logging for tenant team management

-- Invitation status enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant this invitation is for
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invitee email
  email TEXT NOT NULL,

  -- Role to assign on acceptance
  role user_role NOT NULL DEFAULT 'member',

  -- Who sent the invitation
  invited_by UUID NOT NULL REFERENCES users(id),

  -- Token hash (SHA-256 of invitation token)
  token_hash TEXT NOT NULL,

  -- Expiration (7 days by default)
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status tracking
  status invitation_status NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Optional personal message
  message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for team_invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant ON team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON team_invitations(expires_at);

-- Partial unique index for pending invitations (one pending invite per email per tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_pending_unique
  ON team_invitations(tenant_id, email)
  WHERE status = 'pending';

-- Add team-related columns to user_organizations if not exists
ALTER TABLE user_organizations
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES team_invitations(id);

-- Team audit log table
CREATE TABLE IF NOT EXISTS team_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant context
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Who performed the action
  actor_id UUID NOT NULL REFERENCES users(id),

  -- What action was performed
  action TEXT NOT NULL,

  -- Target user (if action affects a specific user)
  target_user_id UUID REFERENCES users(id),

  -- Target email (for invites before user exists)
  target_email TEXT,

  -- Change details
  old_value JSONB,
  new_value JSONB,

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for team_audit_log
CREATE INDEX IF NOT EXISTS idx_team_audit_tenant ON team_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_audit_actor ON team_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_team_audit_target ON team_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_team_audit_action ON team_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_team_audit_time ON team_audit_log(created_at DESC);

COMMENT ON TABLE team_invitations IS 'Team member invitations for tenant organizations';
COMMENT ON COLUMN team_invitations.token_hash IS 'SHA-256 hash of invitation token. Never store raw token.';
COMMENT ON COLUMN team_invitations.role IS 'Role to assign when invitation is accepted';

COMMENT ON TABLE team_audit_log IS 'Audit trail for team management actions';
COMMENT ON COLUMN team_audit_log.action IS 'Action type: member.invited, member.joined, member.removed, member.left, role.changed';
