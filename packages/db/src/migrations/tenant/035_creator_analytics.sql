-- Creator analytics tables for admin dashboard
-- Tracks per-creator metrics and aggregated analytics snapshots

-- Creator response metrics - daily per-creator metrics
CREATE TABLE IF NOT EXISTS creator_response_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,

  -- Response metrics
  messages_received INTEGER NOT NULL DEFAULT 0,
  messages_responded INTEGER NOT NULL DEFAULT 0,
  avg_response_time_minutes INTEGER,
  median_response_time_minutes INTEGER,

  -- Project metrics
  projects_started INTEGER NOT NULL DEFAULT 0,
  projects_submitted INTEGER NOT NULL DEFAULT 0,
  projects_approved INTEGER NOT NULL DEFAULT 0,
  projects_revision_requested INTEGER NOT NULL DEFAULT 0,
  avg_delivery_days NUMERIC(5,2),

  -- Engagement
  files_uploaded INTEGER NOT NULL DEFAULT 0,
  logins INTEGER NOT NULL DEFAULT 0,
  portal_time_minutes INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT creator_response_metrics_unique UNIQUE (creator_id, metric_date)
);

-- Indexes for creator_response_metrics
CREATE INDEX IF NOT EXISTS idx_creator_response_metrics_lookup
  ON creator_response_metrics(creator_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_creator_response_metrics_date
  ON creator_response_metrics(metric_date DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_response_metrics_updated_at ON creator_response_metrics;
CREATE TRIGGER update_creator_response_metrics_updated_at
  BEFORE UPDATE ON creator_response_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Creator analytics snapshots - aggregated tenant-wide metrics
CREATE TABLE IF NOT EXISTS creator_analytics_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),

  -- Creator counts
  total_creators INTEGER NOT NULL DEFAULT 0,
  active_creators INTEGER NOT NULL DEFAULT 0,
  pending_creators INTEGER NOT NULL DEFAULT 0,
  inactive_creators INTEGER NOT NULL DEFAULT 0,
  churned_creators INTEGER NOT NULL DEFAULT 0,

  -- Application funnel
  applications_received INTEGER NOT NULL DEFAULT 0,
  applications_approved INTEGER NOT NULL DEFAULT 0,
  applications_rejected INTEGER NOT NULL DEFAULT 0,
  onboarding_started INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,

  -- Earnings
  total_earnings_cents BIGINT NOT NULL DEFAULT 0,
  total_pending_cents BIGINT NOT NULL DEFAULT 0,
  total_payouts_cents BIGINT NOT NULL DEFAULT 0,
  avg_earnings_cents INTEGER NOT NULL DEFAULT 0,

  -- Performance
  projects_created INTEGER NOT NULL DEFAULT 0,
  projects_completed INTEGER NOT NULL DEFAULT 0,
  avg_project_value_cents INTEGER NOT NULL DEFAULT 0,
  avg_delivery_days NUMERIC(5,2),
  avg_response_hours NUMERIC(5,2),

  -- Health distribution (JSON)
  health_distribution JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT creator_analytics_snapshots_unique UNIQUE (snapshot_date, snapshot_type)
);

-- Indexes for creator_analytics_snapshots
CREATE INDEX IF NOT EXISTS idx_creator_analytics_snapshots_lookup
  ON creator_analytics_snapshots(snapshot_date DESC, snapshot_type);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_snapshots_type
  ON creator_analytics_snapshots(snapshot_type, snapshot_date DESC);

-- Comments
COMMENT ON TABLE creator_response_metrics IS 'Daily metrics per creator for response tracking and performance analysis';
COMMENT ON TABLE creator_analytics_snapshots IS 'Aggregated analytics snapshots for the creator program dashboard';

COMMENT ON COLUMN creator_response_metrics.avg_response_time_minutes IS 'Average response time to messages in minutes';
COMMENT ON COLUMN creator_response_metrics.avg_delivery_days IS 'Average days from project start to submission';
COMMENT ON COLUMN creator_analytics_snapshots.health_distribution IS 'JSON object with counts: {champions, healthy, at_risk, inactive, churned}';
