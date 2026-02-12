/**
 * @cgk/video - Database schema definitions
 *
 * SQL schema for video tables (videos, video_folders, video_permissions, video_views)
 * These tables are created per-tenant in tenant schemas.
 */

/**
 * SQL to create the videos table
 */
export const VIDEOS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  folder_id UUID REFERENCES video_folders(id) ON DELETE SET NULL,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  recording_type TEXT CHECK (recording_type IN ('screen', 'camera', 'screen_camera', 'upload')),

  -- Mux integration
  mux_upload_id TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  thumbnail_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'ready', 'error', 'deleted')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- Indexes for videos
CREATE INDEX IF NOT EXISTS idx_videos_tenant_user ON videos(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_videos_tenant_status ON videos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_tenant_folder ON videos(tenant_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_upload_id ON videos(mux_upload_id);
CREATE INDEX IF NOT EXISTS idx_videos_search ON videos USING GIN(search_vector);
`

/**
 * SQL to create the video_folders table
 */
export const VIDEO_FOLDERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_id UUID REFERENCES video_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for video_folders
CREATE INDEX IF NOT EXISTS idx_video_folders_tenant_user ON video_folders(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_folders_parent ON video_folders(parent_id);
`

/**
 * SQL to create the video_permissions table
 */
export const VIDEO_PERMISSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'commenter', 'editor', 'owner')),

  -- Target (exactly one should be set)
  user_id TEXT,
  email TEXT,
  is_public BOOLEAN DEFAULT false,
  is_team BOOLEAN DEFAULT false,

  -- Optional security
  password_hash TEXT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for video_permissions
CREATE INDEX IF NOT EXISTS idx_video_permissions_video ON video_permissions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_permissions_user ON video_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_permissions_email ON video_permissions(email);
`

/**
 * SQL to create the video_views table
 */
export const VIDEO_VIEWS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT,
  watch_duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for video_views
CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views(video_id, created_at);
CREATE INDEX IF NOT EXISTS idx_video_views_user ON video_views(user_id);
`

/**
 * Complete migration SQL - creates all tables in correct order
 */
export const VIDEO_MIGRATION_SQL = `
-- Video folders must be created first (referenced by videos)
${VIDEO_FOLDERS_TABLE_SQL}

-- Videos table
${VIDEOS_TABLE_SQL}

-- Permissions table
${VIDEO_PERMISSIONS_TABLE_SQL}

-- Views table
${VIDEO_VIEWS_TABLE_SQL}
`

/**
 * SQL to add updated_at trigger for videos table
 */
export const VIDEOS_UPDATED_AT_TRIGGER_SQL = `
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS videos_updated_at_trigger ON videos;
CREATE TRIGGER videos_updated_at_trigger
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_videos_updated_at();
`
