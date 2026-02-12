-- Tax Compliance Tables
-- W-9 collection, 1099 generation, and tax document management

-- Tax payee records (W-9 data)
CREATE TABLE IF NOT EXISTS tax_payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL CHECK (payee_type IN ('creator', 'contractor', 'merchant', 'vendor')),

  -- Identity
  legal_name TEXT NOT NULL,
  business_name TEXT,
  tax_classification TEXT NOT NULL,

  -- Address
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  -- TIN (encrypted with AES-256-GCM)
  tin_encrypted TEXT NOT NULL,
  tin_last_four TEXT NOT NULL,
  tin_type TEXT NOT NULL CHECK (tin_type IN ('ssn', 'ein')),

  -- W-9 Certification
  w9_certified_at TIMESTAMPTZ NOT NULL,
  w9_certified_name TEXT NOT NULL,
  w9_certified_ip TEXT,

  -- E-delivery consent
  e_delivery_consent BOOLEAN DEFAULT false,
  e_delivery_consent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(payee_id, payee_type)
);

-- 1099 form records
CREATE TABLE IF NOT EXISTS tax_forms (
  id TEXT PRIMARY KEY,
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('1099-NEC', '1099-MISC', '1099-K')),

  -- Payer info (from config)
  payer_tin TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_address JSONB NOT NULL,

  -- Recipient info (from tax_payees)
  recipient_tin_last_four TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_address JSONB NOT NULL,

  -- Amounts (in cents)
  total_amount_cents INTEGER NOT NULL,
  box_amounts JSONB NOT NULL DEFAULT '{}',

  -- Status workflow: draft -> pending_review -> approved -> filed
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_review',
    'approved',
    'filed',
    'corrected',
    'voided'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,

  -- IRS filing
  irs_filed_at TIMESTAMPTZ,
  irs_confirmation_number TEXT,

  -- State filing
  state_filed_at TIMESTAMPTZ,
  state_confirmation_number TEXT,

  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN ('email', 'portal', 'mail')),
  delivered_at TIMESTAMPTZ,
  delivery_confirmed_at TIMESTAMPTZ,
  mail_letter_id TEXT,
  mail_status TEXT,

  -- Corrections reference
  original_form_id TEXT REFERENCES tax_forms(id),
  correction_type TEXT CHECK (correction_type IN ('type1', 'type2'))
);

-- Create partial unique index for non-voided forms
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_forms_unique_active
  ON tax_forms (payee_id, payee_type, tax_year, form_type)
  WHERE status != 'voided';

-- Tax form audit log (immutable)
CREATE TABLE IF NOT EXISTS tax_form_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id TEXT REFERENCES tax_forms(id),
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'tax_info_created',
    'tax_info_updated',
    'tax_info_viewed',
    'tin_decrypted',
    'form_created',
    'form_approved',
    'form_filed',
    'form_delivered',
    'form_corrected',
    'form_voided',
    'pdf_generated',
    'pdf_downloaded',
    'mail_queued',
    'mail_sent',
    'mail_delivered',
    'mail_returned'
  )),
  performed_by TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- W-9 compliance reminder tracking
CREATE TABLE IF NOT EXISTS w9_compliance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL,
  initial_sent_at TIMESTAMPTZ,
  reminder_1_sent_at TIMESTAMPTZ,
  reminder_2_sent_at TIMESTAMPTZ,
  final_notice_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payee_id, payee_type)
);

-- Tax reminders and deadlines
CREATE TABLE IF NOT EXISTS tax_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tax_payees_payee ON tax_payees(payee_id, payee_type);
CREATE INDEX IF NOT EXISTS idx_tax_payees_type ON tax_payees(payee_type);

CREATE INDEX IF NOT EXISTS idx_tax_forms_payee_year ON tax_forms(payee_id, payee_type, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_forms_status ON tax_forms(status);
CREATE INDEX IF NOT EXISTS idx_tax_forms_tax_year ON tax_forms(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_forms_form_type ON tax_forms(form_type);

CREATE INDEX IF NOT EXISTS idx_tax_audit_form ON tax_form_audit_log(tax_form_id);
CREATE INDEX IF NOT EXISTS idx_tax_audit_payee ON tax_form_audit_log(payee_id, payee_type);
CREATE INDEX IF NOT EXISTS idx_tax_audit_action ON tax_form_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_tax_audit_created ON tax_form_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_w9_tracking_payee ON w9_compliance_tracking(payee_id, payee_type);
CREATE INDEX IF NOT EXISTS idx_w9_tracking_pending ON w9_compliance_tracking(completed_at) WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tax_reminders_due ON tax_reminders(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tax_reminders_status ON tax_reminders(status);

-- Trigger for updated_at on tax_payees
CREATE OR REPLACE FUNCTION update_tax_payees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_payees_updated_at ON tax_payees;
CREATE TRIGGER tax_payees_updated_at
  BEFORE UPDATE ON tax_payees
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_payees_updated_at();

-- Trigger for updated_at on w9_compliance_tracking
CREATE OR REPLACE FUNCTION update_w9_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS w9_tracking_updated_at ON w9_compliance_tracking;
CREATE TRIGGER w9_tracking_updated_at
  BEFORE UPDATE ON w9_compliance_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_w9_tracking_updated_at();

-- Insert default tax reminders for typical deadlines
INSERT INTO tax_reminders (title, description, due_date, priority, category, recurring, recurrence_rule)
VALUES
  ('1099 Forms Due to Recipients', 'All 1099 forms must be sent to recipients by January 31',
   (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + INTERVAL '30 days')::DATE,
   'high', '1099', true, 'YEARLY'),
  ('1099-NEC Filing Deadline', 'File 1099-NEC forms with IRS by January 31',
   (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + INTERVAL '30 days')::DATE,
   'high', 'filing', true, 'YEARLY'),
  ('W-9 Collection Reminder', 'Request W-9 forms from payees approaching $600 threshold',
   (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '9 months')::DATE,
   'medium', 'w9', true, 'YEARLY')
ON CONFLICT DO NOTHING;
