-- Reviews table
-- Product reviews with media support

-- Review status enum
DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'spam');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Product reference
  product_id TEXT NOT NULL,

  -- Order reference (optional, for verified purchases)
  order_id TEXT,

  -- Reviewer info
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,

  -- Status
  status review_status NOT NULL DEFAULT 'pending',

  -- Verification
  verification_token TEXT,
  verified_at TIMESTAMPTZ,

  -- Voting
  helpful_votes INTEGER NOT NULL DEFAULT 0,
  unhelpful_votes INTEGER NOT NULL DEFAULT 0,

  -- Import tracking (for migrated reviews)
  imported_from TEXT,
  original_id TEXT,

  -- Admin response
  response_body TEXT,
  response_author TEXT,
  responded_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Review media (photos/videos)
CREATE TABLE IF NOT EXISTS review_media (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Review reference
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,

  -- Media type
  media_type TEXT NOT NULL, -- 'image', 'video'

  -- URLs
  url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Video-specific (Mux integration)
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  duration_seconds INTEGER,

  -- Metadata
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER,

  -- Order for display
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_author_email ON reviews(author_email);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(is_verified_purchase);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- Unique constraint for import deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_import_unique
  ON reviews(imported_from, original_id)
  WHERE imported_from IS NOT NULL;

-- Indexes for review_media
CREATE INDEX IF NOT EXISTS idx_review_media_review_id ON review_media(review_id);
CREATE INDEX IF NOT EXISTS idx_review_media_type ON review_media(media_type);

COMMENT ON TABLE reviews IS 'Product reviews with ratings and media';
COMMENT ON TABLE review_media IS 'Photos and videos attached to reviews';
COMMENT ON COLUMN reviews.is_verified_purchase IS 'True if reviewer placed an order containing this product';
COMMENT ON COLUMN reviews.imported_from IS 'Source platform if migrated (e.g., yotpo, judge.me)';
