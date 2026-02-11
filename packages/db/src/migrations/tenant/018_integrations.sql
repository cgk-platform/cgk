-- Integration connections for ad platforms and marketing tools
-- Phase: 2PO-OAUTH-INTEGRATIONS

-- Meta Ads Connections
CREATE TABLE IF NOT EXISTS meta_ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Encrypted credentials
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  token_type VARCHAR(20) DEFAULT 'long_lived',

  -- Account info
  user_id TEXT,
  selected_ad_account_id TEXT,
  selected_ad_account_name TEXT,
  scopes TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(30) DEFAULT 'pending_account_selection',
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_meta_ad_connections_status
  ON meta_ad_connections(status, needs_reauth);

-- Index for token expiry queries
CREATE INDEX IF NOT EXISTS idx_meta_ad_connections_token_expires
  ON meta_ad_connections(token_expires_at)
  WHERE token_expires_at IS NOT NULL AND needs_reauth = false;


-- Google Ads Connections
CREATE TABLE IF NOT EXISTS google_ads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Encrypted credentials
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Account info
  selected_customer_id TEXT,
  selected_customer_name TEXT,
  customer_ids TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(30) DEFAULT 'pending_account_selection',
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_google_ads_connections_status
  ON google_ads_connections(status, needs_reauth);

-- Index for token expiry queries
CREATE INDEX IF NOT EXISTS idx_google_ads_connections_token_expires
  ON google_ads_connections(token_expires_at)
  WHERE token_expires_at IS NOT NULL AND needs_reauth = false;


-- TikTok Ads Connections
CREATE TABLE IF NOT EXISTS tiktok_ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Encrypted credentials
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Account info
  selected_advertiser_id TEXT,
  selected_advertiser_name TEXT,
  advertiser_ids TEXT[] DEFAULT '{}',
  pixel_id TEXT,
  events_api_token TEXT,
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(30) DEFAULT 'pending_account_selection',
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_tiktok_ad_connections_status
  ON tiktok_ad_connections(status, needs_reauth);

-- Index for token expiry queries
CREATE INDEX IF NOT EXISTS idx_tiktok_ad_connections_token_expires
  ON tiktok_ad_connections(token_expires_at)
  WHERE token_expires_at IS NOT NULL AND needs_reauth = false;


-- Klaviyo Connections
CREATE TABLE IF NOT EXISTS klaviyo_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Encrypted API key
  private_api_key_encrypted TEXT NOT NULL,
  public_api_key TEXT,

  -- Account info
  company_name TEXT,
  account_id TEXT,
  sms_list_id TEXT,
  email_list_id TEXT,
  lists JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,

  UNIQUE(tenant_id)
);

-- Index for active connections
CREATE INDEX IF NOT EXISTS idx_klaviyo_connections_active
  ON klaviyo_connections(is_active)
  WHERE is_active = true;


-- Trigger for updated_at on meta_ad_connections
CREATE OR REPLACE FUNCTION update_meta_ad_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meta_ad_connections_updated_at ON meta_ad_connections;
CREATE TRIGGER meta_ad_connections_updated_at
  BEFORE UPDATE ON meta_ad_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_meta_ad_connections_updated_at();

-- Trigger for updated_at on google_ads_connections
CREATE OR REPLACE FUNCTION update_google_ads_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS google_ads_connections_updated_at ON google_ads_connections;
CREATE TRIGGER google_ads_connections_updated_at
  BEFORE UPDATE ON google_ads_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_google_ads_connections_updated_at();

-- Trigger for updated_at on tiktok_ad_connections
CREATE OR REPLACE FUNCTION update_tiktok_ad_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tiktok_ad_connections_updated_at ON tiktok_ad_connections;
CREATE TRIGGER tiktok_ad_connections_updated_at
  BEFORE UPDATE ON tiktok_ad_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_tiktok_ad_connections_updated_at();
