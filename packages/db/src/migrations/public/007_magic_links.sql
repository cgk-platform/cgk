-- Magic Links table
-- Passwordless authentication tokens

-- Magic link purpose enum
DO $$ BEGIN
  CREATE TYPE magic_link_purpose AS ENUM ('login', 'signup', 'invite', 'password_reset');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email this link was sent to
  email TEXT NOT NULL,

  -- Token hash (SHA-256 of the magic link token)
  token_hash TEXT NOT NULL,

  -- Purpose of this link
  purpose magic_link_purpose NOT NULL DEFAULT 'login',

  -- Optional organization context for invites
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Optional role for invites
  invite_role user_role,

  -- Expiration (typically 15-60 minutes)
  expires_at TIMESTAMPTZ NOT NULL,

  -- Usage tracking
  used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- Partial index for unused links
CREATE INDEX IF NOT EXISTS idx_magic_links_unused
  ON magic_links(token_hash, expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE magic_links IS 'Passwordless authentication tokens';
COMMENT ON COLUMN magic_links.token_hash IS 'SHA-256 hash of magic link token. Never store raw token.';
COMMENT ON COLUMN magic_links.purpose IS 'What this link is for: login, signup, invite, password_reset';
COMMENT ON COLUMN magic_links.invite_role IS 'Role to assign if this is an invite link';
