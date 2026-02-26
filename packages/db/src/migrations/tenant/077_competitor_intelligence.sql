-- Migration: 077_competitor_intelligence
-- Description: Competitive intelligence storage for CI pipeline
-- Stores competitor ad monitoring data: brands, assets, rank tracking,
-- Gemini analyses, scaling alerts, and clone briefs.
--
-- Sources:
--   openCLAW ad-library-dl skill (competitor_monitor.py, clone_competitor.py)
--   CI Store adapter (ci_store.py)

-- ============================================================
-- 1. ci_brands — Monitored competitor brands
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_brands (
    dir_name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    ad_library_url TEXT,
    first_analyzed_at TIMESTAMPTZ,
    last_analyzed_at TIMESTAMPTZ,
    drive_root_folder_id TEXT,
    drive_statics_folder_id TEXT,
    drive_videos_folder_id TEXT,
    drive_clones_folder_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_ci_brands_updated_at ON ci_brands;
CREATE TRIGGER set_ci_brands_updated_at
    BEFORE UPDATE ON ci_brands
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE ci_brands IS 'Competitor brands monitored via Ad Library CI pipeline';

-- ============================================================
-- 2. ci_assets — Individual competitor ads
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_assets (
    url_hash TEXT PRIMARY KEY,
    brand_dir TEXT NOT NULL REFERENCES ci_brands(dir_name) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('image', 'video')),
    current_rank INTEGER,
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    drive_file_id TEXT,
    source_url_prefix TEXT,
    filename TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_assets_brand ON ci_assets(brand_dir);
CREATE INDEX IF NOT EXISTS idx_ci_assets_rank ON ci_assets(current_rank);
CREATE INDEX IF NOT EXISTS idx_ci_assets_type ON ci_assets(brand_dir, type);

DROP TRIGGER IF EXISTS set_ci_assets_updated_at ON ci_assets;
CREATE TRIGGER set_ci_assets_updated_at
    BEFORE UPDATE ON ci_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE ci_assets IS 'Individual competitor ads tracked across scans';

-- ============================================================
-- 3. ci_rank_history — Append-only rank tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_rank_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    asset_hash TEXT NOT NULL REFERENCES ci_assets(url_hash) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    session TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_rank_history_asset ON ci_rank_history(asset_hash);
CREATE INDEX IF NOT EXISTS idx_ci_rank_history_recorded ON ci_rank_history(recorded_at DESC);

COMMENT ON TABLE ci_rank_history IS 'Append-only rank changes per asset across monitoring scans';

-- ============================================================
-- 4. ci_analyses — Gemini vision analysis per asset
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_analyses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    asset_hash TEXT NOT NULL REFERENCES ci_assets(url_hash) ON DELETE CASCADE,
    session TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    analysis_summary TEXT,
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_analyses_asset ON ci_analyses(asset_hash);
CREATE INDEX IF NOT EXISTS idx_ci_analyses_created ON ci_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_analyses_search ON ci_analyses USING GIN(search_vector);

-- Auto-generate tsvector from summary
DROP TRIGGER IF EXISTS ci_analyses_search_vector ON ci_analyses;
CREATE OR REPLACE FUNCTION update_ci_analyses_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.analysis_summary, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ci_analyses_search_vector
    BEFORE INSERT OR UPDATE ON ci_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_ci_analyses_search_vector();

COMMENT ON TABLE ci_analyses IS 'Gemini vision analysis output per competitor ad';

-- ============================================================
-- 5. ci_scans — Per-monitoring-run metadata
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_scans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    brand_dir TEXT NOT NULL REFERENCES ci_brands(dir_name) ON DELETE CASCADE,
    session_ts TEXT NOT NULL,
    total_ads INTEGER,
    new_ads INTEGER,
    deduped INTEGER,
    doc_url TEXT,
    drive_url TEXT,
    scaling_alerts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_scans_brand ON ci_scans(brand_dir);
CREATE INDEX IF NOT EXISTS idx_ci_scans_created ON ci_scans(created_at DESC);

COMMENT ON TABLE ci_scans IS 'Metadata for each CI monitoring run';

-- ============================================================
-- 6. ci_clones — Clone briefs generated from competitor ads
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_clones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    asset_hash TEXT NOT NULL REFERENCES ci_assets(url_hash) ON DELETE CASCADE,
    clone_type TEXT NOT NULL CHECK (clone_type IN ('statics', 'videos')),
    brief_data JSONB NOT NULL,
    batch_name TEXT,
    agent TEXT,
    doc_url TEXT,
    drive_file_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_clones_asset ON ci_clones(asset_hash);
CREATE INDEX IF NOT EXISTS idx_ci_clones_batch ON ci_clones(batch_name);

COMMENT ON TABLE ci_clones IS 'Clone briefs and filming scripts derived from competitor ads';
