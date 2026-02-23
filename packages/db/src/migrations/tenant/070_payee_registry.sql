-- Migration: 070_payee_registry
-- Description: Central payee registry + naming alias views for 063 tables
-- Phase: Phase 8 Audit
--
-- The payees table links contractors/creators to the payment system.
-- The views alias 063's payment_requests/payout_methods/balance_transactions
-- to the payee_* names used in apps/admin/src/lib/contractors/db.ts.

-- ============================================================
-- 1. payees — Central payee registry
-- ============================================================

CREATE TABLE IF NOT EXISTS payees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  payee_type TEXT NOT NULL CHECK (payee_type IN ('contractor', 'creator', 'merchant', 'vendor')),
  reference_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  w9_status TEXT,
  w9_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payee_type, reference_id)
);

DROP TRIGGER IF EXISTS update_payees_updated_at ON payees;
CREATE TRIGGER update_payees_updated_at
  BEFORE UPDATE ON payees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payees_type_status ON payees(payee_type, status);
CREATE INDEX IF NOT EXISTS idx_payees_email ON payees(email);
CREATE INDEX IF NOT EXISTS idx_payees_tenant_id ON payees(tenant_id);

COMMENT ON TABLE payees IS 'Central payee registry linking contractors/creators to payment system';

-- ============================================================
-- 2. Views — Alias 063 tables to payee_* names
-- ============================================================

CREATE OR REPLACE VIEW payee_payment_methods AS SELECT * FROM payout_methods;
CREATE OR REPLACE VIEW payee_payment_requests AS SELECT * FROM payment_requests;
CREATE OR REPLACE VIEW payee_balance_transactions AS SELECT * FROM balance_transactions;

COMMENT ON VIEW payee_payment_methods IS 'Alias for payout_methods (used by contractors/db.ts)';
COMMENT ON VIEW payee_payment_requests IS 'Alias for payment_requests (used by contractors/db.ts)';
COMMENT ON VIEW payee_balance_transactions IS 'Alias for balance_transactions (used by contractors/db.ts)';
