-- PHASE-2H-PRODUCTIVITY: Productivity & Task Management tables
-- Migration: 012_productivity
-- Scope: Tenant schema

-- Task status enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task priority enum
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task source type enum
DO $$ BEGIN
  CREATE TYPE task_source_type AS ENUM ('manual', 'slack', 'email', 'workflow', 'ai_extracted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Project status enum
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('draft', 'active', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Project pipeline stage enum
DO $$ BEGIN
  CREATE TYPE project_pipeline_stage AS ENUM ('backlog', 'planning', 'in_progress', 'review', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Project type enum
DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('internal', 'client', 'creator', 'campaign');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Saved item type enum
DO $$ BEGIN
  CREATE TYPE saved_item_type AS ENUM ('task', 'project', 'message', 'file', 'link');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Comment type enum
DO $$ BEGIN
  CREATE TYPE task_comment_type AS ENUM ('comment', 'status_change', 'assignment', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Projects table (create first since tasks reference it)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'draft',

  -- Assignment & ownership
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  coordinator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Timeline
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Project type & categorization
  project_type project_type,
  tags TEXT[] DEFAULT '{}',

  -- Kanban position
  pipeline_stage project_pipeline_stage DEFAULT 'backlog',
  pipeline_order INTEGER DEFAULT 0,

  -- External references
  external_id TEXT,
  external_type TEXT,

  -- Metadata
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(pipeline_stage, pipeline_order);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',

  -- Assignment
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Timeline
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_via TEXT,

  -- Organization
  tags TEXT[] DEFAULT '{}',
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Source tracking (for AI extraction, Slack, etc.)
  source_type task_source_type DEFAULT 'manual',
  source_ref TEXT,
  source_message TEXT,

  -- AI metadata
  ai_extracted BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Saved items / bookmarks
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- What's saved
  item_type saved_item_type NOT NULL,
  item_id UUID,
  item_url TEXT,

  -- Display
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Organization
  folder TEXT DEFAULT 'starred',
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_folder ON saved_items(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_saved_items_type ON saved_items(item_type);

-- Task comments / activity log
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,

  -- Activity type
  comment_type task_comment_type DEFAULT 'comment',

  -- For status changes
  old_value TEXT,
  new_value TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author ON task_comments(author_id);

-- Productivity audit log
CREATE TABLE IF NOT EXISTS productivity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  old_value JSONB,
  new_value JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productivity_audit_actor ON productivity_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_productivity_audit_time ON productivity_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productivity_audit_entity ON productivity_audit_log(entity_type, entity_id);
