-- Migration: 016_esign_admin.sql
-- Description: E-Signature admin tables for bulk sends and webhooks
-- Phase: PHASE-2U-CREATORS-ADMIN-ESIGN

-- Bulk send batches
CREATE TABLE IF NOT EXISTS esign_bulk_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(64),
  name VARCHAR(255),
  recipient_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'queued', -- queued, sending, completed, partial, failed, cancelled
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  csv_data JSONB, -- Original CSV mapping
  error_log JSONB DEFAULT '[]', -- Array of { recipientEmail, error, timestamp }
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk send recipients (individual tracking)
CREATE TABLE IF NOT EXISTS esign_bulk_send_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_send_id UUID NOT NULL REFERENCES esign_bulk_sends(id) ON DELETE CASCADE,
  document_id VARCHAR(64), -- Created document ID
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  custom_fields JSONB DEFAULT '{}', -- Custom field values from CSV
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook configurations
CREATE TABLE IF NOT EXISTS esign_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_key VARCHAR(64) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]', -- List of subscribed events
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS esign_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES esign_webhooks(id) ON DELETE CASCADE,
  document_id VARCHAR(64),
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  request_headers JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  success BOOLEAN,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-person signing sessions
CREATE TABLE IF NOT EXISTS esign_in_person_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(64) NOT NULL,
  signer_id VARCHAR(64) NOT NULL,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  pin_hash VARCHAR(255), -- Optional PIN for exiting in-person mode
  status VARCHAR(20) DEFAULT 'active', -- active, completed, expired, cancelled
  started_by VARCHAR(255) NOT NULL, -- Admin who started the session
  device_info JSONB, -- User agent, screen size, etc.
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL -- 30 min default
);

-- Document audit log for detailed tracking
CREATE TABLE IF NOT EXISTS esign_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(64) NOT NULL,
  signer_id VARCHAR(64),
  action VARCHAR(50) NOT NULL, -- created, sent, viewed, field_filled, signed, declined, voided, etc.
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  performed_by VARCHAR(255), -- User ID or 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminder configuration per document
CREATE TABLE IF NOT EXISTS esign_reminder_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(64) NOT NULL UNIQUE,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_frequency_days INTEGER DEFAULT 3,
  max_reminders INTEGER DEFAULT 3,
  reminder_count INTEGER DEFAULT 0,
  next_reminder_at TIMESTAMPTZ,
  last_reminder_at TIMESTAMPTZ,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bulk sends
CREATE INDEX IF NOT EXISTS idx_esign_bulk_sends_status ON esign_bulk_sends(status);
CREATE INDEX IF NOT EXISTS idx_esign_bulk_sends_scheduled ON esign_bulk_sends(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esign_bulk_sends_created ON esign_bulk_sends(created_at DESC);

-- Indexes for bulk send recipients
CREATE INDEX IF NOT EXISTS idx_esign_bulk_send_recipients_bulk_send ON esign_bulk_send_recipients(bulk_send_id);
CREATE INDEX IF NOT EXISTS idx_esign_bulk_send_recipients_status ON esign_bulk_send_recipients(bulk_send_id, status);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_esign_webhooks_active ON esign_webhooks(is_active) WHERE is_active = true;

-- Indexes for webhook deliveries
CREATE INDEX IF NOT EXISTS idx_esign_webhook_deliveries_webhook ON esign_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_esign_webhook_deliveries_document ON esign_webhook_deliveries(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_webhook_deliveries_event ON esign_webhook_deliveries(event);
CREATE INDEX IF NOT EXISTS idx_esign_webhook_deliveries_delivered ON esign_webhook_deliveries(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_esign_webhook_deliveries_pending ON esign_webhook_deliveries(next_retry_at)
  WHERE success = false AND next_retry_at IS NOT NULL;

-- Indexes for in-person sessions
CREATE INDEX IF NOT EXISTS idx_esign_in_person_sessions_token ON esign_in_person_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_esign_in_person_sessions_document ON esign_in_person_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_in_person_sessions_active ON esign_in_person_sessions(expires_at)
  WHERE status = 'active';

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_esign_audit_log_document ON esign_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_audit_log_signer ON esign_audit_log(signer_id) WHERE signer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esign_audit_log_created ON esign_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_esign_audit_log_action ON esign_audit_log(document_id, action);

-- Indexes for reminder configs
CREATE INDEX IF NOT EXISTS idx_esign_reminder_configs_document ON esign_reminder_configs(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_reminder_configs_next ON esign_reminder_configs(next_reminder_at)
  WHERE reminder_enabled = true AND next_reminder_at IS NOT NULL;

-- Trigger for updated_at on bulk_sends
CREATE OR REPLACE FUNCTION update_esign_bulk_sends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS esign_bulk_sends_updated_at ON esign_bulk_sends;
CREATE TRIGGER esign_bulk_sends_updated_at
  BEFORE UPDATE ON esign_bulk_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_esign_bulk_sends_updated_at();

-- Trigger for updated_at on webhooks
CREATE OR REPLACE FUNCTION update_esign_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS esign_webhooks_updated_at ON esign_webhooks;
CREATE TRIGGER esign_webhooks_updated_at
  BEFORE UPDATE ON esign_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_esign_webhooks_updated_at();

-- Trigger for updated_at on reminder_configs
CREATE OR REPLACE FUNCTION update_esign_reminder_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS esign_reminder_configs_updated_at ON esign_reminder_configs;
CREATE TRIGGER esign_reminder_configs_updated_at
  BEFORE UPDATE ON esign_reminder_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_esign_reminder_configs_updated_at();
