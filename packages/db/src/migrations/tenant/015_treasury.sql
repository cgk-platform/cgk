-- Treasury Management Tables
-- Draw requests, communications, receipts, Stripe top-ups

-- Draw request status enum
DO $$ BEGIN
  CREATE TYPE draw_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Communication direction enum
DO $$ BEGIN
  CREATE TYPE communication_direction AS ENUM ('outbound', 'inbound');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Parsed status enum for email parsing
DO $$ BEGIN
  CREATE TYPE parsed_status AS ENUM ('approved', 'rejected', 'unclear');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Parsed confidence enum
DO $$ BEGIN
  CREATE TYPE parsed_confidence AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Receipt status enum
DO $$ BEGIN
  CREATE TYPE receipt_status AS ENUM ('pending', 'processed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Stripe topup status enum
DO $$ BEGIN
  CREATE TYPE topup_status AS ENUM ('pending', 'succeeded', 'failed', 'canceled', 'reversed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Treasury Draw Requests
CREATE TABLE IF NOT EXISTS treasury_draw_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Request identification
  request_number TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Amount
  total_amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Treasurer info
  treasurer_name TEXT NOT NULL,
  treasurer_email TEXT NOT NULL,
  signers TEXT[] NOT NULL DEFAULT '{}',

  -- Timing
  due_date DATE,
  is_draft BOOLEAN DEFAULT false,

  -- Generated PDF
  pdf_url TEXT,

  -- Status tracking
  status draw_request_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  approval_message TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejection_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(request_number)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_treasury_draw_requests_updated_at ON treasury_draw_requests;
CREATE TRIGGER update_treasury_draw_requests_updated_at
  BEFORE UPDATE ON treasury_draw_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Draw Request Items (linked to withdrawals)
CREATE TABLE IF NOT EXISTS treasury_draw_request_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Parent request
  treasury_request_id TEXT NOT NULL REFERENCES treasury_draw_requests(id) ON DELETE CASCADE,

  -- Withdrawal reference
  withdrawal_id TEXT NOT NULL,

  -- Snapshot of creator/payout info at time of request
  creator_name TEXT NOT NULL,
  project_description TEXT,
  net_amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Treasury Communications (email log)
CREATE TABLE IF NOT EXISTS treasury_communications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Parent request
  treasury_request_id TEXT NOT NULL REFERENCES treasury_draw_requests(id) ON DELETE CASCADE,

  -- Direction and channel
  direction communication_direction NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',

  -- Message content
  subject TEXT,
  body TEXT NOT NULL,
  from_email TEXT,
  to_email TEXT,

  -- Parsing results (for inbound)
  parsed_status parsed_status,
  parsed_confidence parsed_confidence,
  matched_keywords TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Treasury Receipts/Invoices
CREATE TABLE IF NOT EXISTS treasury_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- File info
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes INTEGER,

  -- Receipt details
  vendor_name TEXT,
  description TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  receipt_date DATE,

  -- Status
  status receipt_status NOT NULL DEFAULT 'pending',

  -- Links
  expense_id TEXT,
  operating_expense_id TEXT,

  -- OCR extraction (future)
  ocr_extracted BOOLEAN DEFAULT false,
  ocr_data JSONB,

  -- Metadata
  uploaded_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_treasury_receipts_updated_at ON treasury_receipts;
CREATE TRIGGER update_treasury_receipts_updated_at
  BEFORE UPDATE ON treasury_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Stripe Top-ups
CREATE TABLE IF NOT EXISTS stripe_topups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Stripe reference
  stripe_topup_id TEXT NOT NULL,

  -- Amount
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status
  status topup_status NOT NULL DEFAULT 'pending',
  failure_code TEXT,
  failure_message TEXT,

  -- Timing
  expected_available_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Links to pending withdrawals this topup is meant to cover
  linked_withdrawal_ids TEXT[] DEFAULT '{}',

  -- Descriptors
  statement_descriptor TEXT,
  description TEXT,

  -- Metadata
  source_id TEXT,
  source_last4 TEXT,
  source_bank_name TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(stripe_topup_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_stripe_topups_updated_at ON stripe_topups;
CREATE TRIGGER update_stripe_topups_updated_at
  BEFORE UPDATE ON stripe_topups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Top-up Settings (per tenant)
CREATE TABLE IF NOT EXISTS topup_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',

  -- Default funding source
  default_source_id TEXT,
  default_source_last4 TEXT,
  default_source_bank_name TEXT,

  -- Auto top-up configuration
  auto_topup_enabled BOOLEAN DEFAULT false,
  auto_topup_threshold_cents INTEGER DEFAULT 0,
  auto_topup_amount_cents INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_topup_settings_updated_at ON topup_settings;
CREATE TRIGGER update_topup_settings_updated_at
  BEFORE UPDATE ON topup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Treasury Settings (per tenant)
CREATE TABLE IF NOT EXISTS treasury_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',

  -- Treasurer info
  treasurer_email TEXT,
  treasurer_name TEXT,
  default_signers TEXT[] DEFAULT '{}',

  -- Automation
  auto_send_enabled BOOLEAN DEFAULT false,
  auto_send_delay_hours INTEGER DEFAULT 24,
  auto_send_max_amount_cents INTEGER,

  -- Alerts
  low_balance_alert_threshold_cents INTEGER DEFAULT 100000, -- $1000 default

  -- Notifications
  slack_webhook_url TEXT,
  slack_notifications_enabled BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_treasury_settings_updated_at ON treasury_settings;
CREATE TRIGGER update_treasury_settings_updated_at
  BEFORE UPDATE ON treasury_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings if they don't exist
INSERT INTO topup_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
INSERT INTO treasury_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Indexes for treasury_draw_requests
CREATE INDEX IF NOT EXISTS idx_treasury_draw_requests_status ON treasury_draw_requests(status);
CREATE INDEX IF NOT EXISTS idx_treasury_draw_requests_created_at ON treasury_draw_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_draw_requests_treasurer_email ON treasury_draw_requests(treasurer_email);

-- Indexes for treasury_draw_request_items
CREATE INDEX IF NOT EXISTS idx_treasury_draw_request_items_treasury_request_id ON treasury_draw_request_items(treasury_request_id);
CREATE INDEX IF NOT EXISTS idx_treasury_draw_request_items_withdrawal_id ON treasury_draw_request_items(withdrawal_id);

-- Indexes for treasury_communications
CREATE INDEX IF NOT EXISTS idx_treasury_communications_treasury_request_id ON treasury_communications(treasury_request_id);
CREATE INDEX IF NOT EXISTS idx_treasury_communications_direction ON treasury_communications(direction);
CREATE INDEX IF NOT EXISTS idx_treasury_communications_created_at ON treasury_communications(created_at);

-- Indexes for treasury_receipts
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_status ON treasury_receipts(status);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_vendor_name ON treasury_receipts(vendor_name);
-- Note: Using linked_expense_id which matches existing schema
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_expense_id ON treasury_receipts(linked_expense_id);
CREATE INDEX IF NOT EXISTS idx_treasury_receipts_created_at ON treasury_receipts(created_at);

-- Indexes for stripe_topups
CREATE INDEX IF NOT EXISTS idx_stripe_topups_status ON stripe_topups(status);
CREATE INDEX IF NOT EXISTS idx_stripe_topups_stripe_topup_id ON stripe_topups(stripe_topup_id);
CREATE INDEX IF NOT EXISTS idx_stripe_topups_created_at ON stripe_topups(created_at);

-- Comments
COMMENT ON TABLE treasury_draw_requests IS 'SBA loan draw requests for treasurer approval';
COMMENT ON TABLE treasury_draw_request_items IS 'Individual payouts bundled in a draw request';
COMMENT ON TABLE treasury_communications IS 'Email communication log for draw requests';
COMMENT ON TABLE treasury_receipts IS 'Uploaded receipts and invoices for expenses';
COMMENT ON TABLE stripe_topups IS 'Stripe balance top-up history';
COMMENT ON TABLE topup_settings IS 'Auto top-up configuration';
COMMENT ON TABLE treasury_settings IS 'Treasury module settings';
