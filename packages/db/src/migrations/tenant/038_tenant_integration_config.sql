-- Tenant-managed integration configurations
-- Phase: 5G-TENANT-INTEGRATIONS
--
-- These tables store each tenant's OWN credentials for external services.
-- All API keys are encrypted with INTEGRATION_ENCRYPTION_KEY before storage.

--------------------------------------------------------------------------------
-- Stripe Configuration (tenant's own Stripe account)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_stripe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Encrypted credentials (tenant's OWN Stripe account)
  secret_key_encrypted TEXT NOT NULL,          -- sk_live_xxx or sk_test_xxx
  publishable_key TEXT,                        -- pk_live_xxx (not secret, can be public)
  webhook_secret_encrypted TEXT,               -- whsec_xxx

  -- Account info (from Stripe API)
  stripe_account_id TEXT,                      -- acct_xxx
  account_name TEXT,
  account_country TEXT,
  livemode BOOLEAN DEFAULT false,

  -- Stripe Connect (for creator/contractor payouts within THIS tenant)
  connect_enabled BOOLEAN DEFAULT false,
  connect_client_id TEXT,                      -- ca_xxx for this tenant's Connect

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Index for active configs
CREATE INDEX IF NOT EXISTS idx_tenant_stripe_config_active
  ON tenant_stripe_config(is_active)
  WHERE is_active = true;


--------------------------------------------------------------------------------
-- Resend Configuration (tenant's own Resend account)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_resend_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Encrypted API key (tenant's OWN Resend account)
  api_key_encrypted TEXT NOT NULL,             -- re_xxx

  -- Account info
  resend_team_id TEXT,
  account_name TEXT,

  -- Default sender configuration
  default_from_email TEXT,                     -- orders@tenant.com
  default_from_name TEXT,                      -- "Tenant Store"
  default_reply_to TEXT,

  -- Verified domains (fetched from Resend API)
  verified_domains JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Index for active configs
CREATE INDEX IF NOT EXISTS idx_tenant_resend_config_active
  ON tenant_resend_config(is_active)
  WHERE is_active = true;


--------------------------------------------------------------------------------
-- Wise Configuration (tenant's own Wise account for international payouts)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_wise_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Encrypted API key (tenant's OWN Wise account)
  api_key_encrypted TEXT NOT NULL,

  -- Account info
  profile_id TEXT,                             -- Wise profile ID
  profile_type TEXT,                           -- 'business' or 'personal'
  account_holder_name TEXT,

  -- Source account for payouts
  source_balance_id TEXT,
  source_currency TEXT DEFAULT 'USD',

  -- Webhook config
  webhook_secret_encrypted TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  sandbox_mode BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Index for active configs
CREATE INDEX IF NOT EXISTS idx_tenant_wise_config_active
  ON tenant_wise_config(is_active)
  WHERE is_active = true;


--------------------------------------------------------------------------------
-- Generic API Credentials (Mux, AssemblyAI, Anthropic, OpenAI, etc.)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Service identification
  service_name TEXT NOT NULL,                  -- 'mux', 'assemblyai', 'anthropic', etc.
  service_display_name TEXT,                   -- 'Mux Video', 'AssemblyAI', etc.

  -- Encrypted credentials
  api_key_encrypted TEXT NOT NULL,             -- Primary API key
  api_secret_encrypted TEXT,                   -- Secondary secret (if needed, like Mux)

  -- Service-specific metadata
  account_id TEXT,                             -- Service account ID if available
  metadata JSONB DEFAULT '{}',                 -- Service-specific config

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, service_name)
);

COMMENT ON COLUMN tenant_api_credentials.service_name IS
'Supported services: mux, assemblyai, anthropic, openai, elevenlabs, cloudflare_r2, google_maps, twilio';

-- Index for looking up by service
CREATE INDEX IF NOT EXISTS idx_tenant_api_credentials_service
  ON tenant_api_credentials(service_name, is_active)
  WHERE is_active = true;


--------------------------------------------------------------------------------
-- Triggers for updated_at
--------------------------------------------------------------------------------

-- Stripe config
DROP TRIGGER IF EXISTS tenant_stripe_config_updated_at ON tenant_stripe_config;
CREATE TRIGGER tenant_stripe_config_updated_at
  BEFORE UPDATE ON tenant_stripe_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Resend config
DROP TRIGGER IF EXISTS tenant_resend_config_updated_at ON tenant_resend_config;
CREATE TRIGGER tenant_resend_config_updated_at
  BEFORE UPDATE ON tenant_resend_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Wise config
DROP TRIGGER IF EXISTS tenant_wise_config_updated_at ON tenant_wise_config;
CREATE TRIGGER tenant_wise_config_updated_at
  BEFORE UPDATE ON tenant_wise_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- API credentials
DROP TRIGGER IF EXISTS tenant_api_credentials_updated_at ON tenant_api_credentials;
CREATE TRIGGER tenant_api_credentials_updated_at
  BEFORE UPDATE ON tenant_api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
