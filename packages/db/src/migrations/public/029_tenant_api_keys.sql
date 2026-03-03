-- Migration: 029_tenant_api_keys
-- Description: API keys for external integrations (openCLAW agents, etc.)
-- Allows tenants to authenticate via x-api-key header for programmatic access.

CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'Default',
    scopes TEXT[] DEFAULT '{all}',
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_org ON tenant_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_key ON tenant_api_keys(api_key) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS set_tenant_api_keys_updated_at ON tenant_api_keys;
CREATE TRIGGER set_tenant_api_keys_updated_at
    BEFORE UPDATE ON tenant_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tenant_api_keys IS 'API keys for programmatic tenant access (openCLAW sync, external integrations)';
