-- Creator Password Reset Tokens table
-- Secure tokens for password reset flow

CREATE TABLE IF NOT EXISTS creator_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator reference
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Token (hashed for security)
  token_hash TEXT NOT NULL UNIQUE,

  -- Token state
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  -- Rate limiting (store request count)
  ip_address TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_password_reset_tokens_creator_id ON creator_password_reset_tokens(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_password_reset_tokens_email ON creator_password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_creator_password_reset_tokens_token_hash ON creator_password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_creator_password_reset_tokens_expires_at ON creator_password_reset_tokens(expires_at);

-- Clean up function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_creator_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM creator_password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days'
  OR used_at IS NOT NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE creator_password_reset_tokens IS 'Secure password reset tokens for creators. Tokens expire in 1 hour.';
COMMENT ON COLUMN creator_password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token';
