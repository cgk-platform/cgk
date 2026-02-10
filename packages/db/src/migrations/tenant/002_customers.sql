-- Customers table
-- Customer profiles synced from Shopify

CREATE TABLE IF NOT EXISTS customers (
  -- Using TEXT for Shopify ID compatibility
  id TEXT PRIMARY KEY,

  -- Shopify reference
  shopify_customer_id TEXT UNIQUE,

  -- Contact info
  email TEXT,
  phone TEXT,

  -- Name
  first_name TEXT,
  last_name TEXT,

  -- Default address
  default_address JSONB,

  -- Marketing consent
  accepts_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_marketing_updated_at TIMESTAMPTZ,

  -- Customer stats (denormalized for performance)
  orders_count INTEGER NOT NULL DEFAULT 0,
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Tags and notes
  tags TEXT[],
  notes TEXT,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_shopify_id ON customers(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_accepts_marketing ON customers(accepts_marketing);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent_cents);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

COMMENT ON TABLE customers IS 'Customer profiles synced from Shopify';
COMMENT ON COLUMN customers.total_spent_cents IS 'Lifetime total spent (denormalized)';
COMMENT ON COLUMN customers.metadata IS 'Custom metadata for segmentation';
