-- Migration: 073_video_extensions
-- Description: Video analytics views, folders, and permissions tables
-- Phase: Phase 8 Audit
--
-- Sources:
--   packages/video/src/analytics/views.ts
--   packages/video/src/db.ts
--   packages/video/src/types.ts

-- ============================================================
-- 1. video_views — Analytics tracking for video plays
-- ============================================================

CREATE TABLE IF NOT EXISTS video_views (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  video_id TEXT NOT NULL,
  user_id TEXT,
  watch_duration_seconds INTEGER,
  completed BOOLEAN NOT NULL DEFAULT false,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON video_views(created_at);
CREATE INDEX IF NOT EXISTS idx_video_views_video_completed ON video_views(video_id, completed);

COMMENT ON TABLE video_views IS 'Video view analytics with watch duration tracking';

-- ============================================================
-- 2. video_folders — Hierarchical folder organization
-- ============================================================

CREATE TABLE IF NOT EXISTS video_folders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  parent_id TEXT REFERENCES video_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_folders_user_id ON video_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_video_folders_parent_id ON video_folders(parent_id);

COMMENT ON TABLE video_folders IS 'Hierarchical folder organization for videos';

-- ============================================================
-- 3. video_permissions — Access control for videos
-- ============================================================

CREATE TABLE IF NOT EXISTS video_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  video_id TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'commenter', 'editor', 'owner')),
  user_id TEXT,
  email TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_team BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_permissions_video_id ON video_permissions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_permissions_user_id ON video_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_permissions_email ON video_permissions(email);

COMMENT ON TABLE video_permissions IS 'Per-video access control with sharing and password protection';
