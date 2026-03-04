-- Migration: 031_unify_api_keys
-- Description: Add purpose/description to api_keys, migrate tenant_api_keys rows, deprecate tenant_api_keys.
-- The api_keys table (005_api_keys.sql) is the unified store; tenant_api_keys (029) is legacy.

ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'general';
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Migrate active keys from tenant_api_keys into api_keys (hash raw key with SHA-256).
-- encode(sha256(...)) requires pgcrypto; Neon/standard Postgres includes it by default.
INSERT INTO public.api_keys (
  id,
  organization_id,
  key_hash,
  key_prefix,
  name,
  scopes,
  expires_at,
  last_used_at,
  created_at,
  purpose
)
SELECT
  id,
  organization_id,
  encode(sha256(api_key::bytea), 'hex'),
  left(api_key, 8),
  name,
  scopes,
  expires_at,
  last_used_at,
  created_at,
  'agent'
FROM public.tenant_api_keys
WHERE is_active = true
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.tenant_api_keys IS 'DEPRECATED: Use api_keys table. Will be removed in a future migration.';
COMMENT ON COLUMN public.api_keys.purpose IS 'Key purpose: general, agent, mcp, ci-cd, custom';
COMMENT ON COLUMN public.api_keys.description IS 'Optional human-readable description for the key';
