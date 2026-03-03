-- Migration: 030_shopify_config_jsonb
-- Description: Add shopify_config JSONB column and migrate legacy data
-- Created: 2026-03-03
-- Phase: PHASE-8-AUDIT (Data Model Consolidation)

-- Add shopify_config column to organizations (idempotent)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS shopify_config JSONB DEFAULT '{}'::jsonb;

-- Migrate existing data from legacy columns to shopify_config
-- Only updates rows where shopify_config is empty and legacy data exists
UPDATE public.organizations
SET shopify_config = jsonb_build_object(
  'storefrontAccessToken', shopify_access_token_encrypted,
  'checkoutDomain', shopify_store_domain
)
WHERE (shopify_config IS NULL OR shopify_config = '{}'::jsonb)
  AND (shopify_access_token_encrypted IS NOT NULL
       OR shopify_store_domain IS NOT NULL);

-- Create index for JSONB operations
CREATE INDEX IF NOT EXISTS idx_organizations_shopify_config_token
ON public.organizations ((shopify_config->>'storefrontAccessToken'))
WHERE shopify_config->>'storefrontAccessToken' IS NOT NULL;

-- Add documentation
COMMENT ON COLUMN public.organizations.shopify_config IS
'Shopify configuration (JSONB): { storefrontAccessToken, checkoutDomain, pixelId, etc. }. Replaces legacy shopify_access_token_encrypted column.';

-- NOTE: We DO NOT drop shopify_access_token_encrypted or shopify_store_domain
-- for backward compatibility with existing code.
