-- Video Creator Tools Migration
-- Phase 3E: Teleprompter scripts, CTA buttons, comments, reactions, and trim jobs

-- Teleprompter scripts
CREATE TABLE IF NOT EXISTS video_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scroll_speed INTEGER DEFAULT 3 CHECK (scroll_speed >= 1 AND scroll_speed <= 10),
  font_size INTEGER DEFAULT 32 CHECK (font_size >= 16 AND font_size <= 72),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_scripts_user ON video_scripts(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_scripts_created ON video_scripts(tenant_id, user_id, created_at DESC);

-- CTA Buttons on videos
CREATE TABLE IF NOT EXISTS video_cta_buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  style TEXT DEFAULT 'primary' CHECK (style IN ('primary', 'secondary', 'outline')),
  position TEXT DEFAULT 'end' CHECK (position IN ('start', 'end', 'overlay')),
  show_at_seconds INTEGER,
  hide_at_seconds INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_cta_buttons_video ON video_cta_buttons(video_id);
CREATE INDEX IF NOT EXISTS idx_video_cta_buttons_tenant ON video_cta_buttons(tenant_id);

-- Timestamped comments
CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER,
  parent_id UUID REFERENCES video_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id, created_at);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON video_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_timestamp ON video_comments(video_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_video_comments_user ON video_comments(user_id);

-- Emoji reactions
CREATE TABLE IF NOT EXISTS video_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  timestamp_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, video_id, user_id, emoji, timestamp_seconds)
);

CREATE INDEX IF NOT EXISTS idx_video_reactions_video ON video_reactions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_reactions_timestamp ON video_reactions(video_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_video_reactions_user ON video_reactions(user_id);

-- Video trim jobs
CREATE TABLE IF NOT EXISTS video_trim_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  source_video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  new_video_id TEXT REFERENCES videos(id) ON DELETE SET NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_trim_jobs_tenant ON video_trim_jobs(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_trim_jobs_source ON video_trim_jobs(source_video_id);
CREATE INDEX IF NOT EXISTS idx_video_trim_jobs_status ON video_trim_jobs(status, created_at);

-- Update trigger for video_scripts
CREATE OR REPLACE FUNCTION update_video_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_scripts_updated_at_trigger ON video_scripts;
CREATE TRIGGER video_scripts_updated_at_trigger
  BEFORE UPDATE ON video_scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_video_scripts_updated_at();

-- Update trigger for video_comments
CREATE OR REPLACE FUNCTION update_video_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_comments_updated_at_trigger ON video_comments;
CREATE TRIGGER video_comments_updated_at_trigger
  BEFORE UPDATE ON video_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_video_comments_updated_at();
