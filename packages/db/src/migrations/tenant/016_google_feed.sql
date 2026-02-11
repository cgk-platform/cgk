-- Google Merchant Center Feed tables
-- Manages product feed generation and settings for Google Shopping

-- Feed sync status enum
DO $$ BEGIN
  CREATE TYPE google_feed_sync_status AS ENUM ('running', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Product sync status enum
DO $$ BEGIN
  CREATE TYPE google_feed_product_sync_status AS ENUM ('pending', 'synced', 'error', 'excluded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Merchant approval status enum
DO $$ BEGIN
  CREATE TYPE google_merchant_status AS ENUM ('pending', 'approved', 'disapproved', 'warning');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Product condition enum
DO $$ BEGIN
  CREATE TYPE google_product_condition AS ENUM ('new', 'refurbished', 'used');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Google Feed settings (per-tenant)
CREATE TABLE IF NOT EXISTS google_feed_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Merchant Center connection
  merchant_id TEXT,
  api_credentials JSONB, -- encrypted credentials

  -- Feed configuration
  feed_name TEXT NOT NULL DEFAULT 'Product Feed',
  feed_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  target_country TEXT NOT NULL DEFAULT 'US',
  language TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'USD',
  update_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (update_frequency IN ('hourly', 'daily', 'weekly')),
  feed_format TEXT NOT NULL DEFAULT 'xml' CHECK (feed_format IN ('xml', 'json', 'tsv')),

  -- Product defaults
  default_brand TEXT,
  default_availability TEXT NOT NULL DEFAULT 'in_stock' CHECK (default_availability IN ('in_stock', 'out_of_stock', 'preorder', 'backorder')),
  default_condition google_product_condition NOT NULL DEFAULT 'new',
  default_shipping_label TEXT,

  -- Exclusion rules (JSON array of rule objects)
  exclusion_rules JSONB NOT NULL DEFAULT '[]',

  -- Category mapping (Shopify type -> Google category ID)
  category_mapping JSONB NOT NULL DEFAULT '{}',

  -- Custom label rules
  custom_label_rules JSONB NOT NULL DEFAULT '{}',

  -- Advanced settings
  include_variants BOOLEAN NOT NULL DEFAULT true,
  include_out_of_stock BOOLEAN NOT NULL DEFAULT false,
  minimum_price_cents INTEGER DEFAULT 0,
  tax_settings JSONB,
  shipping_overrides JSONB,

  -- Sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status google_feed_sync_status,
  last_sync_error TEXT,
  next_sync_at TIMESTAMPTZ,

  -- Connection status
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connection_verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_google_feed_settings_updated_at ON google_feed_settings;
CREATE TRIGGER update_google_feed_settings_updated_at
  BEFORE UPDATE ON google_feed_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Product feed overrides (per-product customization)
CREATE TABLE IF NOT EXISTS google_feed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product reference
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT,

  -- Exclusion
  is_excluded BOOLEAN NOT NULL DEFAULT false,
  exclude_reason TEXT,

  -- Title and description overrides (null = use Shopify data)
  title_override TEXT,
  description_override TEXT,

  -- Identifiers
  gtin TEXT, -- UPC/EAN/ISBN
  mpn TEXT,  -- Manufacturer part number
  brand_override TEXT,

  -- Categorization
  google_category_id TEXT,
  product_type TEXT,

  -- Product attributes
  condition_override google_product_condition,
  adult BOOLEAN DEFAULT false,
  age_group TEXT CHECK (age_group IS NULL OR age_group IN ('newborn', 'infant', 'toddler', 'kids', 'adult')),
  gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'unisex')),
  color TEXT,
  material TEXT,
  pattern TEXT,
  size TEXT,

  -- Custom labels (0-4)
  custom_label_0 TEXT,
  custom_label_1 TEXT,
  custom_label_2 TEXT,
  custom_label_3 TEXT,
  custom_label_4 TEXT,

  -- Shipping overrides
  shipping_weight_grams INTEGER,
  shipping_length_cm NUMERIC(10, 2),
  shipping_width_cm NUMERIC(10, 2),
  shipping_height_cm NUMERIC(10, 2),
  shipping_label TEXT,

  -- Pricing overrides
  sale_price_cents INTEGER,
  sale_price_effective_start TIMESTAMPTZ,
  sale_price_effective_end TIMESTAMPTZ,

  -- Additional images (up to 10)
  additional_image_urls JSONB DEFAULT '[]',

  -- Sync status
  sync_status google_feed_product_sync_status NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,

  -- Merchant Center status
  merchant_status google_merchant_status,
  merchant_issues JSONB DEFAULT '[]',
  merchant_last_checked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for product/variant combination
  CONSTRAINT google_feed_products_unique UNIQUE (shopify_product_id, shopify_variant_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_google_feed_products_updated_at ON google_feed_products;
CREATE TRIGGER update_google_feed_products_updated_at
  BEFORE UPDATE ON google_feed_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for google_feed_products
CREATE INDEX IF NOT EXISTS idx_google_feed_products_shopify_product ON google_feed_products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_google_feed_products_shopify_variant ON google_feed_products(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_google_feed_products_excluded ON google_feed_products(is_excluded);
CREATE INDEX IF NOT EXISTS idx_google_feed_products_sync_status ON google_feed_products(sync_status);
CREATE INDEX IF NOT EXISTS idx_google_feed_products_merchant_status ON google_feed_products(merchant_status);
CREATE INDEX IF NOT EXISTS idx_google_feed_products_updated_at ON google_feed_products(updated_at);

-- Feed sync history
CREATE TABLE IF NOT EXISTS google_feed_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync details
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status google_feed_sync_status NOT NULL DEFAULT 'running',

  -- Statistics
  total_products INTEGER DEFAULT 0,
  products_synced INTEGER DEFAULT 0,
  products_added INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_removed INTEGER DEFAULT 0,
  products_excluded INTEGER DEFAULT 0,
  products_with_errors INTEGER DEFAULT 0,

  -- Errors (array of error objects)
  errors JSONB DEFAULT '[]',

  -- Generated feed info
  feed_url TEXT,
  feed_size_bytes BIGINT,
  feed_product_count INTEGER,

  -- Duration
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for sync history
CREATE INDEX IF NOT EXISTS idx_google_feed_sync_history_started_at ON google_feed_sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_feed_sync_history_status ON google_feed_sync_history(status);

-- Image optimization tracking
CREATE TABLE IF NOT EXISTS google_feed_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product reference
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT,

  -- Image info
  original_url TEXT NOT NULL,
  optimized_url TEXT,

  -- Dimensions
  original_width INTEGER,
  original_height INTEGER,
  optimized_width INTEGER,
  optimized_height INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'optimized', 'failed', 'approved', 'disapproved')),
  error_message TEXT,

  -- Google validation
  google_status TEXT,
  google_issues JSONB DEFAULT '[]',

  -- Optimization settings
  compression_applied BOOLEAN DEFAULT false,
  background_removed BOOLEAN DEFAULT false,
  format_converted TEXT,

  -- File info
  original_size_bytes BIGINT,
  optimized_size_bytes BIGINT,

  -- Timestamps
  optimized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_google_feed_images_updated_at ON google_feed_images;
CREATE TRIGGER update_google_feed_images_updated_at
  BEFORE UPDATE ON google_feed_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for google_feed_images
CREATE INDEX IF NOT EXISTS idx_google_feed_images_shopify_product ON google_feed_images(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_google_feed_images_status ON google_feed_images(status);
CREATE INDEX IF NOT EXISTS idx_google_feed_images_original_url ON google_feed_images(original_url);

COMMENT ON TABLE google_feed_settings IS 'Google Merchant Center feed configuration per tenant';
COMMENT ON TABLE google_feed_products IS 'Per-product overrides and status for Google Shopping feed';
COMMENT ON TABLE google_feed_sync_history IS 'History of feed synchronization runs';
COMMENT ON TABLE google_feed_images IS 'Product image optimization tracking for Google Shopping requirements';
