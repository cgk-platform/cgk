-- Migration: public/027_shopify_app_installations
-- Description: Multi-tenant Shopify app installations registry
-- Purpose: Maps Shopify shop domains to CGK tenants to enable dynamic tenant resolution
-- Phase: PHASE-1B-MULTI-TENANT-SHOPIFY-APP

-- ============================================================================
-- PUBLIC SCHEMA: Shop-to-Tenant Mapping
-- ============================================================================

-- This table lives in PUBLIC schema (not tenant schema) because we need to
-- resolve the tenant ID BEFORE we know which tenant schema to query.
--
-- Workflow:
-- 1. Shopify sends webhook to our app
-- 2. We extract shop domain from headers (e.g., "meliusly.myshopify.com")
-- 3. We query THIS table (public schema) to find organization_id
-- 4. We use organization_id to query shopify_connections in TENANT schema
--
-- This replaces the hardcoded CGK_TENANT_SLUG env var pattern.

CREATE TABLE IF NOT EXISTS public.shopify_app_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The Shopify shop domain (globally unique across all Shopify stores)
  -- Format: "storename.myshopify.com"
  shop TEXT NOT NULL UNIQUE,

  -- The CGK tenant (organization) this shop belongs to
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Installation status
  -- active: App is installed and working
  -- uninstalled: Shop uninstalled the app
  -- suspended: Manual suspension by platform admin
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'uninstalled', 'suspended')),

  -- OAuth scopes currently granted (for validation)
  -- Example: ['read_products', 'write_products', 'read_orders', 'write_orders']
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Timestamps
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,
  last_billing_at TIMESTAMPTZ,

  -- Metadata
  shopify_app_id TEXT,  -- Shopify's internal app installation ID
  primary_contact_email TEXT,  -- Contact for this installation

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary lookup: shop → organization_id
CREATE INDEX IF NOT EXISTS idx_shopify_app_installations_shop
  ON public.shopify_app_installations(shop);

-- Lookup all shops for an organization
CREATE INDEX IF NOT EXISTS idx_shopify_app_installations_org
  ON public.shopify_app_installations(organization_id);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_shopify_app_installations_status
  ON public.shopify_app_installations(status);

-- Combined lookup: active installations for an org
CREATE INDEX IF NOT EXISTS idx_shopify_app_installations_org_status
  ON public.shopify_app_installations(organization_id, status)
  WHERE status = 'active';

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS shopify_app_installations_updated_at ON public.shopify_app_installations;
CREATE TRIGGER shopify_app_installations_updated_at
  BEFORE UPDATE ON public.shopify_app_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.shopify_app_installations IS
  'Maps Shopify shop domains to CGK tenants. Used for dynamic tenant resolution in webhooks and OAuth flows.';

COMMENT ON COLUMN public.shopify_app_installations.shop IS
  'Shopify shop domain (e.g., "meliusly.myshopify.com"). Globally unique.';

COMMENT ON COLUMN public.shopify_app_installations.organization_id IS
  'CGK tenant (organization) ID. References public.organizations(id).';

COMMENT ON COLUMN public.shopify_app_installations.status IS
  'Installation status: active (working), uninstalled (app removed), suspended (manually disabled)';

COMMENT ON COLUMN public.shopify_app_installations.scopes IS
  'OAuth scopes granted during installation. Used for scope validation.';

COMMENT ON COLUMN public.shopify_app_installations.installed_at IS
  'When the shop first installed the CGK Platform app.';

COMMENT ON COLUMN public.shopify_app_installations.uninstalled_at IS
  'When the shop uninstalled the app (NULL if still installed).';

-- ============================================================================
-- Data Migration: Populate from existing data
-- ============================================================================

-- Option 1: Populate from organizations.shopify_store_domain (if populated)
-- This handles existing tenants that have shopify_store_domain set
DO $$
BEGIN
  -- Only run if there are organizations with shopify_store_domain
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE shopify_store_domain IS NOT NULL
      AND shopify_store_domain != ''
    LIMIT 1
  ) THEN
    -- Insert installations for orgs with shopify_store_domain
    INSERT INTO public.shopify_app_installations (
      shop,
      organization_id,
      status,
      scopes,
      installed_at
    )
    SELECT
      shopify_store_domain,
      id,
      'active',
      ARRAY[]::TEXT[],  -- Unknown scopes for legacy installations
      created_at
    FROM public.organizations
    WHERE shopify_store_domain IS NOT NULL
      AND shopify_store_domain != ''
    ON CONFLICT (shop) DO NOTHING;  -- Skip if already exists
  END IF;
END $$;

-- Option 2: Populate from tenant shopify_connections tables
-- This scans all tenant schemas for shopify_connections records
-- and creates corresponding public installations
DO $$
DECLARE
  tenant RECORD;
  connection RECORD;
BEGIN
  -- Loop through all organizations
  FOR tenant IN
    SELECT id, slug FROM public.organizations
    WHERE status = 'active'
  LOOP
    -- Check if tenant schema exists and has shopify_connections table
    IF EXISTS (
      SELECT 1 FROM information_schema.schemata
      WHERE schema_name = 'tenant_' || tenant.slug
    ) THEN
      -- Query shopify_connections in tenant schema
      FOR connection IN
        EXECUTE format(
          'SELECT shop, scopes, installed_at
           FROM tenant_%I.shopify_connections
           WHERE status = %L
           ORDER BY installed_at DESC
           LIMIT 1',
          tenant.slug,
          'active'
        )
      LOOP
        -- Insert into public.shopify_app_installations
        INSERT INTO public.shopify_app_installations (
          shop,
          organization_id,
          status,
          scopes,
          installed_at
        ) VALUES (
          connection.shop,
          tenant.id,
          'active',
          connection.scopes,
          connection.installed_at
        )
        ON CONFLICT (shop) DO NOTHING;  -- Skip if already exists
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Verification Queries (for testing after migration)
-- ============================================================================

-- SELECT * FROM public.shopify_app_installations ORDER BY created_at DESC;
-- SELECT shop, o.name, o.slug FROM public.shopify_app_installations sai
-- JOIN public.organizations o ON sai.organization_id = o.id;
