-- Video Transcription Schema Extensions
-- Migration: 030_video_transcription
-- Adds transcription and AI content columns to videos table

-- Add transcription columns to videos table (if videos table exists)
DO $$
BEGIN
  -- Check if videos table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'videos') THEN
    -- Transcription status
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcription_status') THEN
      ALTER TABLE videos ADD COLUMN transcription_status TEXT DEFAULT 'pending'
        CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;

    -- Transcription job ID (provider-specific)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcription_job_id') THEN
      ALTER TABLE videos ADD COLUMN transcription_job_id TEXT;
    END IF;

    -- Full transcript text (searchable)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcription_text') THEN
      ALTER TABLE videos ADD COLUMN transcription_text TEXT;
    END IF;

    -- Word-level timestamps with speakers
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcription_words') THEN
      ALTER TABLE videos ADD COLUMN transcription_words JSONB;
    END IF;

    -- AI-generated title suggestion
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ai_title') THEN
      ALTER TABLE videos ADD COLUMN ai_title TEXT;
    END IF;

    -- AI-generated summary
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ai_summary') THEN
      ALTER TABLE videos ADD COLUMN ai_summary TEXT;
    END IF;

    -- AI-generated/enhanced chapters
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ai_chapters') THEN
      ALTER TABLE videos ADD COLUMN ai_chapters JSONB;
    END IF;

    -- AI-extracted action items/tasks
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ai_tasks') THEN
      ALTER TABLE videos ADD COLUMN ai_tasks JSONB;
    END IF;
  END IF;
END $$;

-- Create videos table if it doesn't exist (for fresh installs)
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  folder_id TEXT,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  recording_type TEXT, -- 'screen', 'camera', 'screen_camera', 'upload'

  -- Mux integration
  mux_upload_id TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  thumbnail_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'ready', 'error', 'deleted')),
  error_message TEXT,

  -- Transcription
  transcription_status TEXT DEFAULT 'pending'
    CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_job_id TEXT,
  transcription_text TEXT,
  transcription_words JSONB,

  -- AI Content
  ai_title TEXT,
  ai_summary TEXT,
  ai_chapters JSONB,
  ai_tasks JSONB,

  -- Full-text search vector
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(transcription_text, '')), 'C')
  ) STORED,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for video queries
CREATE INDEX IF NOT EXISTS idx_videos_tenant_id ON videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_folder_id ON videos(folder_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Transcription-specific indexes
CREATE INDEX IF NOT EXISTS idx_videos_transcription_status
  ON videos(tenant_id, transcription_status)
  WHERE transcription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_transcription_job_id
  ON videos(transcription_job_id)
  WHERE transcription_job_id IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_videos_search_vector
  ON videos USING gin(search_vector);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_videos_updated_at();

-- Comments
COMMENT ON TABLE videos IS 'Video assets with transcription and AI content';
COMMENT ON COLUMN videos.transcription_status IS 'Transcription pipeline status: pending, processing, completed, failed';
COMMENT ON COLUMN videos.transcription_words IS 'Word-level timestamps as JSONB array [{text, startMs, endMs, confidence, speaker}]';
COMMENT ON COLUMN videos.ai_chapters IS 'Chapter markers as JSONB array [{headline, summary, startMs, endMs}]';
COMMENT ON COLUMN videos.ai_tasks IS 'Extracted action items as JSONB array [{text, completed, timestampSeconds}]';
COMMENT ON COLUMN videos.search_vector IS 'Full-text search including title, description, and transcript';
