-- Creator Communications Hub Tables
-- PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS
-- Email templates, queue management, notification settings, bulk sends

-- ============================================================
-- Creator Email Templates (tenant-specific templates)
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identity
  category TEXT NOT NULL DEFAULT 'general',
    -- onboarding, projects, payments, esign, general
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Content
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,

  -- Variables used in this template
  variables JSONB DEFAULT '[]',
    -- [{ key: 'creator_name', description: 'Full name', required: true }]

  -- Sender configuration
  from_address TEXT,
  reply_to TEXT,

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  -- Audit
  created_by UUID,
  last_edited_by UUID,
  last_edited_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT creator_email_templates_slug_unique UNIQUE(slug)
);

CREATE INDEX IF NOT EXISTS idx_creator_email_templates_category ON creator_email_templates(category);
CREATE INDEX IF NOT EXISTS idx_creator_email_templates_enabled ON creator_email_templates(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_creator_email_templates_slug ON creator_email_templates(slug);

-- ============================================================
-- Creator Email Template Versions (history)
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES creator_email_templates(id) ON DELETE CASCADE,

  -- Snapshot
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  variables JSONB DEFAULT '[]',

  -- Audit
  changed_by UUID,
  change_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT creator_template_versions_unique UNIQUE(template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_creator_template_versions_template ON creator_email_template_versions(template_id);

-- ============================================================
-- Creator Notification Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Notification type identifier
  notification_type TEXT NOT NULL UNIQUE,
    -- application_received, application_approved, application_rejected,
    -- project_assigned, deadline_reminder, revision_requested, project_approved,
    -- payment_available, withdrawal_processed, payment_failed,
    -- esign_request, esign_reminder, document_completed

  -- Display info
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
    -- onboarding, projects, payments, esign

  -- Channel settings
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,

  -- Template reference
  template_id UUID REFERENCES creator_email_templates(id) ON DELETE SET NULL,

  -- Timing
  delay_minutes INTEGER DEFAULT 0,

  -- Override settings
  subject_override TEXT,
  is_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_notification_settings_type ON creator_notification_settings(notification_type);
CREATE INDEX IF NOT EXISTS idx_creator_notification_settings_category ON creator_notification_settings(category);

-- ============================================================
-- Creator Bulk Sends (campaigns)
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_bulk_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign details
  name TEXT,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,

  -- Recipients
  recipient_count INTEGER NOT NULL DEFAULT 0,
  recipient_filter JSONB,
    -- { status: ['active'], tier: ['gold', 'platinum'], tags: ['vip'] }
  recipient_ids TEXT[],

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
    -- draft, scheduled, sending, completed, cancelled

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Statistics
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  -- Options
  personalize BOOLEAN DEFAULT true,
  include_unsubscribe BOOLEAN DEFAULT true,
  send_as_separate_threads BOOLEAN DEFAULT false,

  -- Audit
  created_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_bulk_sends_status ON creator_bulk_sends(status);
CREATE INDEX IF NOT EXISTS idx_creator_bulk_sends_scheduled ON creator_bulk_sends(scheduled_for) WHERE status = 'scheduled';

-- ============================================================
-- Creator Bulk Send Recipients (individual tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_bulk_send_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_send_id UUID NOT NULL REFERENCES creator_bulk_sends(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  creator_name TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending, sent, failed, bounced

  -- Tracking
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  resend_message_id TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_bulk_recipients_bulk ON creator_bulk_send_recipients(bulk_send_id);
CREATE INDEX IF NOT EXISTS idx_creator_bulk_recipients_status ON creator_bulk_send_recipients(status);
CREATE INDEX IF NOT EXISTS idx_creator_bulk_recipients_creator ON creator_bulk_send_recipients(creator_id);

-- ============================================================
-- Creator Threads (enhanced from email_threads)
-- ============================================================

-- Add creator-specific columns to email_threads if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_threads' AND column_name = 'project_id') THEN
    ALTER TABLE email_threads ADD COLUMN project_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_threads' AND column_name = 'is_starred') THEN
    ALTER TABLE email_threads ADD COLUMN is_starred BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_threads' AND column_name = 'is_archived') THEN
    ALTER TABLE email_threads ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_threads' AND column_name = 'unread_count') THEN
    ALTER TABLE email_threads ADD COLUMN unread_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- Thread Messages Enhancements
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thread_messages' AND column_name = 'is_internal') THEN
    ALTER TABLE thread_messages ADD COLUMN is_internal BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thread_messages' AND column_name = 'scheduled_for') THEN
    ALTER TABLE thread_messages ADD COLUMN scheduled_for TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thread_messages' AND column_name = 'sender_user_id') THEN
    ALTER TABLE thread_messages ADD COLUMN sender_user_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thread_messages' AND column_name = 'read_at') THEN
    ALTER TABLE thread_messages ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- Global Communication Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Default sender
  default_from_address TEXT,
  default_reply_to TEXT,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'America/New_York',

  -- Unsubscribe handling
  unsubscribe_footer_enabled BOOLEAN DEFAULT true,
  unsubscribe_url TEXT,

  -- Rate limiting
  max_emails_per_day INTEGER DEFAULT 500,
  max_bulk_recipients INTEGER DEFAULT 500,
  bulk_send_rate_per_minute INTEGER DEFAULT 100,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed Default Notification Settings
-- ============================================================

INSERT INTO creator_notification_settings (notification_type, display_name, description, category, email_enabled)
VALUES
  ('application_received', 'Application Received', 'Sent when a creator submits an application', 'onboarding', true),
  ('application_approved', 'Application Approved', 'Sent when a creator application is approved', 'onboarding', true),
  ('application_rejected', 'Application Rejected', 'Sent when a creator application is rejected', 'onboarding', true),
  ('project_assigned', 'Project Assigned', 'Sent when a creator is assigned to a project', 'projects', true),
  ('deadline_reminder', 'Deadline Reminder', 'Sent before project deadlines', 'projects', true),
  ('revision_requested', 'Revision Requested', 'Sent when revisions are requested on a deliverable', 'projects', true),
  ('project_approved', 'Project Approved', 'Sent when a project deliverable is approved', 'projects', true),
  ('payment_available', 'Payment Available', 'Sent when earnings are available for withdrawal', 'payments', true),
  ('withdrawal_processed', 'Withdrawal Processed', 'Sent when a withdrawal has been processed', 'payments', true),
  ('payment_failed', 'Payment Failed', 'Sent when a payment fails', 'payments', true),
  ('esign_request', 'Signature Request', 'Sent when a document needs to be signed', 'esign', true),
  ('esign_reminder', 'Signature Reminder', 'Reminder for unsigned documents', 'esign', true),
  ('document_completed', 'Document Completed', 'Sent when all signatures are collected', 'esign', true)
ON CONFLICT (notification_type) DO NOTHING;

-- ============================================================
-- Triggers
-- ============================================================

DROP TRIGGER IF EXISTS update_creator_email_templates_updated_at ON creator_email_templates;
CREATE TRIGGER update_creator_email_templates_updated_at
  BEFORE UPDATE ON creator_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_notification_settings_updated_at ON creator_notification_settings;
CREATE TRIGGER update_creator_notification_settings_updated_at
  BEFORE UPDATE ON creator_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_bulk_sends_updated_at ON creator_bulk_sends;
CREATE TRIGGER update_creator_bulk_sends_updated_at
  BEFORE UPDATE ON creator_bulk_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_creator_communication_settings_updated_at ON creator_communication_settings;
CREATE TRIGGER update_creator_communication_settings_updated_at
  BEFORE UPDATE ON creator_communication_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE creator_email_templates IS 'Email templates for creator communications';
COMMENT ON TABLE creator_email_template_versions IS 'Version history for email templates';
COMMENT ON TABLE creator_notification_settings IS 'Per-notification-type settings and channels';
COMMENT ON TABLE creator_bulk_sends IS 'Bulk email campaigns to creators';
COMMENT ON TABLE creator_bulk_send_recipients IS 'Individual recipient tracking for bulk sends';
COMMENT ON TABLE creator_communication_settings IS 'Global communication configuration';
