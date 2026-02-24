-- Add unique constraint for bundle_orders upsert support
-- Allows webhook handler to idempotently record bundle orders

CREATE UNIQUE INDEX IF NOT EXISTS idx_bundle_orders_order_bundle
  ON bundle_orders(order_id, bundle_id);
