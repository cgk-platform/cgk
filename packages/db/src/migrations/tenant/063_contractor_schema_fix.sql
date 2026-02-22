-- Migration: 063_contractor_schema_fix
-- Description: Fix contractor tables + create missing payment/payout tables
-- Phase: REMEDIATION (P0 Schema Fix)
-- Refs: AGENT-19-CONTRACTOR-SUPPORT.md

-- ============================================================
-- 1. contractor_sessions — Add missing columns
--    Code expects: tenant_id, token_hash (not token), device_info,
--    device_type, revoked_at
-- ============================================================

ALTER TABLE contractor_sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE contractor_sessions ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE contractor_sessions ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE contractor_sessions ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE contractor_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Create index on token_hash (code looks up by hash, not raw token)
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_token_hash ON contractor_sessions(token_hash);

-- ============================================================
-- 2. contractor_projects — Add missing columns + expand status
--    Code expects: tenant_id, due_date, rate_cents, rate_type,
--    submitted_work, revision_notes, submitted_at, approved_at,
--    and a 9-value status enum
-- ============================================================

ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS rate_cents INTEGER;
ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS rate_type TEXT;
ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS submitted_work JSONB;
ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE contractor_projects ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Expand status CHECK constraint to include all 9 values code uses
ALTER TABLE contractor_projects DROP CONSTRAINT IF EXISTS contractor_projects_status_check;
ALTER TABLE contractor_projects ADD CONSTRAINT contractor_projects_status_check
  CHECK (status IN (
    'active', 'completed', 'cancelled', 'on_hold',
    'pending_contractor', 'draft', 'in_progress', 'submitted',
    'revision_requested', 'approved', 'payout_ready',
    'withdrawal_requested', 'payout_approved'
  ));

-- ============================================================
-- 3. contractor_magic_links — Create if missing, then add
--    columns that earlier migration 050 didn't include
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_magic_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contractor_id TEXT,
  email TEXT,
  token TEXT,
  token_hash TEXT,
  purpose TEXT NOT NULL DEFAULT 'login',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If the table already existed from 050, these columns are missing
ALTER TABLE contractor_magic_links ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contractor_magic_links ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE contractor_magic_links ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'login';

-- ============================================================
-- 4. contractor_password_reset_tokens — Create if missing, then
--    add columns that earlier migration 051 didn't include
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contractor_id TEXT NOT NULL,
  email TEXT,
  token TEXT,
  token_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already existed from 051, these columns are missing
ALTER TABLE contractor_password_reset_tokens ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contractor_password_reset_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE contractor_password_reset_tokens ADD COLUMN IF NOT EXISTS user_agent TEXT;


-- ============================================================
-- 5. payment_requests — Create if missing, then add columns
--    that may be absent if table pre-exists with minimal schema
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT,
  tenant_id TEXT,
  amount_cents INTEGER,
  description TEXT,
  work_type TEXT,
  project_id TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  approved_amount_cents INTEGER,
  approved_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- If table pre-existed with fewer columns, add them now
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS payee_id TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS work_type TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS approved_amount_cents INTEGER;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payment_requests_payee ON payment_requests(payee_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_tenant ON payment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created ON payment_requests(created_at);

COMMENT ON TABLE payment_requests IS 'Contractor payment requests with approval workflow';

-- ============================================================
-- 6. CREATE TABLE payment_request_attachments
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_request_attachments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attachments_payee ON payment_request_attachments(payee_id);

COMMENT ON TABLE payment_request_attachments IS 'File attachments for contractor payment requests';

-- ============================================================
-- 7. CREATE TABLE withdrawal_requests (tenant schema)
--    Note: public.withdrawal_requests exists for creators.
--    This is a separate tenant-schema table for contractors.
-- ============================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  payout_method_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  external_transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payee ON withdrawal_requests(payee_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_tenant ON withdrawal_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE withdrawal_requests IS 'Contractor payout withdrawal requests';

-- ============================================================
-- 8. CREATE TABLE payout_methods
-- ============================================================

CREATE TABLE IF NOT EXISTS payout_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'pending', 'disabled', 'requires_action')),
  -- Stripe Connect fields
  stripe_account_id TEXT,
  stripe_account_status TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  stripe_charges_enabled BOOLEAN DEFAULT false,
  stripe_details_submitted BOOLEAN DEFAULT false,
  stripe_capabilities JSONB,
  stripe_requirements_due JSONB,
  stripe_requirements_errors JSONB,
  stripe_access_token TEXT,
  stripe_refresh_token TEXT,
  account_country TEXT,
  account_currency TEXT,
  -- Alternative methods
  paypal_email TEXT,
  venmo_handle TEXT,
  check_address JSONB,
  -- Bank info summary
  bank_name TEXT,
  account_last_four TEXT,
  -- Verification
  verification_status TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_methods_payee ON payout_methods(payee_id);
CREATE INDEX IF NOT EXISTS idx_payout_methods_tenant ON payout_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payout_methods_default ON payout_methods(payee_id) WHERE is_default = true;

DROP TRIGGER IF EXISTS update_payout_methods_updated_at ON payout_methods;
CREATE TRIGGER update_payout_methods_updated_at
  BEFORE UPDATE ON payout_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE payout_methods IS 'Contractor payout methods (Stripe Connect, PayPal, Venmo, check)';

-- ============================================================
-- 9. balance_transactions — Ensure contractor columns exist
--    Table may already exist from treasury migration (015)
--    with creator_id. Add payee_id + missing columns.
-- ============================================================

CREATE TABLE IF NOT EXISTS balance_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT,
  tenant_id TEXT,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If table pre-existed from treasury migration, add missing columns
ALTER TABLE balance_transactions ADD COLUMN IF NOT EXISTS payee_id TEXT;
ALTER TABLE balance_transactions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE balance_transactions ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE balance_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_balance_tx_payee ON balance_transactions(payee_id);
CREATE INDEX IF NOT EXISTS idx_balance_tx_tenant ON balance_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_balance_tx_type ON balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_balance_tx_created ON balance_transactions(created_at);

COMMENT ON TABLE balance_transactions IS 'Balance ledger transactions (creators and contractors)';

-- ============================================================
-- 10. CREATE TABLE payee_tax_info
-- ============================================================

CREATE TABLE IF NOT EXISTS payee_tax_info (
  payee_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  tax_id_type TEXT,
  tax_id_last4 TEXT,
  tax_id_encrypted TEXT,
  legal_name TEXT,
  business_name TEXT,
  entity_type TEXT,
  address JSONB,
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  ip_address TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payee_tax_tenant ON payee_tax_info(tenant_id);

DROP TRIGGER IF EXISTS update_payee_tax_info_updated_at ON payee_tax_info;
CREATE TRIGGER update_payee_tax_info_updated_at
  BEFORE UPDATE ON payee_tax_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE payee_tax_info IS 'Contractor W-9 tax information (encrypted)';
COMMENT ON COLUMN payee_tax_info.tax_id_encrypted IS 'AES-256-GCM encrypted full SSN/EIN';

-- ============================================================
-- 11. CREATE TABLE payee_tax_forms
-- ============================================================

CREATE TABLE IF NOT EXISTS payee_tax_forms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payee_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  form_type TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'filed', 'corrected')),
  file_url TEXT,
  generated_at TIMESTAMPTZ,
  filed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payee_tax_forms_payee ON payee_tax_forms(payee_id);
CREATE INDEX IF NOT EXISTS idx_payee_tax_forms_tenant ON payee_tax_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payee_tax_forms_year ON payee_tax_forms(tax_year);

COMMENT ON TABLE payee_tax_forms IS '1099-NEC/1099-MISC tax forms for contractors';

-- ============================================================
-- 12. CREATE TABLE stripe_onboarding_progress
-- ============================================================

CREATE TABLE IF NOT EXISTS stripe_onboarding_progress (
  payee_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  stripe_account_id TEXT,
  current_step INTEGER NOT NULL DEFAULT 1,
  step1_data JSONB,
  step2_data JSONB,
  step3_data JSONB,
  step4_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_onboard_tenant ON stripe_onboarding_progress(tenant_id);

DROP TRIGGER IF EXISTS update_stripe_onboard_updated_at ON stripe_onboarding_progress;
CREATE TRIGGER update_stripe_onboard_updated_at
  BEFORE UPDATE ON stripe_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE stripe_onboarding_progress IS 'Multi-step Stripe Connect onboarding state for contractors';
