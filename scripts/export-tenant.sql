-- Export single tenant data
-- Usage: psql $DATABASE_URL -f scripts/export-tenant.sql -v tenant=<tenant_slug> > <tenant>-export.sql
--
-- This script exports:
-- 1. Organization record from public.organizations
-- 2. All data from tenant schema (tenant_<slug>)
-- 3. Encrypted credentials (Shopify, Stripe)
--
-- IMPORTANT: The tenant variable must match the organization slug exactly

\set ON_ERROR_STOP on

-- Verify tenant exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = :'tenant') THEN
    RAISE EXCEPTION 'Tenant "%" does not exist in public.organizations', :'tenant';
  END IF;
END $$;

-- Start transaction
BEGIN;

\echo '-- ============================================'
\echo '-- Tenant Export: ' :tenant
\echo '-- Generated: ' current_timestamp
\echo '-- ============================================'
\echo ''

-- Export organization record
\echo '-- Organization record'
\echo 'INSERT INTO public.organizations (id, slug, name, domain, primary_color, secondary_color, accent_color, font_family, logo_url, created_at, updated_at, metadata)'
SELECT 'INSERT INTO public.organizations (id, slug, name, domain, primary_color, secondary_color, accent_color, font_family, logo_url, created_at, updated_at, metadata) VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(slug) || ', '
  || quote_literal(name) || ', '
  || quote_literal(domain) || ', '
  || quote_literal(primary_color) || ', '
  || quote_literal(secondary_color) || ', '
  || quote_literal(accent_color) || ', '
  || quote_literal(font_family) || ', '
  || quote_literal(logo_url) || ', '
  || quote_literal(created_at::text) || '::timestamptz, '
  || quote_literal(updated_at::text) || '::timestamptz, '
  || quote_literal(metadata::text) || '::jsonb'
  || ') ON CONFLICT (slug) DO UPDATE SET '
  || 'name = EXCLUDED.name, '
  || 'domain = EXCLUDED.domain, '
  || 'primary_color = EXCLUDED.primary_color, '
  || 'secondary_color = EXCLUDED.secondary_color, '
  || 'accent_color = EXCLUDED.accent_color, '
  || 'font_family = EXCLUDED.font_family, '
  || 'logo_url = EXCLUDED.logo_url, '
  || 'updated_at = EXCLUDED.updated_at, '
  || 'metadata = EXCLUDED.metadata;'
FROM public.organizations
WHERE slug = :'tenant';

\echo ''

-- Export tenant schema
\set schema_name 'tenant_' :tenant

\echo '-- Tenant schema: ' :schema_name
\echo 'CREATE SCHEMA IF NOT EXISTS ' :schema_name ';'
\echo ''

-- Get all tables in tenant schema
DO $$
DECLARE
  table_rec RECORD;
  column_list TEXT;
BEGIN
  FOR table_rec IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = :'schema_name'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- Get column list for this table
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = :'schema_name'
      AND table_name = table_rec.table_name;

    -- Export table data
    RAISE NOTICE '-- Table: %.%', :'schema_name', table_rec.table_name;

    -- Generate INSERT statements
    EXECUTE format(
      'SELECT ''INSERT INTO %I.%I (%s) VALUES ('' || string_agg(quote_literal(row.*::text), '', '') || '');''
       FROM (SELECT * FROM %I.%I) AS row',
      :'schema_name', table_rec.table_name, column_list,
      :'schema_name', table_rec.table_name
    );
  END LOOP;
END $$;

\echo ''
\echo '-- Export complete'

COMMIT;
