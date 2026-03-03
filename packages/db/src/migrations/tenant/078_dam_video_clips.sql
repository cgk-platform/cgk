-- Migration: 078_dam_video_clips
-- Description: Video clip segment analysis for Creative Studio
-- Extends DAM with video-editing metadata: per-segment analysis from
-- Gemini catalog, source type tracking, burned caption detection,
-- and vector embeddings for semantic clip search.
--
-- Sources:
--   openCLAW video-editor catalog (catalog.py, catalog_store.py)
--   Creative Studio clip library (B1.1)

-- ============================================================
-- 1. dam_clip_segments — Per-segment analysis from Gemini catalog
-- ============================================================

CREATE TABLE IF NOT EXISTS dam_clip_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
    start_time DECIMAL(8,2) NOT NULL,
    end_time DECIMAL(8,2) NOT NULL,
    description TEXT,
    subjects TEXT[],
    camera TEXT,
    mood TEXT,
    motion TEXT,
    text_overlay TEXT,
    text_overlay_severity TEXT CHECK (text_overlay_severity IN ('none', 'light', 'heavy')),
    quality_score SMALLINT CHECK (quality_score BETWEEN 1 AND 5),
    quality_notes TEXT,
    embedding public.vector(3072),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_clip_segments_asset
    ON dam_clip_segments(tenant_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_clip_segments_mood
    ON dam_clip_segments(tenant_id, mood);
CREATE INDEX IF NOT EXISTS idx_dam_clip_segments_quality
    ON dam_clip_segments(tenant_id, quality_score);
CREATE INDEX IF NOT EXISTS idx_dam_clip_segments_severity
    ON dam_clip_segments(tenant_id, text_overlay_severity);

-- Note: pgvector indexes (HNSW/IVFFlat) max at 2000 dimensions.
-- Gemini embeddings are 3072 dims, so we use brute-force cosine distance.
-- This is fine for <10k segments per tenant. If scale requires it,
-- consider dimensionality reduction or switching to 1536-dim embeddings.

DROP TRIGGER IF EXISTS set_dam_clip_segments_updated_at ON dam_clip_segments;
CREATE TRIGGER set_dam_clip_segments_updated_at
    BEFORE UPDATE ON dam_clip_segments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE dam_clip_segments IS 'Per-segment video analysis from Gemini catalog for Creative Studio clip search';

-- ============================================================
-- 2. Extend dam_assets with video-editing columns
-- ============================================================

-- Source type for video clips (extends existing source_type CHECK)
ALTER TABLE dam_assets ADD COLUMN IF NOT EXISTS
    clip_source_type TEXT CHECK (clip_source_type IN (
        'social', 'stock', 'gdrive', 'veo', 'kling', 'sora', 'inbound', 'recorded'
    ));

-- Original source URL (e.g., TikTok URL, stock footage URL)
ALTER TABLE dam_assets ADD COLUMN IF NOT EXISTS
    clip_source_url TEXT;

-- Whether this clip has burned-in captions (text baked into video frames)
ALTER TABLE dam_assets ADD COLUMN IF NOT EXISTS
    has_burned_captions BOOLEAN DEFAULT FALSE;

-- Maps back to openCLAW catalog entry for bidirectional reference
ALTER TABLE dam_assets ADD COLUMN IF NOT EXISTS
    openclaw_catalog_id TEXT;

CREATE INDEX IF NOT EXISTS idx_dam_assets_clip_source
    ON dam_assets(tenant_id, clip_source_type)
    WHERE clip_source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dam_assets_burned_captions
    ON dam_assets(tenant_id, has_burned_captions)
    WHERE has_burned_captions = TRUE;
CREATE INDEX IF NOT EXISTS idx_dam_assets_openclaw_catalog
    ON dam_assets(openclaw_catalog_id)
    WHERE openclaw_catalog_id IS NOT NULL;
