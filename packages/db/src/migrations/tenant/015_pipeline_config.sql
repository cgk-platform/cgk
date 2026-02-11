-- Pipeline configuration and automation
-- Creator project pipeline management

-- Pipeline configuration per tenant
CREATE TABLE IF NOT EXISTS pipeline_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  default_filters JSONB,
  wip_limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one config row per tenant schema
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_config_singleton ON pipeline_config((true));

-- Pipeline automation triggers
CREATE TABLE IF NOT EXISTS pipeline_triggers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_stage VARCHAR(50),
  trigger_days INTEGER,
  trigger_value_cents INTEGER,
  actions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved filters for quick access
CREATE TABLE IF NOT EXISTS pipeline_saved_filters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table - core pipeline entity
-- Project status enum
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'draft',
    'pending_creator',
    'in_progress',
    'submitted',
    'revision_requested',
    'approved',
    'payout_ready',
    'withdrawal_requested',
    'payout_approved'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Projects table (if not exists from previous migrations)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'draft',
  value_cents INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  files_count INTEGER DEFAULT 0,
  has_unread_messages BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add status column if it doesn't exist (for existing tables)
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS status project_status DEFAULT 'draft';
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- Add other columns if they don't exist
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date DATE;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS files_count INTEGER DEFAULT 0;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_unread_messages BOOLEAN DEFAULT false;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Stage transition history for analytics
CREATE TABLE IF NOT EXISTS pipeline_stage_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_stage VARCHAR(50),
  to_stage VARCHAR(50) NOT NULL,
  changed_by TEXT REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_triggers_enabled ON pipeline_triggers(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_pipeline_saved_filters_user ON pipeline_saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_creator ON projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_project ON pipeline_stage_history(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_created ON pipeline_stage_history(created_at);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_pipeline_config_updated_at ON pipeline_config;
CREATE TRIGGER update_pipeline_config_updated_at
  BEFORE UPDATE ON pipeline_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_triggers_updated_at ON pipeline_triggers;
CREATE TRIGGER update_pipeline_triggers_updated_at
  BEFORE UPDATE ON pipeline_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pipeline config if none exists
INSERT INTO pipeline_config (stages, wip_limits)
SELECT
  '[
    {"id": "draft", "label": "Draft", "color": "#9CA3AF"},
    {"id": "pending_creator", "label": "Upcoming", "color": "#3B82F6"},
    {"id": "in_progress", "label": "In Progress", "color": "#8B5CF6"},
    {"id": "submitted", "label": "Submitted", "color": "#F59E0B"},
    {"id": "revision_requested", "label": "Revisions", "color": "#EF4444"},
    {"id": "approved", "label": "Approved", "color": "#10B981"},
    {"id": "payout_ready", "label": "Payout Ready", "color": "#059669"},
    {"id": "withdrawal_requested", "label": "Withdrawal Requested", "color": "#6366F1"},
    {"id": "payout_approved", "label": "Paid", "color": "#047857"}
  ]'::jsonb,
  '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM pipeline_config);

COMMENT ON TABLE pipeline_config IS 'Pipeline stage configuration per tenant';
COMMENT ON TABLE pipeline_triggers IS 'Automation triggers for pipeline events';
COMMENT ON TABLE pipeline_saved_filters IS 'User-saved filter presets';
COMMENT ON TABLE pipeline_stage_history IS 'History of project stage transitions for analytics';
