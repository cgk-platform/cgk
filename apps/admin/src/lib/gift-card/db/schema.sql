-- Gift Card Schema
-- This file is for documentation purposes. Actual migration is in packages/db/src/migrations/tenant/

-- Gift Card Products
-- Stores Shopify gift card products synced to local cache
CREATE TABLE IF NOT EXISTS gift_card_products (
  id TEXT PRIMARY KEY, -- Shopify product GID
  variant_id TEXT NOT NULL, -- Shopify variant GID
  variant_id_numeric TEXT NOT NULL, -- Numeric ID for cart operations
  title TEXT NOT NULL,
  sku TEXT,
  amount_cents INTEGER NOT NULL,
  min_order_subtotal_cents INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  shopify_status TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_products_status ON gift_card_products(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_products_variant_id ON gift_card_products(variant_id);

-- Gift Card Transactions
-- Tracks store credit issuance for qualifying orders
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shopify_order_id TEXT NOT NULL,
  shopify_order_name TEXT NOT NULL,
  shopify_customer_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  gift_card_product_id TEXT REFERENCES gift_card_products(id),
  gift_card_variant_id TEXT,
  gift_card_sku TEXT,
  amount_cents INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'bundle_builder' CHECK (source IN ('bundle_builder', 'manual', 'promotion')),
  source_page_slug TEXT,
  source_config JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  shopify_transaction_id TEXT,
  credited_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shopify_order_id, gift_card_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_status ON gift_card_transactions(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_customer ON gift_card_transactions(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_order ON gift_card_transactions(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_created ON gift_card_transactions(created_at DESC);

-- Gift Card Emails
-- Queue for gift card notification emails
CREATE TABLE IF NOT EXISTS gift_card_emails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id TEXT NOT NULL REFERENCES gift_card_transactions(id),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  resend_message_id TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_emails_status ON gift_card_emails(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_emails_scheduled ON gift_card_emails(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_gift_card_emails_transaction ON gift_card_emails(transaction_id);

-- Gift Card Settings
-- Per-tenant configuration for gift card system
CREATE TABLE IF NOT EXISTS gift_card_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  default_amount_cents INTEGER DEFAULT 1000,
  from_email TEXT DEFAULT 'support@example.com',
  admin_notification_enabled BOOLEAN DEFAULT FALSE,
  admin_notification_email TEXT DEFAULT '',
  email_template JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
