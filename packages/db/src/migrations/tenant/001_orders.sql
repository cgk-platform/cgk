-- Orders table
-- Synced from Shopify, represents customer orders

-- Order status enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order fulfillment status enum
DO $$ BEGIN
  CREATE TYPE fulfillment_status AS ENUM ('unfulfilled', 'partial', 'fulfilled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order financial status enum
DO $$ BEGIN
  CREATE TYPE financial_status AS ENUM ('pending', 'authorized', 'paid', 'partially_paid', 'partially_refunded', 'refunded', 'voided');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  -- Using TEXT for Shopify ID compatibility
  id TEXT PRIMARY KEY,

  -- Shopify references
  shopify_order_id TEXT UNIQUE,
  order_number TEXT NOT NULL,

  -- Customer reference
  customer_id TEXT,
  customer_email TEXT,

  -- Status
  status order_status NOT NULL DEFAULT 'pending',
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'unfulfilled',
  financial_status financial_status NOT NULL DEFAULT 'pending',

  -- Totals (stored in cents to avoid float precision issues)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Line items as JSONB (denormalized for performance)
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Addresses
  shipping_address JSONB,
  billing_address JSONB,

  -- Attribution
  attribution_data JSONB,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Notes
  notes TEXT,
  tags TEXT[],

  -- Timestamps
  order_placed_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_financial_status ON orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_placed_at ON orders(order_placed_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- GIN index for JSONB line_items queries
CREATE INDEX IF NOT EXISTS idx_orders_line_items ON orders USING GIN (line_items);

COMMENT ON TABLE orders IS 'Customer orders synced from Shopify';
COMMENT ON COLUMN orders.id IS 'Internal order ID. Use TEXT for Shopify compatibility.';
COMMENT ON COLUMN orders.line_items IS 'Denormalized line items: [{product_id, variant_id, title, quantity, price_cents}]';
COMMENT ON COLUMN orders.attribution_data IS 'Full attribution chain for this order';
