-- P&L Configuration & Cost Management
-- Tenant-scoped tables for variable costs, COGS, expense categories, and P&L formula config

-- ============================================================
-- Variable Cost Configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS variable_cost_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Payment Processing
  primary_processor VARCHAR(50) DEFAULT 'shopify_payments',
  payment_percentage_rate DECIMAL(6,4) DEFAULT 0.0290,
  payment_fixed_fee_cents INTEGER DEFAULT 30,
  additional_processors JSONB DEFAULT '[]',

  -- Fulfillment Costs
  fulfillment_cost_model VARCHAR(20) DEFAULT 'per_order',
  pick_pack_fee_cents INTEGER DEFAULT 200,
  pick_pack_per_item_cents INTEGER DEFAULT 0,
  packaging_cost_cents INTEGER DEFAULT 75,
  handling_fee_cents INTEGER DEFAULT 0,
  weight_tiers JSONB DEFAULT '[]',

  -- Shipping Costs
  shipping_tracking_method VARCHAR(30) DEFAULT 'actual_expense',
  shipping_estimated_percent DECIMAL(5,4),
  shipping_flat_rate_cents INTEGER,

  -- Other Variable Costs (dynamic list)
  other_variable_costs JSONB DEFAULT '[]',

  -- Metadata
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT variable_cost_config_one_per_tenant UNIQUE(tenant_id)
);

-- ============================================================
-- COGS Source Configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS cogs_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Source Type
  cogs_source VARCHAR(20) DEFAULT 'shopify',

  -- Shopify Mode Settings
  shopify_sync_enabled BOOLEAN DEFAULT true,
  shopify_sync_frequency VARCHAR(20) DEFAULT 'realtime',
  shopify_cost_field VARCHAR(50) DEFAULT 'cost',
  shopify_last_sync_at TIMESTAMPTZ,

  -- Fallback Behavior
  fallback_behavior VARCHAR(30) DEFAULT 'zero',
  fallback_percent DECIMAL(5,4),
  fallback_default_cogs_cents INTEGER,

  -- Internal Mode Settings
  last_import_at TIMESTAMPTZ,
  import_source VARCHAR(20),

  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT cogs_config_one_per_tenant UNIQUE(tenant_id)
);

-- ============================================================
-- Product COGS (for manual/internal COGS source)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_cogs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  sku TEXT,
  cogs_cents INTEGER NOT NULL,
  source VARCHAR(20) DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT product_cogs_unique_variant UNIQUE(tenant_id, product_id, COALESCE(variant_id, ''::TEXT))
);

-- ============================================================
-- P&L Formula Configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS pl_formula_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,

  -- Revenue Section
  revenue_include_shipping BOOLEAN DEFAULT false,
  revenue_include_tax BOOLEAN DEFAULT false,
  revenue_show_gross_sales BOOLEAN DEFAULT true,
  revenue_show_discounts BOOLEAN DEFAULT true,
  revenue_show_returns BOOLEAN DEFAULT true,

  -- COGS Section
  cogs_label VARCHAR(100) DEFAULT 'Cost of Goods Sold',
  cogs_include_free_samples BOOLEAN DEFAULT false,
  cogs_show_as_percentage BOOLEAN DEFAULT true,

  -- Variable Costs Section
  variable_costs_label VARCHAR(100) DEFAULT 'Variable Costs',
  variable_show_payment_processing BOOLEAN DEFAULT true,
  variable_show_fulfillment BOOLEAN DEFAULT true,
  variable_show_packaging BOOLEAN DEFAULT true,
  variable_show_shipping BOOLEAN DEFAULT true,
  variable_group_fulfillment BOOLEAN DEFAULT false,
  variable_custom_cost_visibility JSONB DEFAULT '{}',

  -- Contribution Margin
  contribution_margin_label VARCHAR(100) DEFAULT 'Contribution Margin',
  contribution_show_as_percentage BOOLEAN DEFAULT true,
  contribution_highlight_negative BOOLEAN DEFAULT true,

  -- Marketing Section
  marketing_label VARCHAR(100) DEFAULT 'Marketing',
  marketing_show_ad_spend_by_platform BOOLEAN DEFAULT true,
  marketing_show_creator_payouts BOOLEAN DEFAULT true,
  marketing_show_influencer_fees BOOLEAN DEFAULT true,
  marketing_combine_ad_spend_and_payouts BOOLEAN DEFAULT false,

  -- Operating Expenses Section
  operating_expenses_label VARCHAR(100) DEFAULT 'Operating Expenses',
  operating_show_by_category BOOLEAN DEFAULT true,
  operating_include_vendor_payouts BOOLEAN DEFAULT true,
  operating_include_contractor_payouts BOOLEAN DEFAULT true,
  operating_categories_order JSONB DEFAULT '[]',

  -- Final Sections
  show_operating_income BOOLEAN DEFAULT true,
  show_other_income_expense BOOLEAN DEFAULT true,
  net_profit_label VARCHAR(100) DEFAULT 'Net Profit',

  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,

  CONSTRAINT pl_formula_config_one_per_tenant UNIQUE(tenant_id)
);

-- ============================================================
-- Expense Categories (tenant-customizable)
-- ============================================================

CREATE TYPE expense_type AS ENUM ('cogs', 'variable', 'marketing', 'operating', 'other');

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  expense_type expense_type NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT expense_categories_unique_per_tenant UNIQUE(tenant_id, category_id)
);

-- ============================================================
-- P&L Config Audit Log
-- ============================================================

CREATE TABLE IF NOT EXISTS pl_config_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  config_type VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  field_changed TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_variable_cost_config_tenant ON variable_cost_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cogs_config_tenant ON cogs_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_cogs_tenant ON product_cogs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_cogs_sku ON product_cogs(tenant_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_cogs_product ON product_cogs(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_pl_formula_config_tenant ON pl_formula_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_type ON expense_categories(tenant_id, expense_type);
CREATE INDEX IF NOT EXISTS idx_pl_config_audit_tenant ON pl_config_audit_log(tenant_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pl_config_audit_type ON pl_config_audit_log(tenant_id, config_type);

-- ============================================================
-- Triggers for updated_at
-- ============================================================

DROP TRIGGER IF EXISTS update_variable_cost_config_updated_at ON variable_cost_config;
CREATE TRIGGER update_variable_cost_config_updated_at
  BEFORE UPDATE ON variable_cost_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cogs_config_updated_at ON cogs_config;
CREATE TRIGGER update_cogs_config_updated_at
  BEFORE UPDATE ON cogs_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_cogs_updated_at ON product_cogs;
CREATE TRIGGER update_product_cogs_updated_at
  BEFORE UPDATE ON product_cogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pl_formula_config_updated_at ON pl_formula_config;
CREATE TRIGGER update_pl_formula_config_updated_at
  BEFORE UPDATE ON pl_formula_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Default Expense Categories Function
-- ============================================================

CREATE OR REPLACE FUNCTION seed_default_expense_categories(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO expense_categories (tenant_id, category_id, name, expense_type, is_system, display_order)
  VALUES
    -- COGS
    (p_tenant_id, 'cogs_product', 'Product Cost', 'cogs', true, 1),

    -- Variable
    (p_tenant_id, 'var_payment', 'Payment Processing', 'variable', true, 10),
    (p_tenant_id, 'var_fulfillment', 'Fulfillment', 'variable', true, 11),
    (p_tenant_id, 'var_shipping', 'Shipping', 'variable', true, 12),
    (p_tenant_id, 'var_packaging', 'Packaging', 'variable', true, 13),

    -- Marketing
    (p_tenant_id, 'mkt_meta', 'Meta Ads', 'marketing', true, 20),
    (p_tenant_id, 'mkt_google', 'Google Ads', 'marketing', true, 21),
    (p_tenant_id, 'mkt_tiktok', 'TikTok Ads', 'marketing', true, 22),
    (p_tenant_id, 'mkt_creator', 'Creator Commissions', 'marketing', true, 23),
    (p_tenant_id, 'mkt_influencer', 'Influencer Fees', 'marketing', true, 24),

    -- Operating
    (p_tenant_id, 'op_salaries', 'Salaries & Wages', 'operating', false, 30),
    (p_tenant_id, 'op_rent', 'Rent & Facilities', 'operating', false, 31),
    (p_tenant_id, 'op_software', 'Software & Tools', 'operating', false, 32),
    (p_tenant_id, 'op_professional', 'Professional Services', 'operating', false, 33),
    (p_tenant_id, 'op_insurance', 'Insurance', 'operating', false, 34),
    (p_tenant_id, 'op_vendors', 'Vendor Payments', 'operating', true, 35),
    (p_tenant_id, 'op_contractors', 'Contractor Payments', 'operating', true, 36),

    -- Other
    (p_tenant_id, 'other_misc', 'Miscellaneous', 'other', false, 100)
  ON CONFLICT (tenant_id, category_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE variable_cost_config IS 'Per-tenant variable cost configuration for P&L calculations';
COMMENT ON TABLE cogs_config IS 'Per-tenant COGS source configuration (Shopify sync vs manual)';
COMMENT ON TABLE product_cogs IS 'Manual product-level COGS entries for non-Shopify tenants';
COMMENT ON TABLE pl_formula_config IS 'Per-tenant P&L formula visibility and labeling preferences';
COMMENT ON TABLE expense_categories IS 'Customizable expense categories per tenant';
COMMENT ON TABLE pl_config_audit_log IS 'Audit trail for all P&L configuration changes';
