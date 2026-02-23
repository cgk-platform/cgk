-- 068_storefront_tables.sql
-- Missing tables for storefront checkout, customer auth, and Shopify webhook processing

-- 1. customer_sessions (for storefront customer auth)
CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON customer_sessions(expires_at);

-- 2. carts (shopping cart for checkout)
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  discount_code TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);

-- 3. cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  title TEXT NOT NULL,
  variant_title TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  image_url TEXT,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- 4. customer_addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL,
  customer_shopify_id TEXT,
  address_index INTEGER,
  first_name TEXT,
  last_name TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  province TEXT,
  province_code TEXT,
  country TEXT,
  country_code TEXT,
  zip TEXT,
  phone TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_customer_addresses_updated_at ON customer_addresses;
CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_shopify_id ON customer_addresses(customer_shopify_id);

-- 5. order_line_items (normalized order items for reviews, webhook sync)
CREATE TABLE IF NOT EXISTS order_line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_shopify_id TEXT NOT NULL,
  shopify_line_item_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  title TEXT NOT NULL,
  variant_title TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_line_items_order_id ON order_line_items(order_shopify_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_product_id ON order_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_shopify_line_item_id ON order_line_items(shopify_line_item_id);

-- 6. order_returns
DO $$ BEGIN
  CREATE TYPE return_status AS ENUM ('requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS order_returns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL,
  customer_id TEXT,
  status return_status NOT NULL DEFAULT 'requested',
  reason TEXT,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  refund_amount_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_order_returns_updated_at ON order_returns;
CREATE TRIGGER update_order_returns_updated_at
  BEFORE UPDATE ON order_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_customer_id ON order_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON order_returns(status);

-- 7. fulfillments (Shopify fulfillment tracking)
CREATE TABLE IF NOT EXISTS fulfillments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shopify_fulfillment_id TEXT UNIQUE,
  order_shopify_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_company TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_fulfillments_updated_at ON fulfillments;
CREATE TRIGGER update_fulfillments_updated_at
  BEFORE UPDATE ON fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_fulfillments_order_shopify_id ON fulfillments(order_shopify_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_shopify_fulfillment_id ON fulfillments(shopify_fulfillment_id);

-- 8. refunds (Shopify refund tracking)
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shopify_refund_id TEXT UNIQUE,
  order_shopify_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refunds_order_shopify_id ON refunds(order_shopify_id);
CREATE INDEX IF NOT EXISTS idx_refunds_shopify_refund_id ON refunds(shopify_refund_id);

-- 9. refund_line_items
CREATE TABLE IF NOT EXISTS refund_line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  refund_id TEXT NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  shopify_line_item_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refund_line_items_refund_id ON refund_line_items(refund_id);

-- 10. customer_password_resets (storefront password reset flow)
CREATE TABLE IF NOT EXISTS customer_password_resets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_password_resets_email ON customer_password_resets(email);
CREATE INDEX IF NOT EXISTS idx_customer_password_resets_token ON customer_password_resets(token_hash);

-- 11. shipping_rates (cached shipping rates for checkout)
CREATE TABLE IF NOT EXISTS shipping_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cart_id TEXT,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  carrier TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_cart_id ON shipping_rates(cart_id);

-- 12. support_ticket_messages (storefront support ticket replies)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'customer',
  sender_id TEXT,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);

COMMENT ON TABLE customer_sessions IS 'Customer authentication sessions for storefront';
COMMENT ON TABLE carts IS 'Shopping carts for storefront checkout';
COMMENT ON TABLE cart_items IS 'Line items within shopping carts';
COMMENT ON TABLE customer_addresses IS 'Customer address book, synced from Shopify';
COMMENT ON TABLE order_line_items IS 'Normalized order line items for reviews and webhook sync';
COMMENT ON TABLE order_returns IS 'Customer return requests';
COMMENT ON TABLE fulfillments IS 'Order fulfillment tracking from Shopify';
COMMENT ON TABLE refunds IS 'Order refund records from Shopify';
COMMENT ON TABLE refund_line_items IS 'Individual line items within refunds';
COMMENT ON TABLE customer_password_resets IS 'Password reset tokens for storefront customers';
COMMENT ON TABLE shipping_rates IS 'Cached shipping rates for checkout';
COMMENT ON TABLE support_ticket_messages IS 'Messages within support tickets';
