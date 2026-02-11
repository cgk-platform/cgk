-- Sample requests table
-- Tracks product sample shipments to creators

-- Sample status enum
DO $$ BEGIN
  CREATE TYPE sample_status AS ENUM ('requested', 'approved', 'pending', 'shipped', 'in_transit', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Priority enum
DO $$ BEGIN
  CREATE TYPE sample_priority AS ENUM ('normal', 'rush');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sample_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Creator reference
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Products: [{productId, productName, variant, quantity}]
  products JSONB NOT NULL,

  -- Shipping address
  shipping_address JSONB NOT NULL,

  -- Priority
  priority sample_priority NOT NULL DEFAULT 'normal',

  -- Status
  status sample_status NOT NULL DEFAULT 'requested',

  -- Tracking
  tracking_carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,

  -- Delivery
  estimated_delivery DATE,
  actual_delivery DATE,
  delivery_confirmed BOOLEAN NOT NULL DEFAULT false,
  delivery_confirmed_by TEXT, -- 'system' or creator_id

  -- Cost
  cost_cents INTEGER,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Approval
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  -- Shipping timestamps
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Request timestamp
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sample_requests_updated_at ON sample_requests;
CREATE TRIGGER update_sample_requests_updated_at
  BEFORE UPDATE ON sample_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sample_requests_creator ON sample_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_status ON sample_requests(status);
CREATE INDEX IF NOT EXISTS idx_sample_requests_tracking ON sample_requests(tracking_number)
  WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sample_requests_requested ON sample_requests(requested_at);

COMMENT ON TABLE sample_requests IS 'Product sample requests and shipment tracking';
COMMENT ON COLUMN sample_requests.products IS 'JSON array of products with variants and quantities';
COMMENT ON COLUMN sample_requests.shipping_address IS 'JSON object with address fields';
