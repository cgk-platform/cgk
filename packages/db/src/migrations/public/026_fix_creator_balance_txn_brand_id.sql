-- Migration 026: Fix creator_balance_transactions.brand_id type TEXT -> UUID
--
-- The brand_id column was created as TEXT but should be UUID to properly
-- reference public.organizations(id). Analytics routes filtering by brand_id
-- now correctly query public.creator_balance_transactions.
--
-- Safe to run: drops old index, casts existing values (NULL-safe), adds FK.

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_creator_balance_transactions_brand_id;

-- Alter column type: cast existing TEXT UUIDs to UUID
-- Rows with NULL brand_id remain NULL; invalid UUID strings will error (clean slate assumed)
ALTER TABLE creator_balance_transactions
  ALTER COLUMN brand_id TYPE UUID USING brand_id::uuid;

-- Add FK constraint to organizations
ALTER TABLE creator_balance_transactions
  ADD CONSTRAINT fk_creator_balance_transactions_brand
    FOREIGN KEY (brand_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Recreate index with correct type
CREATE INDEX IF NOT EXISTS idx_creator_balance_txn_brand_id
  ON creator_balance_transactions(brand_id);

-- Composite index for brand + creator queries (used by earnings analytics)
CREATE INDEX IF NOT EXISTS idx_creator_balance_txn_creator_brand
  ON creator_balance_transactions(creator_id, brand_id);
