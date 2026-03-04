-- Clean template database
-- Removes all tenant data from cgk-platform/cgk-template
--
-- Usage: psql $DATABASE_URL -f scripts/clean-template-database.sql
--
-- CRITICAL: This script is DESTRUCTIVE. Only run on the template repository database
--           AFTER all tenants have been migrated to their forks.
--
-- Verification before running:
--   1. Confirm all forks are created and working
--   2. Confirm tenant data has been exported
--   3. Backup database before running

\set ON_ERROR_STOP on

BEGIN;

\echo '-- ============================================'
\echo '-- Template Database Cleanup'
\echo '-- Started: ' current_timestamp
\echo '-- ============================================'
\echo ''

-- Drop all tenant schemas
\echo '-- Dropping tenant schemas...'
DO $$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  LOOP
    RAISE NOTICE 'Dropping schema: %', schema_rec.schema_name;
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_rec.schema_name);
  END LOOP;
END $$;

\echo ''

-- Delete all organization records
\echo '-- Deleting organization records...'
DELETE FROM public.organizations;

\echo ''

-- Verify cleanup
\echo '-- Verification'
\echo '-- Organizations remaining:'
SELECT COUNT(*) AS organization_count FROM public.organizations;

\echo ''
\echo '-- Tenant schemas remaining:'
SELECT COUNT(*) AS tenant_schema_count
FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%';

\echo ''
\echo '-- Cleanup complete'
\echo '-- Finished: ' current_timestamp

COMMIT;

\echo ''
\echo '✅ Template database cleaned successfully'
\echo ''
\echo 'Next steps:'
\echo '  1. Verify no tenant data remains'
\echo '  2. Mark repository as "Template repository" in GitHub settings'
\echo '  3. Update README.md with fork instructions'
\echo '  4. Test "Use this template" button'
