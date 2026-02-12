-- Migration: 015_shopify_webhooks
-- Description: Shopify webhook events and registrations tables
-- Created: 2026-02-10

-- Webhook events table - stores all received webhooks
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop TEXT NOT NULL,
  topic TEXT NOT NULL,
  shopify_webhook_id TEXT,
  payload JSONB NOT NULL,
  hmac_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Deduplication
  idempotency_key TEXT,

  -- Audit
  received_at TIMESTAMPTZ DEFAULT NOW(),
  headers JSONB,

  CONSTRAINT unique_idempotency UNIQUE(idempotency_key)
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_topic ON webhook_events(topic);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON webhook_events(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_shop ON webhook_events(shop);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_retry ON webhook_events(status, retry_count) WHERE status = 'failed';

-- Webhook registrations table - tracks registered webhooks with Shopify
CREATE TABLE IF NOT EXISTS webhook_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop TEXT NOT NULL,
  topic TEXT NOT NULL,
  shopify_webhook_id TEXT,
  address TEXT NOT NULL,
  format TEXT DEFAULT 'json',

  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'failed', 'deleted')),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_shop_topic UNIQUE(shop, topic)
);

-- Indexes for webhook registrations
CREATE INDEX IF NOT EXISTS idx_webhook_registrations_shop ON webhook_registrations(shop);
CREATE INDEX IF NOT EXISTS idx_webhook_registrations_status ON webhook_registrations(status);

-- Shopify connections table - stores shop credentials and tenant mapping
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  webhook_secret TEXT,
  scope TEXT[],

  -- App status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'uninstalled', 'suspended')),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,

  -- Store info
  store_name TEXT,
  store_email TEXT,
  store_domain TEXT,
  store_currency TEXT DEFAULT 'USD',
  store_timezone TEXT DEFAULT 'America/New_York',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for shopify connections
CREATE INDEX IF NOT EXISTS idx_shopify_connections_status ON shopify_connections(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for webhook_registrations
CREATE TRIGGER trigger_webhook_registrations_updated_at
  BEFORE UPDATE ON webhook_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_registration_updated_at();

-- Trigger for shopify_connections
CREATE TRIGGER trigger_shopify_connections_updated_at
  BEFORE UPDATE ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_registration_updated_at();

-- Comments
COMMENT ON TABLE webhook_events IS 'Stores all received Shopify webhook events for processing and auditing';
COMMENT ON TABLE webhook_registrations IS 'Tracks webhook registrations with Shopify stores';
COMMENT ON TABLE shopify_connections IS 'Stores Shopify store connections and credentials';
COMMENT ON COLUMN webhook_events.idempotency_key IS 'Used to prevent duplicate webhook processing (topic:resource_id)';
COMMENT ON COLUMN webhook_events.hmac_verified IS 'Whether the HMAC signature was verified successfully';
