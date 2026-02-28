-- =====================================================================================
-- SSO Tokens Table
-- =====================================================================================
-- Stores one-time tokens for cross-app authentication (orchestrator → admin, etc.)
-- Tokens are single-use and expire after 5 minutes
-- =====================================================================================

-- Create sso_tokens table
CREATE TABLE IF NOT EXISTS public.sso_tokens (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_app TEXT NOT NULL CHECK (target_app IN ('admin', 'storefront', 'creator-portal', 'contractor-portal', 'orchestrator')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sso_tokens_user_id ON public.sso_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_expires_at ON public.sso_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_used_at ON public.sso_tokens(used_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sso_tokens_updated_at ON public.sso_tokens;
CREATE TRIGGER update_sso_tokens_updated_at
  BEFORE UPDATE ON public.sso_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Partial index for cleanup query (exclude active tokens)
CREATE INDEX IF NOT EXISTS idx_sso_tokens_cleanup ON public.sso_tokens(created_at) WHERE used_at IS NOT NULL;

-- Comments
COMMENT ON TABLE public.sso_tokens IS 'One-time tokens for cross-app SSO authentication';
COMMENT ON COLUMN public.sso_tokens.id IS 'Unique token ID (nanoid)';
COMMENT ON COLUMN public.sso_tokens.user_id IS 'User being authenticated';
COMMENT ON COLUMN public.sso_tokens.tenant_id IS 'Tenant context (null for super admins accessing orchestrator)';
COMMENT ON COLUMN public.sso_tokens.target_app IS 'Destination app (admin, storefront, etc.)';
COMMENT ON COLUMN public.sso_tokens.expires_at IS 'Token expiry time (5 minutes from creation)';
COMMENT ON COLUMN public.sso_tokens.used_at IS 'When token was used (null if unused)';
