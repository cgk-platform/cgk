-- Products table
-- Product catalog synced from Shopify

-- Product status enum
DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS products (
  -- Using TEXT for Shopify ID compatibility
  id TEXT PRIMARY KEY,

  -- Shopify reference
  shopify_product_id TEXT UNIQUE,

  -- Basic info
  title TEXT NOT NULL,
  handle TEXT,
  description TEXT,
  vendor TEXT,
  product_type TEXT,

  -- Status
  status product_status NOT NULL DEFAULT 'active',

  -- Tags
  tags TEXT[],

  -- Pricing (for default/first variant)
  price_cents INTEGER,
  compare_at_price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Inventory
  inventory_quantity INTEGER,
  inventory_policy TEXT,

  -- Images
  featured_image_url TEXT,
  images JSONB NOT NULL DEFAULT '[]',

  -- Variants (denormalized)
  variants JSONB NOT NULL DEFAULT '[]',

  -- Options (Size, Color, etc.)
  options JSONB NOT NULL DEFAULT '[]',

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Timestamps from Shopify
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_published_at ON products(published_at);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

COMMENT ON TABLE products IS 'Product catalog synced from Shopify';
COMMENT ON COLUMN products.variants IS 'Product variants: [{id, title, price_cents, sku, inventory_quantity}]';
COMMENT ON COLUMN products.options IS 'Product options: [{name: "Size", values: ["S", "M", "L"]}]';
