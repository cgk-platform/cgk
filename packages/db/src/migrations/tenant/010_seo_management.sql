-- SEO Management tables
-- Keyword tracking, position history, content gaps, redirects, and audits

-- Priority enum for keywords
DO $$ BEGIN
  CREATE TYPE seo_keyword_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Gap type enum for content gaps
DO $$ BEGIN
  CREATE TYPE seo_gap_type AS ENUM ('no_content', 'weak_content', 'no_dedicated_page');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- SEO Keywords table
CREATE TABLE IF NOT EXISTS seo_keywords (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Keyword data
  keyword TEXT NOT NULL,
  priority seo_keyword_priority NOT NULL DEFAULT 'medium',
  target_url TEXT,

  -- Current metrics from GSC
  current_position DECIMAL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL,

  -- Linked content
  linked_post_ids TEXT[],

  -- Timestamps
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on keyword per tenant
  UNIQUE(keyword)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_seo_keywords_updated_at ON seo_keywords;
CREATE TRIGGER update_seo_keywords_updated_at
  BEFORE UPDATE ON seo_keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON seo_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_priority ON seo_keywords(priority);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_position ON seo_keywords(current_position);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_created_at ON seo_keywords(created_at);

COMMENT ON TABLE seo_keywords IS 'Tracked SEO keywords with GSC metrics';


-- SEO Keyword History table (90-day rolling)
CREATE TABLE IF NOT EXISTS seo_keyword_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Foreign key to keyword
  keyword_id TEXT NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,

  -- Metrics snapshot
  position DECIMAL,
  clicks INTEGER,
  impressions INTEGER,
  ctr DECIMAL,

  -- When this snapshot was recorded
  recorded_at DATE NOT NULL,

  -- Unique constraint: one record per keyword per day
  UNIQUE(keyword_id, recorded_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_keyword_history_keyword ON seo_keyword_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_history_date ON seo_keyword_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_history_keyword_date ON seo_keyword_history(keyword_id, recorded_at DESC);

COMMENT ON TABLE seo_keyword_history IS 'Historical keyword position data (90-day rolling)';


-- SEO Content Gaps table
CREATE TABLE IF NOT EXISTS seo_content_gaps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Keyword data
  keyword TEXT NOT NULL,
  gap_type seo_gap_type NOT NULL,

  -- Scoring
  relevance_score INTEGER,

  -- External API data (optional, from DataForSEO)
  search_volume INTEGER,
  difficulty INTEGER,
  cpc DECIMAL,
  competitor_url TEXT,

  -- Analysis metadata
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on keyword
  UNIQUE(keyword)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_keyword ON seo_content_gaps(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_type ON seo_content_gaps(gap_type);
CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_score ON seo_content_gaps(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_volume ON seo_content_gaps(search_volume DESC NULLS LAST);

COMMENT ON TABLE seo_content_gaps IS 'Content gap analysis results';


-- SEO Redirects table
CREATE TABLE IF NOT EXISTS seo_redirects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Redirect paths
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301,

  -- Metadata
  note TEXT,

  -- Analytics
  hits INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on source path
  UNIQUE(source)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_seo_redirects_updated_at ON seo_redirects;
CREATE TRIGGER update_seo_redirects_updated_at
  BEFORE UPDATE ON seo_redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_redirects_source ON seo_redirects(source);
CREATE INDEX IF NOT EXISTS idx_seo_redirects_destination ON seo_redirects(destination);
CREATE INDEX IF NOT EXISTS idx_seo_redirects_hits ON seo_redirects(hits DESC);
CREATE INDEX IF NOT EXISTS idx_seo_redirects_created_at ON seo_redirects(created_at);

COMMENT ON TABLE seo_redirects IS 'URL redirect rules with analytics';


-- SEO Audits table
CREATE TABLE IF NOT EXISTS seo_audits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Audit summary
  total_pages INTEGER NOT NULL,
  average_score DECIMAL NOT NULL,
  critical_issues INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,

  -- Page-by-page results (stored as JSONB)
  page_results JSONB NOT NULL DEFAULT '[]',

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_audits_started_at ON seo_audits(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_audits_score ON seo_audits(average_score DESC);

COMMENT ON TABLE seo_audits IS 'Site-wide SEO audit history (30 audits retained)';


-- GSC Credentials table (encrypted tokens)
CREATE TABLE IF NOT EXISTS gsc_credentials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Connection data
  site_url TEXT NOT NULL,

  -- Encrypted tokens
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,

  -- Token expiration
  expires_at TIMESTAMPTZ NOT NULL,

  -- Connection status
  is_connected BOOLEAN DEFAULT true,
  last_error TEXT,

  -- Timestamps
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_gsc_credentials_updated_at ON gsc_credentials;
CREATE TRIGGER update_gsc_credentials_updated_at
  BEFORE UPDATE ON gsc_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE gsc_credentials IS 'Google Search Console OAuth credentials (encrypted)';
