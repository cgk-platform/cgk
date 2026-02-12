-- Digital Asset Management Core Tables
-- Phase 3F: DAM system for managing images, videos, documents

-- Core asset library
CREATE TABLE IF NOT EXISTS dam_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- File information
  title TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'document')),
  mime_type TEXT NOT NULL,
  file_extension TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size_bytes BIGINT,

  -- Dimensions (for images/video)
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,

  -- Quality variant tracking
  quality_variant TEXT DEFAULT 'master' CHECK (quality_variant IN ('master', 'full', 'web', 'thumbnail', 'proxy')),
  parent_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  asset_group_id UUID,
  version_number INTEGER DEFAULT 1,

  -- Mux integration (for video)
  mux_asset_id TEXT,
  mux_playback_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  exif_data JSONB,

  -- Tags and classification
  manual_tags TEXT[] DEFAULT '{}',
  ai_tags TEXT[] DEFAULT '{}',
  ai_objects TEXT[] DEFAULT '{}',
  ai_scenes TEXT[] DEFAULT '{}',
  ai_visual_description TEXT,
  content_tags TEXT[] DEFAULT '{}',
  product_tags TEXT[] DEFAULT '{}',

  -- Rights and status
  rights_status TEXT DEFAULT 'pending' CHECK (rights_status IN ('active', 'pending', 'expired', 'revoked')),
  rights_expires_at TIMESTAMPTZ,
  rights_holder TEXT,
  rights_notes TEXT,

  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,

  -- Source tracking
  source_type TEXT CHECK (source_type IN ('upload', 'gdrive', 'api', 'import')),
  source_file_id TEXT,
  source_folder_path TEXT,

  -- File hash for deduplication
  file_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ai_visual_description, '')), 'C')
  ) STORED
);

-- Collections (folders/albums)
CREATE TABLE IF NOT EXISTS dam_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  collection_type TEXT DEFAULT 'manual' CHECK (collection_type IN ('manual', 'smart')),
  cover_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  smart_rules JSONB,
  is_public BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  asset_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collection-Asset junction
CREATE TABLE IF NOT EXISTS dam_collection_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  collection_id UUID NOT NULL REFERENCES dam_collections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, asset_id)
);

-- Google Drive connections
CREATE TABLE IF NOT EXISTS dam_gdrive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  folder_name TEXT,

  -- Encrypted OAuth tokens
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Sync configuration
  sync_mode TEXT DEFAULT 'one_way' CHECK (sync_mode IN ('one_way', 'two_way')),
  auto_sync BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  sync_page_token TEXT,

  -- Watch channel (push notifications)
  watch_channel_id TEXT,
  watch_channel_expiry TIMESTAMPTZ,
  watch_resource_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- File mappings (Drive -> DAM)
CREATE TABLE IF NOT EXISTS dam_gdrive_file_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  connection_id UUID NOT NULL REFERENCES dam_gdrive_connections(id) ON DELETE CASCADE,
  gdrive_file_id TEXT NOT NULL,
  dam_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  gdrive_name TEXT,
  gdrive_path TEXT,
  gdrive_mime_type TEXT,
  gdrive_modified_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'imported', 'skipped', 'failed', 'removed')),
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(connection_id, gdrive_file_id)
);

-- Import queue
CREATE TABLE IF NOT EXISTS dam_import_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('gdrive', 'upload', 'api')),
  source_file_id TEXT,
  source_folder_path TEXT,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  preview_url TEXT,

  -- Pre-fill metadata
  suggested_title TEXT,
  suggested_tags TEXT[],
  suggested_creator_id UUID,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  assigned_to TEXT,
  priority INTEGER DEFAULT 0,
  error_message TEXT,

  -- Result
  imported_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Trash (soft delete recovery)
CREATE TABLE IF NOT EXISTS dam_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  asset_id UUID NOT NULL,
  asset_data JSONB NOT NULL,
  deleted_by TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  permanent_delete_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days')
);

-- Usage/analytics logs
CREATE TABLE IF NOT EXISTS dam_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  user_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('view', 'download', 'export', 'share')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS dam_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dam_assets_tenant ON dam_assets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dam_assets_type ON dam_assets(tenant_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_dam_assets_group ON dam_assets(asset_group_id);
CREATE INDEX IF NOT EXISTS idx_dam_assets_search ON dam_assets USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_dam_assets_tags ON dam_assets USING GIN(manual_tags);
CREATE INDEX IF NOT EXISTS idx_dam_assets_ai_tags ON dam_assets USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_dam_assets_content_tags ON dam_assets USING GIN(content_tags);
CREATE INDEX IF NOT EXISTS idx_dam_assets_product_tags ON dam_assets USING GIN(product_tags);
CREATE INDEX IF NOT EXISTS idx_dam_assets_hash ON dam_assets(file_hash);
CREATE INDEX IF NOT EXISTS idx_dam_assets_source ON dam_assets(tenant_id, source_type, source_file_id);
CREATE INDEX IF NOT EXISTS idx_dam_assets_rights ON dam_assets(tenant_id, rights_status);
CREATE INDEX IF NOT EXISTS idx_dam_assets_archived ON dam_assets(tenant_id, is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_dam_assets_favorite ON dam_assets(tenant_id, is_favorite) WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_dam_collections_tenant ON dam_collections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dam_collections_type ON dam_collections(tenant_id, collection_type);

CREATE INDEX IF NOT EXISTS idx_dam_collection_assets_collection ON dam_collection_assets(collection_id);
CREATE INDEX IF NOT EXISTS idx_dam_collection_assets_asset ON dam_collection_assets(asset_id);

CREATE INDEX IF NOT EXISTS idx_dam_gdrive_connections_tenant ON dam_gdrive_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dam_gdrive_connections_channel ON dam_gdrive_connections(watch_channel_id);

CREATE INDEX IF NOT EXISTS idx_dam_gdrive_mappings_connection ON dam_gdrive_file_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_dam_gdrive_mappings_status ON dam_gdrive_file_mappings(connection_id, sync_status);

CREATE INDEX IF NOT EXISTS idx_dam_queue_status ON dam_import_queue_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dam_queue_source ON dam_import_queue_items(tenant_id, source_type, source_file_id);

CREATE INDEX IF NOT EXISTS idx_dam_trash_tenant ON dam_trash(tenant_id, permanent_delete_at);

CREATE INDEX IF NOT EXISTS idx_dam_usage_asset ON dam_usage_logs(asset_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dam_usage_tenant ON dam_usage_logs(tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_dam_audit_entity ON dam_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_dam_audit_tenant ON dam_audit_logs(tenant_id, created_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION dam_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dam_assets_updated_at
  BEFORE UPDATE ON dam_assets
  FOR EACH ROW
  EXECUTE FUNCTION dam_update_updated_at();

CREATE TRIGGER dam_collections_updated_at
  BEFORE UPDATE ON dam_collections
  FOR EACH ROW
  EXECUTE FUNCTION dam_update_updated_at();

CREATE TRIGGER dam_gdrive_connections_updated_at
  BEFORE UPDATE ON dam_gdrive_connections
  FOR EACH ROW
  EXECUTE FUNCTION dam_update_updated_at();
