-- Promo codes, selling plans, and scheduled promotions
-- Phase 3F: E-commerce Promos

-- Promo code redirect targets
DO $$ BEGIN
  CREATE TYPE promo_redirect_target AS ENUM ('HOME', 'PRODUCT', 'COLLECTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Discount types for selling plans
DO $$ BEGIN
  CREATE TYPE selling_plan_discount_type AS ENUM ('percentage', 'fixed_amount', 'explicit_price');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Selling plan interval units
DO $$ BEGIN
  CREATE TYPE selling_plan_interval_unit AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Promotion status
DO $$ BEGIN
  CREATE TYPE promotion_status AS ENUM ('scheduled', 'active', 'ended', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Promo code platform metadata
-- Shopify is source of truth for discount details
-- We store attribution, OG metadata, and redirect settings
CREATE TABLE IF NOT EXISTS promo_code_metadata (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Code identifier (matches Shopify discount code)
  code TEXT NOT NULL,

  -- Shopify reference
  shopify_discount_id TEXT,

  -- Creator attribution for commissions
  creator_id TEXT REFERENCES creators(id) ON DELETE SET NULL,
  commission_percent DECIMAL(5,2),

  -- OG metadata for shareable links
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,

  -- Redirect settings
  redirect_target promo_redirect_target DEFAULT 'HOME',
  redirect_handle TEXT,  -- Product or collection handle if not HOME

  -- Analytics
  uses_count INTEGER DEFAULT 0,
  revenue_generated_cents BIGINT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(code)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_promo_code_metadata_updated_at ON promo_code_metadata;
CREATE TRIGGER update_promo_code_metadata_updated_at
  BEFORE UPDATE ON promo_code_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for promo_code_metadata
CREATE INDEX IF NOT EXISTS idx_promo_metadata_code ON promo_code_metadata(code);
CREATE INDEX IF NOT EXISTS idx_promo_metadata_creator ON promo_code_metadata(creator_id);
CREATE INDEX IF NOT EXISTS idx_promo_metadata_shopify ON promo_code_metadata(shopify_discount_id);
CREATE INDEX IF NOT EXISTS idx_promo_metadata_created ON promo_code_metadata(created_at);

-- Selling plans
CREATE TABLE IF NOT EXISTS selling_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Plan identification
  name TEXT NOT NULL,
  internal_name TEXT,  -- Admin-only name
  selector_title TEXT NOT NULL,  -- Customer-facing text

  -- Display order
  priority INTEGER DEFAULT 0,

  -- Subscription interval
  interval_unit selling_plan_interval_unit NOT NULL,
  interval_count INTEGER NOT NULL DEFAULT 1,

  -- Discount configuration
  discount_type selling_plan_discount_type NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,

  -- Discount windows (e.g., 20% off first 3 orders, then 15% off)
  discount_after_payment INTEGER,  -- Change discount after X payments
  discount_after_type selling_plan_discount_type,
  discount_after_value DECIMAL(10,2),

  -- Shopify reference
  shopify_selling_plan_id TEXT,
  shopify_selling_plan_group_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(name)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_selling_plans_updated_at ON selling_plans;
CREATE TRIGGER update_selling_plans_updated_at
  BEFORE UPDATE ON selling_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for selling_plans
CREATE INDEX IF NOT EXISTS idx_selling_plans_active ON selling_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_selling_plans_priority ON selling_plans(priority);
CREATE INDEX IF NOT EXISTS idx_selling_plans_shopify ON selling_plans(shopify_selling_plan_id);

-- Selling plan product assignments
CREATE TABLE IF NOT EXISTS selling_plan_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  selling_plan_id TEXT NOT NULL REFERENCES selling_plans(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,  -- Shopify product ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(selling_plan_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_selling_plan_products_plan ON selling_plan_products(selling_plan_id);
CREATE INDEX IF NOT EXISTS idx_selling_plan_products_product ON selling_plan_products(product_id);

-- Selling plan collection assignments
CREATE TABLE IF NOT EXISTS selling_plan_collections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  selling_plan_id TEXT NOT NULL REFERENCES selling_plans(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL,  -- Shopify collection ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(selling_plan_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_selling_plan_collections_plan ON selling_plan_collections(selling_plan_id);
CREATE INDEX IF NOT EXISTS idx_selling_plan_collections_collection ON selling_plan_collections(collection_id);

-- Scheduled promotions / sales
CREATE TABLE IF NOT EXISTS scheduled_promotions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Promotion identification
  name TEXT NOT NULL,
  description TEXT,

  -- Status
  status promotion_status DEFAULT 'scheduled',

  -- Timing (start Eastern, end Pacific as per spec)
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone_start TEXT DEFAULT 'America/New_York',
  timezone_end TEXT DEFAULT 'America/Los_Angeles',

  -- Discount percentages
  sitewide_discount_percent DECIMAL(5,2),
  subscription_discount_percent DECIMAL(5,2),
  bundle_discount_percent DECIMAL(5,2),
  onetime_discount_percent DECIMAL(5,2),

  -- Banner/badge display
  banner_text TEXT,
  banner_background_color TEXT DEFAULT '#ef4444',
  banner_text_color TEXT DEFAULT '#ffffff',
  badge_text TEXT,

  -- Auto-applied promo code
  promo_code TEXT,

  -- Override configurations (JSONB for flexibility)
  product_overrides JSONB,  -- {productId: {price_cents: X, discount_percent: Y}}
  selling_plan_overrides JSONB,  -- {sellingPlanId: {discount_percent: X}}
  collection_overrides JSONB,  -- {collectionId: {discount_percent: X}}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_scheduled_promotions_updated_at ON scheduled_promotions;
CREATE TRIGGER update_scheduled_promotions_updated_at
  BEFORE UPDATE ON scheduled_promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for scheduled_promotions
CREATE INDEX IF NOT EXISTS idx_promotions_status ON scheduled_promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON scheduled_promotions(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_active_range ON scheduled_promotions(starts_at, ends_at)
  WHERE status IN ('scheduled', 'active');

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  promo_code_id TEXT NOT NULL REFERENCES promo_code_metadata(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  customer_email TEXT,
  discount_amount_cents BIGINT NOT NULL,
  order_total_cents BIGINT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_order ON promo_code_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_date ON promo_code_usage(used_at);

COMMENT ON TABLE promo_code_metadata IS 'Platform metadata for Shopify discount codes (attribution, OG, redirects)';
COMMENT ON TABLE selling_plans IS 'Subscription selling plans with discount windows';
COMMENT ON TABLE selling_plan_products IS 'Products assigned to selling plans';
COMMENT ON TABLE selling_plan_collections IS 'Collections assigned to selling plans';
COMMENT ON TABLE scheduled_promotions IS 'Scheduled sales and promotions with discount configurations';
COMMENT ON TABLE promo_code_usage IS 'Usage tracking for promo codes';
