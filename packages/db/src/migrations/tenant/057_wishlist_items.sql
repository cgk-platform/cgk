-- Migration: 057_wishlist_items
-- Description: Individual items in customer wishlists
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  priority INTEGER DEFAULT 0,
  price_at_add_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  notified_on_sale BOOLEAN DEFAULT false,
  UNIQUE(wishlist_id, product_id, variant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_added ON wishlist_items(added_at);

COMMENT ON TABLE wishlist_items IS 'Individual products saved to customer wishlists';
COMMENT ON COLUMN wishlist_items.priority IS 'User-defined priority for sorting (higher = more wanted)';
COMMENT ON COLUMN wishlist_items.price_at_add_cents IS 'Price when item was added, for tracking price drops';
COMMENT ON COLUMN wishlist_items.notified_on_sale IS 'Whether user has been notified of price drop';
