-- Creator Notification Settings table
-- Per-creator preferences for email and SMS notifications

CREATE TABLE IF NOT EXISTS creator_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator reference
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Notification type toggles (email)
  email_project_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  email_project_updated BOOLEAN NOT NULL DEFAULT TRUE,
  email_message_received BOOLEAN NOT NULL DEFAULT TRUE,
  email_payment_received BOOLEAN NOT NULL DEFAULT TRUE,
  email_deadline_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  email_revision_requested BOOLEAN NOT NULL DEFAULT TRUE,

  -- Notification type toggles (SMS)
  sms_project_assigned BOOLEAN NOT NULL DEFAULT FALSE,
  sms_project_updated BOOLEAN NOT NULL DEFAULT FALSE,
  sms_message_received BOOLEAN NOT NULL DEFAULT FALSE,
  sms_payment_received BOOLEAN NOT NULL DEFAULT TRUE,
  sms_deadline_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  sms_revision_requested BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_notification_settings_updated_at ON creator_notification_settings;
CREATE TRIGGER update_creator_notification_settings_updated_at
  BEFORE UPDATE ON creator_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_creator_notification_settings_creator_id ON creator_notification_settings(creator_id);

COMMENT ON TABLE creator_notification_settings IS 'Per-creator notification preferences for email and SMS.';
COMMENT ON COLUMN creator_notification_settings.sms_payment_received IS 'SMS enabled by default for payment notifications.';
