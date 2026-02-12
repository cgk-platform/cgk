-- Creator Reminder Configuration
-- Configurable reminder chains for approval and welcome call sequences

CREATE TABLE IF NOT EXISTS creator_reminder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Only one config per tenant (enforced by unique constraint)
  -- This acts as a singleton table per tenant schema

  -- Approval reminders
  approval_enabled BOOLEAN DEFAULT true,
  approval_schedule_time TIME DEFAULT '09:00',
  approval_steps JSONB DEFAULT '[]', -- [{id, order, daysAfterTrigger, channels, templateId, templateName}]
  approval_escalation_enabled BOOLEAN DEFAULT true,
  approval_escalation_days INTEGER DEFAULT 7,
  approval_escalation_slack BOOLEAN DEFAULT true,

  -- Welcome call reminders
  welcome_call_enabled BOOLEAN DEFAULT true,
  welcome_call_schedule_time TIME DEFAULT '10:00',
  welcome_call_steps JSONB DEFAULT '[]', -- [{id, order, daysAfterTrigger, channels, templateId, templateName}]
  welcome_call_event_type_id TEXT, -- Cal.com event type for welcome calls

  -- Global settings
  max_one_per_day BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one config record per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_reminder_config_singleton ON creator_reminder_config ((true));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_reminder_config_updated_at ON creator_reminder_config;
CREATE TRIGGER update_creator_reminder_config_updated_at
  BEFORE UPDATE ON creator_reminder_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE creator_reminder_config IS 'Per-tenant reminder chain configuration for creator onboarding';
COMMENT ON COLUMN creator_reminder_config.approval_steps IS 'JSON array: [{id, order, daysAfterTrigger, channels: ["email"|"sms"], templateId, templateName}]';
COMMENT ON COLUMN creator_reminder_config.welcome_call_steps IS 'JSON array: [{id, order, daysAfterTrigger, channels: ["email"|"sms"], templateId, templateName}]';

-- Add reminder tracking columns to creators table
ALTER TABLE creators ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_reminder_count INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_scheduled_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS welcome_call_dismissed BOOLEAN DEFAULT false;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;

-- Index for finding creators needing reminders
-- Using 'pending' instead of 'onboarding' to match existing enum values
CREATE INDEX IF NOT EXISTS idx_creators_reminder_status ON creators(status, reminder_count, last_reminder_at)
  WHERE status IN ('approved', 'pending');
CREATE INDEX IF NOT EXISTS idx_creators_welcome_call ON creators(status, first_login_at, welcome_call_scheduled_at)
  WHERE status IN ('approved', 'pending', 'active');

COMMENT ON COLUMN creators.reminder_count IS 'Number of approval reminders sent';
COMMENT ON COLUMN creators.last_reminder_at IS 'Timestamp of last approval reminder';
COMMENT ON COLUMN creators.escalated_at IS 'When creator was marked as escalated due to no response';
COMMENT ON COLUMN creators.welcome_call_reminder_count IS 'Number of welcome call reminders sent';
COMMENT ON COLUMN creators.welcome_call_scheduled_at IS 'When welcome call was booked';
COMMENT ON COLUMN creators.welcome_call_dismissed IS 'Whether creator dismissed the welcome call prompt';
COMMENT ON COLUMN creators.first_login_at IS 'When creator first logged into the portal';
