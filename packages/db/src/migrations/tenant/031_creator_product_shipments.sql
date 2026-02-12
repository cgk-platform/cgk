-- Creator Product Shipments
-- Track products sent to creators via Shopify draft orders

CREATE TABLE IF NOT EXISTS creator_product_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Shopify reference
  shopify_order_id TEXT,
  shopify_order_number TEXT,
  shopify_draft_order_id TEXT,

  -- Products sent
  products JSONB NOT NULL DEFAULT '[]', -- [{variantId, title, quantity, sku, imageUrl}]

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'ordered', 'shipped', 'delivered', 'failed')
  ),
  -- pending: draft order created, not yet completed
  -- ordered: draft order completed
  -- shipped: fulfillment created, in transit
  -- delivered: confirmed delivery
  -- failed: order creation failed

  -- Tracking
  tracking_number TEXT,
  carrier TEXT, -- ups, fedex, usps, dhl

  -- Shipping address snapshot
  shipping_address JSONB,

  -- Timestamps
  ordered_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_by TEXT, -- User ID who initiated
  error_message TEXT, -- If status is failed

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_product_shipments_updated_at ON creator_product_shipments;
CREATE TRIGGER update_creator_product_shipments_updated_at
  BEFORE UPDATE ON creator_product_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_shipments_creator ON creator_product_shipments(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_shipments_status ON creator_product_shipments(status);
CREATE INDEX IF NOT EXISTS idx_creator_shipments_shopify_order ON creator_product_shipments(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_creator_shipments_created_at ON creator_product_shipments(created_at DESC);

COMMENT ON TABLE creator_product_shipments IS 'Tracks products sent to creators via Shopify draft orders';
COMMENT ON COLUMN creator_product_shipments.products IS 'JSON array: [{variantId, title, quantity, sku, imageUrl}]';
COMMENT ON COLUMN creator_product_shipments.status IS 'pending -> ordered -> shipped -> delivered (or failed)';
