-- Migration: 029_esign_audit.sql
-- Description: E-Signature audit log for compliance tracking
-- Phase: PHASE-4C-ESIGN-CORE

-- Audit log for document activity tracking
CREATE TABLE IF NOT EXISTS esign_audit_log (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE,
  signer_id VARCHAR(64) REFERENCES esign_signers(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'created', 'sent', 'viewed', 'field_filled', 'signed', 'declined',
    'voided', 'reminder_sent', 'resent', 'counter_signed',
    'in_person_started', 'in_person_completed', 'expired', 'downloaded', 'forwarded'
  )),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  performed_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_esign_audit_document ON esign_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_audit_signer ON esign_audit_log(signer_id) WHERE signer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esign_audit_action ON esign_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_esign_audit_created ON esign_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_esign_audit_performer ON esign_audit_log(performed_by);

-- Bulk send tracking
CREATE TABLE IF NOT EXISTS esign_bulk_sends (
  id VARCHAR(64) PRIMARY KEY,
  template_id VARCHAR(64) REFERENCES esign_templates(id) ON DELETE SET NULL,
  name VARCHAR(255),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN (
    'queued', 'sending', 'completed', 'partial', 'failed', 'cancelled'
  )),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  csv_data JSONB,
  error_log JSONB DEFAULT '[]',
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk send recipients
CREATE TABLE IF NOT EXISTS esign_bulk_send_recipients (
  id VARCHAR(64) PRIMARY KEY,
  bulk_send_id VARCHAR(64) NOT NULL REFERENCES esign_bulk_sends(id) ON DELETE CASCADE,
  document_id VARCHAR(64) REFERENCES esign_documents(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  custom_fields JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bulk sends
CREATE INDEX IF NOT EXISTS idx_esign_bulk_sends_status ON esign_bulk_sends(status);
CREATE INDEX IF NOT EXISTS idx_esign_bulk_sends_scheduled ON esign_bulk_sends(scheduled_for)
  WHERE status = 'queued' AND scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_esign_bulk_sends_created ON esign_bulk_sends(created_at DESC);

-- Indexes for bulk send recipients
CREATE INDEX IF NOT EXISTS idx_esign_bulk_recipients_bulk ON esign_bulk_send_recipients(bulk_send_id);
CREATE INDEX IF NOT EXISTS idx_esign_bulk_recipients_status ON esign_bulk_send_recipients(bulk_send_id, status);
CREATE INDEX IF NOT EXISTS idx_esign_bulk_recipients_document ON esign_bulk_send_recipients(document_id)
  WHERE document_id IS NOT NULL;

-- Webhooks for external integrations
CREATE TABLE IF NOT EXISTS esign_webhooks (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_key VARCHAR(255) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS esign_webhook_deliveries (
  id VARCHAR(64) PRIMARY KEY,
  webhook_id VARCHAR(64) NOT NULL REFERENCES esign_webhooks(id) ON DELETE CASCADE,
  document_id VARCHAR(64) REFERENCES esign_documents(id) ON DELETE SET NULL,
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  request_headers JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  success BOOLEAN DEFAULT false,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_esign_webhooks_active ON esign_webhooks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_esign_webhook_deliveries_webhook ON esign_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_esign_webhook_deliveries_retry ON esign_webhook_deliveries(next_retry_at)
  WHERE success = false AND next_retry_at IS NOT NULL;

-- In-person signing sessions
CREATE TABLE IF NOT EXISTS esign_in_person_sessions (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE,
  signer_id VARCHAR(64) NOT NULL REFERENCES esign_signers(id) ON DELETE CASCADE,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  pin_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  started_by VARCHAR(255) NOT NULL,
  device_info JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for in-person sessions
CREATE INDEX IF NOT EXISTS idx_esign_sessions_token ON esign_in_person_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_esign_sessions_document ON esign_in_person_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_sessions_status ON esign_in_person_sessions(status);
CREATE INDEX IF NOT EXISTS idx_esign_sessions_expires ON esign_in_person_sessions(expires_at)
  WHERE status = 'active';

-- Reminder configuration (optional per-document override)
CREATE TABLE IF NOT EXISTS esign_reminder_config (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES esign_documents(id) ON DELETE CASCADE UNIQUE,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_frequency_days INTEGER DEFAULT 3,
  max_reminders INTEGER DEFAULT 5,
  reminder_count INTEGER DEFAULT 0,
  next_reminder_at TIMESTAMPTZ,
  last_reminder_at TIMESTAMPTZ,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reminder config
CREATE INDEX IF NOT EXISTS idx_esign_reminder_next ON esign_reminder_config(next_reminder_at)
  WHERE reminder_enabled = true AND next_reminder_at IS NOT NULL;

-- Trigger for updated_at on esign_bulk_sends
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

-- Trigger for updated_at on esign_webhooks
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

-- Trigger for updated_at on esign_reminder_config
CREATE OR REPLACE FUNCTION update_esign_reminder_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS esign_reminder_config_updated_at ON esign_reminder_config;
CREATE TRIGGER esign_reminder_config_updated_at
  BEFORE UPDATE ON esign_reminder_config
  FOR EACH ROW
  EXECUTE FUNCTION update_esign_reminder_config_updated_at();
