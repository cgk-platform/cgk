-- Customer Segmentation & Samples Tracking
-- Phase 3G: Customer segments (Shopify + RFM), samples tracking, Klaviyo sync

-- ============================================================================
-- CACHED SHOPIFY SEGMENTS
-- ============================================================================
-- Synced periodically from Shopify Admin API
CREATE TABLE IF NOT EXISTS cached_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_segment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT,
  member_count INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shopify_segment_id)
);

CREATE INDEX IF NOT EXISTS idx_cached_segments_name ON cached_segments(name);
CREATE INDEX IF NOT EXISTS idx_cached_segments_synced_at ON cached_segments(synced_at);

-- ============================================================================
-- RFM SEGMENTATION
-- ============================================================================
-- Calculated from order data, updated periodically

-- RFM segment type enum
DO $$ BEGIN
  CREATE TYPE rfm_segment_type AS ENUM (
    'champions',      -- R: 4-5, F: 4-5 - Best customers
    'loyal',          -- R: 3-5, F: 3-5 - Consistent buyers
    'new_customers',  -- R: 4-5, F: 1-2 - Recent first-time buyers
    'at_risk',        -- R: 1-2, F: 3-5 - Used to buy often
    'hibernating',    -- R: 1-2, F: 1-2 - Last purchase long ago
    'potential',      -- R: 3, F: 2-3 - Average, could be developed
    'uncategorized'   -- Doesn't fit other categories
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customer_rfm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  r_score INTEGER NOT NULL CHECK (r_score >= 1 AND r_score <= 5),
  f_score INTEGER NOT NULL CHECK (f_score >= 1 AND f_score <= 5),
  m_score INTEGER NOT NULL CHECK (m_score >= 1 AND m_score <= 5),
  rfm_score INTEGER GENERATED ALWAYS AS (r_score * 100 + f_score * 10 + m_score) STORED,
  segment rfm_segment_type NOT NULL DEFAULT 'uncategorized',
  recency_days INTEGER,
  frequency_count INTEGER,
  monetary_total_cents BIGINT,
  currency TEXT DEFAULT 'USD',
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);

CREATE INDEX IF NOT EXISTS idx_rfm_segment ON customer_rfm_segments(segment);
CREATE INDEX IF NOT EXISTS idx_rfm_r_score ON customer_rfm_segments(r_score);
CREATE INDEX IF NOT EXISTS idx_rfm_f_score ON customer_rfm_segments(f_score);
CREATE INDEX IF NOT EXISTS idx_rfm_m_score ON customer_rfm_segments(m_score);
CREATE INDEX IF NOT EXISTS idx_rfm_rfm_score ON customer_rfm_segments(rfm_score);
CREATE INDEX IF NOT EXISTS idx_rfm_calculated_at ON customer_rfm_segments(calculated_at);
CREATE INDEX IF NOT EXISTS idx_rfm_customer_email ON customer_rfm_segments(customer_email);

-- ============================================================================
-- SAMPLES CONFIGURATION
-- ============================================================================
-- Per-tenant configuration for sample detection

CREATE TABLE IF NOT EXISTS samples_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ugc_tags TEXT[] DEFAULT ARRAY['ugc-sample', 'ugc', 'creator-sample'],
  tiktok_tags TEXT[] DEFAULT ARRAY['tiktok-sample', 'tiktok-shop-sample'],
  channel_patterns TEXT[] DEFAULT ARRAY['tiktok%', '%tiktok shop%'],
  zero_price_only BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one config row per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_samples_config_singleton ON samples_config((TRUE));

-- ============================================================================
-- KLAVIYO SYNC CONFIGURATION
-- ============================================================================
-- Mapping between platform segments and Klaviyo lists

DO $$ BEGIN
  CREATE TYPE klaviyo_sync_direction AS ENUM ('push', 'pull', 'bidirectional');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS klaviyo_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_encrypted TEXT,
  api_key_set BOOLEAN DEFAULT false,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('shopify', 'rfm')),
  segment_id TEXT NOT NULL,
  klaviyo_list_id TEXT NOT NULL,
  klaviyo_list_name TEXT,
  sync_direction klaviyo_sync_direction DEFAULT 'push',
  last_synced_at TIMESTAMPTZ,
  last_sync_count INTEGER,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_type, segment_id, klaviyo_list_id)
);

CREATE INDEX IF NOT EXISTS idx_klaviyo_sync_enabled ON klaviyo_sync_config(enabled);
CREATE INDEX IF NOT EXISTS idx_klaviyo_sync_segment ON klaviyo_sync_config(segment_type, segment_id);

-- ============================================================================
-- SAMPLES TRACKING (via orders - this is a view)
-- ============================================================================
-- Samples are detected from orders table using tag-based detection
-- This view provides a convenient way to query samples

-- We need the orders table to exist first, so we create the view conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = current_schema()) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW samples_view AS
      SELECT
        o.id AS order_id,
        o.order_number,
        o.customer_email,
        o.total_cents AS total_price_cents,
        o.currency,
        o.fulfillment_status,
        o.tags,
        o.utm_source AS channel,
        o.order_placed_at,
        o.created_at,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM samples_config sc
            WHERE sc.tiktok_tags && o.tags::text[]
               OR (o.utm_source ILIKE ANY(sc.channel_patterns))
          ) THEN ''tiktok''
          WHEN EXISTS (
            SELECT 1 FROM samples_config sc
            WHERE sc.ugc_tags && o.tags::text[]
          ) THEN ''ugc''
          ELSE ''unknown''
        END AS sample_type
      FROM orders o
      WHERE EXISTS (
        SELECT 1 FROM samples_config sc
        WHERE (sc.ugc_tags && o.tags::text[] OR sc.tiktok_tags && o.tags::text[] OR o.utm_source ILIKE ANY(sc.channel_patterns))
          AND (NOT sc.zero_price_only OR o.total_cents = 0)
          AND sc.enabled = true
      )
    ';
  END IF;
END $$;

-- ============================================================================
-- SEGMENT MEMBERSHIP CACHE (optional, for performance)
-- ============================================================================
-- Cache customer membership in Shopify segments for faster queries

CREATE TABLE IF NOT EXISTS segment_membership_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES cached_segments(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_email TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_membership_segment ON segment_membership_cache(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_membership_customer ON segment_membership_cache(customer_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to determine RFM segment from scores
CREATE OR REPLACE FUNCTION calculate_rfm_segment(r INTEGER, f INTEGER, m INTEGER)
RETURNS rfm_segment_type AS $$
BEGIN
  -- Champions: High R (4-5) and High F (4-5)
  IF r >= 4 AND f >= 4 THEN
    RETURN 'champions';
  -- Loyal: Good R (3-5) and Good F (3-5) but not champions
  ELSIF r >= 3 AND f >= 3 THEN
    RETURN 'loyal';
  -- New Customers: High R (4-5) but Low F (1-2)
  ELSIF r >= 4 AND f <= 2 THEN
    RETURN 'new_customers';
  -- At Risk: Low R (1-2) but High F (3-5)
  ELSIF r <= 2 AND f >= 3 THEN
    RETURN 'at_risk';
  -- Hibernating: Low R (1-2) and Low F (1-2)
  ELSIF r <= 2 AND f <= 2 THEN
    RETURN 'hibernating';
  -- Potential: Average R (3) and Average F (2-3)
  ELSIF r = 3 AND f >= 2 AND f <= 3 THEN
    RETURN 'potential';
  ELSE
    RETURN 'uncategorized';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update segment on RFM score change
CREATE OR REPLACE FUNCTION update_rfm_segment()
RETURNS TRIGGER AS $$
BEGIN
  NEW.segment := calculate_rfm_segment(NEW.r_score, NEW.f_score, NEW.m_score);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rfm_segment ON customer_rfm_segments;
CREATE TRIGGER trg_update_rfm_segment
  BEFORE INSERT OR UPDATE OF r_score, f_score, m_score
  ON customer_rfm_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_rfm_segment();

-- Insert default samples config if not exists
INSERT INTO samples_config (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM samples_config);
