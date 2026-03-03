-- Migration: 079_video_editor_projects
-- Description: Video editor project management for Creative Studio
-- Stores AI-generated video editing projects, scenes, captions,
-- render history, and activity logs for real-time sync between
-- openCLAW agents and the web-based Creative Studio UI.
--
-- Sources:
--   openCLAW video-editor pipeline (_video_editor.py)
--   Creative Studio UI (B2.1-B2.5)

-- ============================================================
-- 1. video_editor_projects — Main project record (maps to openCLAW session)
-- ============================================================

CREATE TABLE IF NOT EXISTS video_editor_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    openclaw_session_id TEXT UNIQUE,
    openclaw_profile TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'storyboarding', 'producing', 'rendering',
            'rendered', 'delivered', 'archived'
        )),
    mode TEXT CHECK (mode IN ('original', 'clone')),
    aspect_ratio TEXT DEFAULT '9:16',
    template_id TEXT,
    storyboard JSONB,
    voice_id TEXT,
    voice_name TEXT,
    voiceover_script TEXT,
    voiceover_url TEXT,
    caption_style TEXT,
    caption_config JSONB,
    music_url TEXT,
    music_attribution TEXT,
    music_volume DECIMAL(3,2) DEFAULT 0.15,
    render_url TEXT,
    render_variants JSONB DEFAULT '[]',
    qc_results JSONB,
    brand_defaults JSONB,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ve_projects_tenant
    ON video_editor_projects(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ve_projects_status
    ON video_editor_projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ve_projects_openclaw
    ON video_editor_projects(openclaw_session_id)
    WHERE openclaw_session_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_ve_projects_updated_at ON video_editor_projects;
CREATE TRIGGER set_ve_projects_updated_at
    BEFORE UPDATE ON video_editor_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE video_editor_projects IS 'Video editing projects managed by openCLAW agents and the Creative Studio UI';

-- ============================================================
-- 2. video_editor_scenes — Individual scenes within a project
-- ============================================================

CREATE TABLE IF NOT EXISTS video_editor_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES video_editor_projects(id) ON DELETE CASCADE,
    scene_number SMALLINT NOT NULL,
    role TEXT,
    duration DECIMAL(6,2),
    clip_asset_id UUID REFERENCES dam_assets(id),
    clip_segment_id UUID REFERENCES dam_clip_segments(id),
    clip_start DECIMAL(8,2),
    clip_end DECIMAL(8,2),
    transition TEXT DEFAULT 'crossfade',
    text_overlays JSONB DEFAULT '[]',
    footage_hint TEXT,
    source_type TEXT,
    source_reference TEXT,
    sort_order SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, scene_number)
);

CREATE INDEX IF NOT EXISTS idx_ve_scenes_project
    ON video_editor_scenes(tenant_id, project_id, sort_order);

DROP TRIGGER IF EXISTS set_ve_scenes_updated_at ON video_editor_scenes;
CREATE TRIGGER set_ve_scenes_updated_at
    BEFORE UPDATE ON video_editor_scenes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE video_editor_scenes IS 'Individual scenes within a video editor project with clip references';

-- ============================================================
-- 3. video_editor_captions — Word-level caption timings
-- ============================================================

CREATE TABLE IF NOT EXISTS video_editor_captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES video_editor_projects(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    start_time DECIMAL(8,3) NOT NULL,
    end_time DECIMAL(8,3) NOT NULL,
    sort_order INT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ve_captions_project
    ON video_editor_captions(tenant_id, project_id, sort_order);

COMMENT ON TABLE video_editor_captions IS 'Word-level caption timings for voiceover sync in video projects';

-- ============================================================
-- 4. video_editor_renders — Render history with variants
-- ============================================================

CREATE TABLE IF NOT EXISTS video_editor_renders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES video_editor_projects(id) ON DELETE CASCADE,
    variant_suffix TEXT,
    render_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds DECIMAL(6,2),
    file_size_bytes BIGINT,
    caption_style TEXT,
    voice_name TEXT,
    qc_results JSONB,
    rendered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ve_renders_project
    ON video_editor_renders(tenant_id, project_id, rendered_at DESC);

COMMENT ON TABLE video_editor_renders IS 'Render history for video editor projects including variant renders';

-- ============================================================
-- 5. video_editor_activity — Real-time activity log for SSE sync
-- ============================================================

CREATE TABLE IF NOT EXISTS video_editor_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES video_editor_projects(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('agent', 'user')),
    action TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ve_activity_project
    ON video_editor_activity(tenant_id, project_id, created_at DESC);

COMMENT ON TABLE video_editor_activity IS 'Real-time activity log for syncing between openCLAW agents and Creative Studio UI';
