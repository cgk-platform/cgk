-- Products full-text search index
-- Migration: 026_products_search
-- Required for storefront product search functionality

-- Full-text search index on title and description
CREATE INDEX IF NOT EXISTS idx_products_search
ON products
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Add description_html column if not exists (for rich content)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'description_html'
  ) THEN
    ALTER TABLE products ADD COLUMN description_html TEXT;
  END IF;
END $$;

-- Add shopify_gid column for GraphQL ID if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'shopify_gid'
  ) THEN
    ALTER TABLE products ADD COLUMN shopify_gid TEXT;
    CREATE INDEX IF NOT EXISTS idx_products_shopify_gid ON products(shopify_gid);
  END IF;
END $$;

-- Add synced_at column for tracking sync status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'synced_at'
  ) THEN
    ALTER TABLE products ADD COLUMN synced_at TIMESTAMPTZ DEFAULT NOW();
    CREATE INDEX IF NOT EXISTS idx_products_synced_at ON products(synced_at);
  END IF;
END $$;

-- Add platform_data column for custom platform enrichment (reviews, badges, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'platform_data'
  ) THEN
    ALTER TABLE products ADD COLUMN platform_data JSONB DEFAULT '{}';
  END IF;
END $$;

COMMENT ON COLUMN products.description_html IS 'HTML-formatted product description from Shopify';
COMMENT ON COLUMN products.shopify_gid IS 'Shopify GraphQL Global ID (gid://shopify/Product/123)';
COMMENT ON COLUMN products.synced_at IS 'Last time product was synced from Shopify';
COMMENT ON COLUMN products.platform_data IS 'Platform-specific data: {avgRating, reviewCount, badges, etc}';
