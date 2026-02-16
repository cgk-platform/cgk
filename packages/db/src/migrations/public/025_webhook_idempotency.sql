-- Webhook idempotency tracking for non-Shopify webhooks
-- Prevents duplicate processing of webhook events

CREATE TABLE IF NOT EXISTS webhook_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  metadata JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_processed_at
  ON webhook_idempotency_keys(processed_at);

-- Index for provider-specific queries
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_provider
  ON webhook_idempotency_keys(provider, processed_at);

-- Comment for documentation
COMMENT ON TABLE webhook_idempotency_keys IS 'Tracks processed webhook events to prevent duplicate processing';
COMMENT ON COLUMN webhook_idempotency_keys.idempotency_key IS 'Unique key in format provider:event_id';
COMMENT ON COLUMN webhook_idempotency_keys.provider IS 'Webhook provider (mux, resend, twilio, stripe, etc.)';
COMMENT ON COLUMN webhook_idempotency_keys.event_id IS 'Event ID from the provider';
COMMENT ON COLUMN webhook_idempotency_keys.metadata IS 'Optional metadata about the event';
