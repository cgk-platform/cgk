-- Bundle configurations for the bundle builder
-- Phase 8: Shopify Bundle Builder Extension

CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Display
  name TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),

  -- Products (stored as JSONB array of {productId, variantId, title, price, image, position})
  items JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Discount configuration
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),

  -- Tier definitions (JSONB array of {count, discount, label})
  tiers JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Limits
  min_items INTEGER NOT NULL DEFAULT 2,
  max_items INTEGER NOT NULL DEFAULT 8,

  -- Display settings
  layout TEXT NOT NULL DEFAULT 'grid' CHECK (layout IN ('grid', 'list')),
  columns_desktop INTEGER NOT NULL DEFAULT 3,
  image_ratio TEXT NOT NULL DEFAULT 'square' CHECK (image_ratio IN ('square', 'portrait', 'landscape')),
  cta_text TEXT NOT NULL DEFAULT 'Add Bundle to Cart',
  show_savings BOOLEAN NOT NULL DEFAULT true,
  show_tier_progress BOOLEAN NOT NULL DEFAULT true,
  enable_quantity BOOLEAN NOT NULL DEFAULT true,

  -- Colors (nullable = use theme defaults)
  bg_color TEXT,
  text_color TEXT,
  accent_color TEXT,

  -- Shopify sync
  shopify_section_id TEXT,

  -- Metadata
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_status ON bundles(status);
CREATE INDEX IF NOT EXISTS idx_bundles_created_at ON bundles(created_at DESC);

-- Track bundle performance
CREATE TABLE IF NOT EXISTS bundle_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bundle_id TEXT REFERENCES bundles(id) ON DELETE SET NULL,
  order_id TEXT,
  customer_id TEXT,

  -- Snapshot at time of order
  items_count INTEGER NOT NULL DEFAULT 0,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  discount_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0,
  tier_label TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundle_orders_bundle_id ON bundle_orders(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_orders_order_id ON bundle_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_bundle_orders_created_at ON bundle_orders(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_bundles_updated_at ON bundles;
CREATE TRIGGER set_bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
