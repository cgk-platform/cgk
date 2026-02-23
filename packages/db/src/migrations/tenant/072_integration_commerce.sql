-- Migration: 072_integration_commerce
-- Description: Integration credentials, expenses, discount code usages, conversations
-- Phase: Phase 8 Audit
--
-- Sources:
--   apps/admin/src/app/api/admin/meta-ads/callback/route.ts (inline CREATE TABLE removed)
--   apps/admin/src/lib/expenses/db.ts
--   apps/creator-portal/src/app/api/creator/brands/[brandSlug]/route.ts
--   apps/admin/src/app/api/admin/system/sync/route.ts

-- ============================================================
-- 1. integration_credentials
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type VARCHAR(50) NOT NULL UNIQUE,
  credentials JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_integration_credentials_updated_at ON integration_credentials;
CREATE TRIGGER update_integration_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE integration_credentials IS 'Third-party integration credentials (meta-ads, tiktok, klaviyo, etc.)';

-- ============================================================
-- 2. expenses (admin expense tracker, distinct from operating_expenses in 011)
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category TEXT NOT NULL CHECK (category IN (
    'advertising', 'creator_payments', 'software', 'shipping',
    'supplies', 'services', 'taxes', 'other'
  )),
  vendor TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  receipt_url TEXT,
  expense_date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_interval TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor);

COMMENT ON TABLE expenses IS 'Admin expense tracker for P&L reporting';

-- ============================================================
-- 3. discount_code_usages
-- ============================================================

CREATE TABLE IF NOT EXISTS discount_code_usages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  customer_id TEXT,
  order_id TEXT,
  discount_amount_cents INTEGER NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_code_usages_code ON discount_code_usages(code);
CREATE INDEX IF NOT EXISTS idx_discount_code_usages_creator_id ON discount_code_usages(creator_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_usages_order_id ON discount_code_usages(order_id);

COMMENT ON TABLE discount_code_usages IS 'Tracks creator discount code usage for attribution';

-- ============================================================
-- 4. conversations
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT,
  phone TEXT,
  participant_type TEXT NOT NULL DEFAULT 'customer' CHECK (participant_type IN ('creator', 'customer', 'admin')),
  participant_id TEXT,
  last_message_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_conversations_email ON conversations(email);
CREATE INDEX IF NOT EXISTS idx_conversations_participant ON conversations(participant_type, participant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

COMMENT ON TABLE conversations IS 'Generic conversation tracking for inbox/system sync';
