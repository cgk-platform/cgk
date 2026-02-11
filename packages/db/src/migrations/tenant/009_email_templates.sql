-- Email Template Management Tables
-- Per-tenant customizable email templates with version history

-- Email Templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  notification_type TEXT NOT NULL,  -- review_request, creator_approved, etc.
  template_key TEXT NOT NULL,       -- For variants: review_request_incentive

  -- Category for organization
  category TEXT NOT NULL DEFAULT 'transactional',  -- transactional, marketing

  -- Content
  name TEXT NOT NULL,               -- Human-readable name
  description TEXT,                 -- Template description
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,                   -- Auto-generated if not provided

  -- Sender configuration
  sender_address_id UUID,           -- References tenant_sender_addresses if exists
  sender_name TEXT,                 -- Display name for sender
  sender_email TEXT,                -- Email address to send from
  reply_to_email TEXT,              -- Optional different reply-to

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Versioning
  version INTEGER DEFAULT 1,
  is_default BOOLEAN DEFAULT false, -- True if using system default content

  -- Metadata
  last_edited_by TEXT,              -- User ID who last edited
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_templates_unique_type_key UNIQUE(notification_type, template_key)
);

-- Email Template Versions table (for version history)
CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,

  -- Versioned content
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  -- Metadata
  changed_by TEXT,                  -- User ID who made the change
  change_note TEXT,                 -- Optional note about the change
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_template_versions_unique UNIQUE(template_id, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_notification_type
  ON email_templates(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_category
  ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active
  ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_template_id
  ON email_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_created_at
  ON email_template_versions(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE email_templates IS 'Per-tenant customizable email templates';
COMMENT ON TABLE email_template_versions IS 'Version history for email templates';
COMMENT ON COLUMN email_templates.notification_type IS 'Type of notification: review_request, creator_approved, etc.';
COMMENT ON COLUMN email_templates.template_key IS 'Unique key within type for variants';
COMMENT ON COLUMN email_templates.category IS 'Template category: transactional or marketing';
COMMENT ON COLUMN email_templates.is_default IS 'Whether using default content or customized';
