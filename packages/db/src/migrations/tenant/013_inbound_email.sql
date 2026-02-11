-- Inbound Email Processing Tables
-- Phase 2CM-INBOUND-EMAIL

-- ============================================================
-- Inbound Email Logs (all received emails)
-- ============================================================

CREATE TABLE IF NOT EXISTS inbound_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email headers
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  subject TEXT,

  -- Content
  body_text TEXT,
  body_html TEXT,

  -- Attachments (stored in Vercel Blob)
  attachments JSONB DEFAULT '[]',
    -- [{ filename, content_type, size_bytes, blob_url }]

  -- Message IDs for threading
  message_id TEXT, -- RFC 2822 Message-ID
  in_reply_to TEXT, -- For threading
  references_list TEXT[], -- Thread references

  -- Routing
  email_type TEXT NOT NULL DEFAULT 'unknown',
    -- treasury_approval, receipt, support, creator_reply, unknown
  inbound_address_id UUID REFERENCES tenant_sender_addresses(id) ON DELETE SET NULL,

  -- Processing
  processing_status TEXT NOT NULL DEFAULT 'pending',
    -- pending, processed, failed, ignored
  processing_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Linking
  linked_record_type TEXT, -- treasury_request, thread, creator
  linked_record_id TEXT,

  -- Metadata
  raw_payload JSONB, -- Original webhook payload
  resend_email_id TEXT,

  -- Spam/Auto-reply detection
  is_auto_reply BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  spam_score REAL,

  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_email_logs_type ON inbound_email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_inbound_email_logs_status ON inbound_email_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbound_email_logs_from ON inbound_email_logs(from_address);
CREATE INDEX IF NOT EXISTS idx_inbound_email_logs_received ON inbound_email_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_email_logs_message_id ON inbound_email_logs(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_email_logs_in_reply_to ON inbound_email_logs(in_reply_to) WHERE in_reply_to IS NOT NULL;

-- ============================================================
-- Treasury Communications (approval request conversations)
-- ============================================================

CREATE TABLE IF NOT EXISTS treasury_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treasury_request_id TEXT, -- References external treasury_requests table

  -- Direction
  direction TEXT NOT NULL, -- inbound, outbound
  channel TEXT NOT NULL, -- email, slack, manual

  -- Email details
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,

  -- Approval parsing (for inbound)
  parsed_approval_status TEXT, -- approved, rejected, unclear
  parsed_confidence TEXT, -- high, medium, low
  matched_keywords TEXT[],

  -- Threading
  message_id TEXT,
  in_reply_to TEXT,

  -- Link to inbound log
  inbound_email_id UUID REFERENCES inbound_email_logs(id) ON DELETE SET NULL,

  -- Processing
  processed_at TIMESTAMPTZ,
  processed_by TEXT, -- system or user_id

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_comms_request ON treasury_communications(treasury_request_id);
CREATE INDEX IF NOT EXISTS idx_treasury_comms_direction ON treasury_communications(direction);
CREATE INDEX IF NOT EXISTS idx_treasury_comms_created ON treasury_communications(created_at DESC);

-- ============================================================
-- Treasury Receipts (forwarded receipts for expense tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS treasury_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email context
  inbound_email_id UUID REFERENCES inbound_email_logs(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  subject TEXT,
  body TEXT,

  -- Attachments (PDFs, images)
  attachments JSONB DEFAULT '[]',
    -- [{ filename, content_type, blob_url, size_bytes }]

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending, processed, archived, rejected

  -- Linked expense (after processing)
  linked_expense_id TEXT, -- References operating_expenses table

  -- Extracted/entered data
  vendor_name TEXT,
  description TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  expense_category_id TEXT,
  receipt_date DATE,

  -- Admin notes
  notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_receipts_status ON treasury_receipts(status);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_from ON treasury_receipts(from_address);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_created ON treasury_receipts(created_at DESC);

-- ============================================================
-- Email Threads (for support and creator conversations)
-- ============================================================

CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  contact_type TEXT NOT NULL, -- creator, customer, vendor, unknown
  contact_id TEXT, -- References creators, customers, etc.
  contact_email TEXT NOT NULL,
  contact_name TEXT,

  -- Thread info
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, closed, pending

  -- Stats
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID,
  tags TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_threads_contact ON email_threads(contact_type, contact_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_email ON email_threads(contact_email);
CREATE INDEX IF NOT EXISTS idx_email_threads_status ON email_threads(status);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads(last_message_at DESC);

-- ============================================================
-- Thread Messages (individual messages in a thread)
-- ============================================================

CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,

  -- Direction
  direction TEXT NOT NULL, -- inbound, outbound

  -- Email details
  from_address TEXT NOT NULL,
  to_address TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Attachments
  attachments JSONB DEFAULT '[]',

  -- Message IDs
  message_id TEXT,
  in_reply_to TEXT,

  -- Link to inbound log (for inbound messages)
  inbound_email_id UUID REFERENCES inbound_email_logs(id) ON DELETE SET NULL,

  -- For outbound, link to queue entry
  queue_entry_id UUID,
  queue_type TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'received', -- received, sent, failed

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_message_id ON thread_messages(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_thread_messages_created ON thread_messages(created_at DESC);

-- ============================================================
-- Auto-Response Rules
-- ============================================================

CREATE TABLE IF NOT EXISTS auto_response_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule details
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,

  -- Matching criteria
  match_type TEXT NOT NULL, -- all, any
  conditions JSONB NOT NULL DEFAULT '[]',
    -- [{ field: 'from_address', operator: 'contains', value: '@domain.com' }]

  -- Response
  response_template_id UUID, -- References email templates
  response_delay_minutes INTEGER DEFAULT 0,
  response_subject TEXT,
  response_body TEXT,

  -- Limits
  max_responses_per_sender INTEGER DEFAULT 1, -- Per 24 hours
  cooldown_hours INTEGER DEFAULT 24,

  -- Priority (higher = checked first)
  priority INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_response_rules_enabled ON auto_response_rules(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_auto_response_rules_priority ON auto_response_rules(priority DESC);

-- ============================================================
-- Auto-Response Log
-- ============================================================

CREATE TABLE IF NOT EXISTS auto_response_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  rule_id UUID NOT NULL REFERENCES auto_response_rules(id) ON DELETE CASCADE,
  inbound_email_id UUID NOT NULL REFERENCES inbound_email_logs(id) ON DELETE CASCADE,

  -- Response details
  response_sent_at TIMESTAMPTZ,
  response_message_id TEXT,
  response_status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed

  -- Metadata
  sender_email TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_response_log_rule ON auto_response_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_response_log_sender ON auto_response_log(sender_email, created_at DESC);

-- ============================================================
-- Triggers for updated_at
-- ============================================================

DROP TRIGGER IF EXISTS update_treasury_receipts_updated_at ON treasury_receipts;
CREATE TRIGGER update_treasury_receipts_updated_at
  BEFORE UPDATE ON treasury_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_threads_updated_at ON email_threads;
CREATE TRIGGER update_email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auto_response_rules_updated_at ON auto_response_rules;
CREATE TRIGGER update_auto_response_rules_updated_at
  BEFORE UPDATE ON auto_response_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE inbound_email_logs IS 'Log of all inbound emails received via webhooks';
COMMENT ON TABLE treasury_communications IS 'Communications related to treasury approval requests';
COMMENT ON TABLE treasury_receipts IS 'Receipts forwarded via email for expense tracking';
COMMENT ON TABLE email_threads IS 'Email conversation threads with contacts';
COMMENT ON TABLE thread_messages IS 'Individual messages within email threads';
COMMENT ON TABLE auto_response_rules IS 'Rules for automatic email responses';
COMMENT ON TABLE auto_response_log IS 'Log of automatic responses sent';

COMMENT ON COLUMN inbound_email_logs.email_type IS 'Type: treasury_approval, receipt, support, creator_reply, unknown';
COMMENT ON COLUMN inbound_email_logs.processing_status IS 'Status: pending, processed, failed, ignored';
COMMENT ON COLUMN treasury_communications.direction IS 'Direction: inbound or outbound';
COMMENT ON COLUMN treasury_receipts.status IS 'Status: pending, processed, archived, rejected';
COMMENT ON COLUMN email_threads.contact_type IS 'Type: creator, customer, vendor, unknown';
COMMENT ON COLUMN thread_messages.direction IS 'Direction: inbound or outbound';
