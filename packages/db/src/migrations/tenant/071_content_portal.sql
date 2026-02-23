-- Migration: 071_content_portal
-- Description: Landing pages, SEO settings, and portal settings tables
-- Phase: Phase 8 Audit
--
-- Sources:
--   apps/admin/src/lib/landing-pages/db.ts
--   apps/admin/src/lib/customer-portal/db.ts

-- ============================================================
-- 1. landing_pages
-- ============================================================

CREATE TABLE IF NOT EXISTS landing_pages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  blocks JSONB NOT NULL DEFAULT '[]',
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  no_index BOOLEAN NOT NULL DEFAULT false,
  structured_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_landing_pages_updated_at ON landing_pages;
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);

COMMENT ON TABLE landing_pages IS 'Custom landing pages with block-based content';

-- ============================================================
-- 2. seo_settings (singleton per tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_title_template TEXT,
  default_description TEXT,
  site_name TEXT,
  og_default_image TEXT,
  twitter_handle TEXT,
  google_site_verification TEXT,
  bing_site_verification TEXT,
  robots_txt TEXT,
  sitemap_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_seo_settings_updated_at ON seo_settings;
CREATE TRIGGER update_seo_settings_updated_at
  BEFORE UPDATE ON seo_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE seo_settings IS 'Tenant-level SEO configuration (singleton row)';

-- ============================================================
-- 3. portal_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  features JSONB NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}',
  messaging JSONB NOT NULL DEFAULT '{}',
  custom_domain TEXT,
  ssl_status TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_portal_settings_updated_at ON portal_settings;
CREATE TRIGGER update_portal_settings_updated_at
  BEFORE UPDATE ON portal_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_portal_settings_tenant_id ON portal_settings(tenant_id);

COMMENT ON TABLE portal_settings IS 'Customer portal configuration per tenant';
