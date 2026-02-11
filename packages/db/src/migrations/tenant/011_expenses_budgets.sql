-- Expenses, Budgets, and P&L Statement Tables
-- Phase 2H: Financial Expenses & P&L

-- ============================================================
-- Operating Expenses (manual expense entries)
-- ============================================================

CREATE TABLE IF NOT EXISTS operating_expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Expense details
  date DATE NOT NULL,
  category_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  vendor_name TEXT,
  notes TEXT,
  receipt_url TEXT,

  -- P&L tracking
  count_for_pnl BOOLEAN DEFAULT true,
  pnl_exclusion_reason TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Expense Budgets (monthly budget per category)
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_budgets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Budget scope
  category_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- Budget amount
  budgeted_cents INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT expense_budgets_unique UNIQUE(tenant_id, category_id, year, month),
  CONSTRAINT expense_budgets_month_valid CHECK (month >= 1 AND month <= 12),
  CONSTRAINT expense_budgets_year_valid CHECK (year >= 2020 AND year <= 2100)
);

-- ============================================================
-- Ad Spend (synced from external platforms)
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_spend (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Platform and date
  platform TEXT NOT NULL, -- 'meta', 'google', 'tiktok', 'other'
  date DATE NOT NULL,

  -- Ad account details
  account_id TEXT,
  account_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,

  -- Spend
  spend_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Metrics (for analysis)
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  conversion_value_cents INTEGER,

  -- Always included in P&L
  count_for_pnl BOOLEAN DEFAULT true,

  -- Sync metadata
  external_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ad_spend_unique_entry UNIQUE(tenant_id, platform, date, account_id, campaign_id)
);

-- ============================================================
-- Vendor Payouts (non-creator vendor payments)
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Vendor details
  vendor_name TEXT NOT NULL,
  vendor_id TEXT,

  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,

  -- Description
  description TEXT,
  notes TEXT,

  -- P&L tracking
  count_for_pnl BOOLEAN DEFAULT true,
  pnl_exclusion_reason TEXT,
  category_id TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Contractor Payouts (non-creator contractor payments)
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Contractor details
  contractor_name TEXT NOT NULL,
  contractor_id TEXT,

  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,

  -- Description
  description TEXT,
  notes TEXT,

  -- P&L tracking
  count_for_pnl BOOLEAN DEFAULT true,
  pnl_exclusion_reason TEXT,
  category_id TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- P&L Snapshots (generated P&L statements for historical reference)
-- ============================================================

CREATE TABLE IF NOT EXISTS pnl_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_type TEXT NOT NULL, -- 'month', 'quarter', 'year', 'custom'

  -- Full P&L data (JSON snapshot)
  statement_data JSONB NOT NULL,

  -- Summary metrics
  net_revenue_cents BIGINT NOT NULL,
  gross_profit_cents BIGINT NOT NULL,
  contribution_margin_cents BIGINT NOT NULL,
  operating_income_cents BIGINT NOT NULL,
  net_profit_cents BIGINT NOT NULL,

  -- Metadata
  generated_by TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pnl_snapshots_unique UNIQUE(tenant_id, start_date, end_date)
);

-- ============================================================
-- Indexes
-- ============================================================

-- Operating Expenses
CREATE INDEX IF NOT EXISTS idx_operating_expenses_tenant ON operating_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_date ON operating_expenses(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_category ON operating_expenses(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_pnl ON operating_expenses(tenant_id, count_for_pnl);

-- Expense Budgets
CREATE INDEX IF NOT EXISTS idx_expense_budgets_tenant ON expense_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_period ON expense_budgets(tenant_id, year, month);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_category ON expense_budgets(tenant_id, category_id);

-- Ad Spend
CREATE INDEX IF NOT EXISTS idx_ad_spend_tenant ON ad_spend(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ad_spend_date ON ad_spend(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_platform ON ad_spend(tenant_id, platform);
CREATE INDEX IF NOT EXISTS idx_ad_spend_date_range ON ad_spend(tenant_id, date, platform);

-- Vendor Payouts
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_tenant ON vendor_payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_date ON vendor_payouts(tenant_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_pnl ON vendor_payouts(tenant_id, count_for_pnl);

-- Contractor Payouts
CREATE INDEX IF NOT EXISTS idx_contractor_payouts_tenant ON contractor_payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contractor_payouts_date ON contractor_payouts(tenant_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_contractor_payouts_pnl ON contractor_payouts(tenant_id, count_for_pnl);

-- P&L Snapshots
CREATE INDEX IF NOT EXISTS idx_pnl_snapshots_tenant ON pnl_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pnl_snapshots_period ON pnl_snapshots(tenant_id, start_date, end_date);

-- ============================================================
-- Triggers for updated_at
-- ============================================================

DROP TRIGGER IF EXISTS update_operating_expenses_updated_at ON operating_expenses;
CREATE TRIGGER update_operating_expenses_updated_at
  BEFORE UPDATE ON operating_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_budgets_updated_at ON expense_budgets;
CREATE TRIGGER update_expense_budgets_updated_at
  BEFORE UPDATE ON expense_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_payouts_updated_at ON vendor_payouts;
CREATE TRIGGER update_vendor_payouts_updated_at
  BEFORE UPDATE ON vendor_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contractor_payouts_updated_at ON contractor_payouts;
CREATE TRIGGER update_contractor_payouts_updated_at
  BEFORE UPDATE ON contractor_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE operating_expenses IS 'Manual expense entries for operating costs not tracked elsewhere';
COMMENT ON TABLE expense_budgets IS 'Monthly budget targets per expense category';
COMMENT ON TABLE ad_spend IS 'Ad spend synced from Meta, Google, TikTok, etc.';
COMMENT ON TABLE vendor_payouts IS 'Payments to vendors (non-creator)';
COMMENT ON TABLE contractor_payouts IS 'Payments to contractors (non-creator)';
COMMENT ON TABLE pnl_snapshots IS 'Historical P&L statement snapshots';
