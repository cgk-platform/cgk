-- Migration: 021_shopify_app_core
-- Description: Shopify App Core - Multi-tenant OAuth and connections
-- Created: 2026-02-10
-- Phase: PHASE-2SH-SHOPIFY-APP-CORE

-- Drop existing shopify_connections table if it exists with old schema
-- We're replacing it with the proper multi-tenant version
DROP TABLE IF EXISTS shopify_connections CASCADE;

-- Shopify connections table (Multi-Tenant)
-- Stores encrypted OAuth tokens and connection metadata per tenant
CREATE TABLE shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shop TEXT NOT NULL,                                    -- mystore.myshopify.com
  access_token_encrypted TEXT,                           -- AES-256-GCM encrypted
  webhook_secret_encrypted TEXT,                         -- HMAC signing secret
  storefront_api_token_encrypted TEXT,                   -- Storefront API token
  scopes TEXT[] NOT NULL DEFAULT '{}',                   -- Granted scopes

  -- API configuration
  api_version TEXT NOT NULL DEFAULT '2026-01',
  storefront_api_version TEXT DEFAULT '2026-01',

  -- Pixel extension status
  pixel_id TEXT,
  pixel_active BOOLEAN DEFAULT FALSE,

  -- Storefront configuration
  site_url TEXT,                                         -- Headless storefront URL
  default_country TEXT DEFAULT 'US',
  default_language TEXT DEFAULT 'EN',

  -- Store metadata (cached from Shopify)
  store_name TEXT,
  store_email TEXT,
  store_domain TEXT,
  store_currency TEXT DEFAULT 'USD',
  store_timezone TEXT DEFAULT 'America/New_York',

  -- Connection status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disconnected')),

  -- Health tracking
  last_webhook_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_api_call_at TIMESTAMPTZ,
  api_call_count INTEGER DEFAULT 0,

  -- Audit timestamps
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one connection per tenant per shop
  CONSTRAINT unique_tenant_shop UNIQUE(tenant_id, shop)
);

-- Indexes for shopify_connections
CREATE INDEX idx_shopify_connections_tenant ON shopify_connections(tenant_id);
CREATE INDEX idx_shopify_connections_shop ON shopify_connections(shop);
CREATE INDEX idx_shopify_connections_status ON shopify_connections(status);
CREATE INDEX idx_shopify_connections_tenant_status ON shopify_connections(tenant_id, status);

-- Shopify OAuth states table (Temporary - for OAuth flow)
-- Stores temporary state for CSRF protection during OAuth
CREATE TABLE shopify_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shop TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,                            -- CSRF token
  nonce TEXT NOT NULL,                                   -- Additional security
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for OAuth states
CREATE INDEX idx_oauth_states_state ON shopify_oauth_states(state);
CREATE INDEX idx_oauth_states_expires ON shopify_oauth_states(expires_at);
CREATE INDEX idx_oauth_states_tenant ON shopify_oauth_states(tenant_id);

-- Shopify API rate limits tracking
CREATE TABLE shopify_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shop TEXT NOT NULL,
  endpoint TEXT NOT NULL,

  -- Rate limit info
  limit_max INTEGER,
  limit_remaining INTEGER,
  limit_reset_at TIMESTAMPTZ,

  -- Last request
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,

  -- Throttle status
  is_throttled BOOLEAN DEFAULT FALSE,
  throttled_until TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_tenant_shop_endpoint UNIQUE(tenant_id, shop, endpoint)
);

CREATE INDEX idx_rate_limits_tenant_shop ON shopify_rate_limits(tenant_id, shop);
CREATE INDEX idx_rate_limits_throttled ON shopify_rate_limits(is_throttled) WHERE is_throttled = TRUE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shopify_connection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for shopify_connections
CREATE TRIGGER trigger_shopify_connections_updated_at
  BEFORE UPDATE ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_connection_updated_at();

-- Trigger for rate limits
CREATE TRIGGER trigger_rate_limits_updated_at
  BEFORE UPDATE ON shopify_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_connection_updated_at();

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM shopify_oauth_states
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Update webhook_events to include tenant_id if it doesn't have it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE webhook_events ADD COLUMN tenant_id UUID;
    CREATE INDEX idx_webhook_events_tenant ON webhook_events(tenant_id);
  END IF;
END $$;

-- Update webhook_registrations to include tenant_id if it doesn't have it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_registrations' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE webhook_registrations ADD COLUMN tenant_id UUID;
    CREATE INDEX idx_webhook_registrations_tenant ON webhook_registrations(tenant_id);
  END IF;
END $$;

-- Comments
COMMENT ON TABLE shopify_connections IS 'Stores encrypted Shopify OAuth tokens and connection metadata per tenant';
COMMENT ON TABLE shopify_oauth_states IS 'Temporary OAuth state tokens for CSRF protection (auto-expired after 10 minutes)';
COMMENT ON TABLE shopify_rate_limits IS 'Tracks Shopify API rate limits per tenant/shop/endpoint';
COMMENT ON COLUMN shopify_connections.access_token_encrypted IS 'AES-256-GCM encrypted access token (format: iv:authTag:cipherText)';
COMMENT ON COLUMN shopify_connections.tenant_id IS 'References the tenant this connection belongs to';
COMMENT ON FUNCTION cleanup_expired_oauth_states() IS 'Removes expired OAuth states - call periodically or before new OAuth flows';
