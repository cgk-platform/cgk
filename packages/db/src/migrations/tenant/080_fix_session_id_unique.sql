-- Migration: 080_fix_session_id_unique
-- Description: Fix openclaw_session_id uniqueness to be tenant-scoped
-- The original UNIQUE constraint on openclaw_session_id is table-wide,
-- preventing two tenants from having the same session ID.

-- Drop the table-wide unique constraint
ALTER TABLE video_editor_projects DROP CONSTRAINT IF EXISTS video_editor_projects_openclaw_session_id_key;

-- Add tenant-scoped unique constraint
-- Note: pg_constraint is global, so filter by schema (connamespace) to avoid
-- false positives when the same constraint name exists in another tenant schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'video_editor_projects_tenant_session_unique'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE video_editor_projects
      ADD CONSTRAINT video_editor_projects_tenant_session_unique
      UNIQUE (tenant_id, openclaw_session_id);
  END IF;
END $$;
