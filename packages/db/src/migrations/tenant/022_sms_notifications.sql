-- SMS Notifications Schema
-- Phase 2CM-SMS: SMS as optional notification channel
-- SMS is OFF by default for all tenants

-- Master SMS settings per tenant
CREATE TABLE IF NOT EXISTS tenant_sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Master switch (OFF by default)
  sms_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Provider configuration
  provider TEXT NOT NULL DEFAULT 'none', -- 'twilio' | 'none'
  twilio_account_sid TEXT, -- Encrypted
  twilio_auth_token TEXT,  -- Encrypted
  twilio_phone_number TEXT,
  twilio_messaging_service_sid TEXT, -- Optional, for A2P 10DLC

  -- Compliance
  a2p_10dlc_registered BOOLEAN DEFAULT false,
  toll_free_verified BOOLEAN DEFAULT false,

  -- Quiet hours (TCPA compliance)
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '09:00',
  quiet_hours_timezone TEXT DEFAULT 'America/New_York',

  -- Rate limits
  messages_per_second INTEGER DEFAULT 1,
  daily_limit INTEGER DEFAULT 1000,

  -- Verification
  setup_completed_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unconfigured', -- unconfigured, healthy, degraded, failed

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenant_sms_settings_tenant_id_unique UNIQUE(tenant_id)
);

-- Per-notification channel configuration
CREATE TABLE IF NOT EXISTS notification_channel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,

  -- Channel toggles (email is always enabled by default)
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false, -- Only available if master SMS enabled

  -- Template references
  email_template_id UUID,
  sms_template_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notification_channel_settings_unique UNIQUE(tenant_id, notification_type)
);

-- SMS templates (short, plain text)
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,

  -- Template content (plain text, 160 char limit enforced)
  content TEXT NOT NULL,
  character_count INTEGER NOT NULL DEFAULT 0,
  segment_count INTEGER NOT NULL DEFAULT 1,

  -- Variables available in this template
  available_variables TEXT[] NOT NULL DEFAULT '{}',

  -- Link shortening
  shorten_links BOOLEAN DEFAULT true,

  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sms_templates_unique UNIQUE(tenant_id, notification_type)
);

-- SMS opt-out tracking (TCPA compliance)
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  phone_number TEXT NOT NULL, -- E.164 format

  -- Opt-out method
  opt_out_method TEXT NOT NULL, -- 'stop_keyword' | 'admin' | 'user_settings'

  -- Original opt-out message if via STOP keyword
  original_message TEXT,

  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sms_opt_outs_unique UNIQUE(tenant_id, phone_number)
);

-- SMS queue (follows email queue pattern)
CREATE TABLE IF NOT EXISTS sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,

  -- Recipient
  phone_number TEXT NOT NULL, -- E.164 format
  recipient_type TEXT NOT NULL, -- 'customer' | 'creator' | 'contractor' | 'vendor'
  recipient_id TEXT, -- Link to creator/customer/etc
  recipient_name TEXT,

  -- Message content
  notification_type TEXT NOT NULL,
  content TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  segment_count INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending: awaiting processing
    -- scheduled: will send at scheduled_at
    -- processing: currently sending
    -- sent: successfully delivered to carrier
    -- delivered: delivery confirmation received
    -- failed: send failed
    -- skipped: skipped (opt-out, quiet hours, etc)

  -- Scheduling
  scheduled_at TIMESTAMPTZ,

  -- Processing
  trigger_run_id TEXT, -- For atomic claim
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,

  -- Result
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  twilio_message_sid TEXT,

  -- Skip/failure tracking
  skip_reason TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for SMS queue
CREATE INDEX IF NOT EXISTS idx_sms_queue_tenant ON sms_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_scheduled ON sms_queue(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_sms_queue_phone ON sms_queue(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_queue_message_sid ON sms_queue(twilio_message_sid)
  WHERE twilio_message_sid IS NOT NULL;

-- Index for opt-out lookups
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone ON sms_opt_outs(tenant_id, phone_number);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_sms_templates_type ON sms_templates(tenant_id, notification_type);

-- Add foreign key reference from notification_channel_settings to sms_templates
ALTER TABLE notification_channel_settings
  ADD CONSTRAINT fk_notification_channel_sms_template
  FOREIGN KEY (sms_template_id) REFERENCES sms_templates(id) ON DELETE SET NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_sms_settings_updated_at
  BEFORE UPDATE ON tenant_sms_settings
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER trigger_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER trigger_sms_queue_updated_at
  BEFORE UPDATE ON sms_queue
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();

CREATE TRIGGER trigger_notification_channel_settings_updated_at
  BEFORE UPDATE ON notification_channel_settings
  FOR EACH ROW EXECUTE FUNCTION update_sms_updated_at();
