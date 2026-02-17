-- Migration: 056_wishlists
-- Description: Customer wishlists for product saving and sharing
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL,
  name TEXT DEFAULT 'My Wishlist',
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_share_token ON wishlists(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wishlists_public ON wishlists(is_public) WHERE is_public = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_wishlists_updated_at ON wishlists;
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE wishlists IS 'Customer wishlists for saving and sharing products';
COMMENT ON COLUMN wishlists.share_token IS 'Unique token for sharing wishlist publicly';
COMMENT ON COLUMN wishlists.is_public IS 'Whether the wishlist is viewable via share link';
