-- 069_column_fixes.sql
-- Add missing columns to existing tables

-- Add refunded_cents to orders (used by Shopify refund webhook handler)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_cents INTEGER DEFAULT 0;

-- Add synced_at to orders (used by Shopify webhook handlers for sync tracking)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_synced_at ON orders(synced_at);

-- Add Shopify webhook handler columns that the handler INSERT uses
-- The orders.shopify_id column: the webhook handler inserts with column name shopify_id
-- but migration 001 defines it as shopify_order_id. We need shopify_id as an alias.
-- Since ON CONFLICT (shopify_id) is used, we need a unique index on shopify_id if we add it.
-- APPROACH: Add missing columns the webhook handlers use for INSERT
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gross_sales_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discounts_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS net_sales_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS taxes_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_codes JSONB DEFAULT '[]';

-- Create unique index on shopify_id for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_shopify_id_unique ON orders(shopify_id);

-- Add missing columns to customers table for webhook handler
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shopify_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shopify_created_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Create unique index on shopify_id for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_shopify_id_unique ON customers(shopify_id);

COMMENT ON COLUMN orders.shopify_id IS 'Shopify order ID used by webhook handlers';
COMMENT ON COLUMN orders.synced_at IS 'Last sync timestamp from Shopify webhooks';
COMMENT ON COLUMN orders.refunded_cents IS 'Total refunded amount in cents';
