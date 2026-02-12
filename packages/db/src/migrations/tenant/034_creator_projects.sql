-- Migration: 034_creator_projects.sql
-- Description: Creator project management and file tracking
-- Phase: PHASE-4C-CREATOR-PROJECTS

-- Creator projects table
CREATE TABLE IF NOT EXISTS creator_projects (
  id VARCHAR(64) PRIMARY KEY,
  creator_id VARCHAR(64) NOT NULL,
  brand_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  brief TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'in_review', 'revision_requested', 'approved', 'completed', 'cancelled'
  )),
  due_date DATE,
  payment_cents INTEGER DEFAULT 0,
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 3,
  feedback TEXT,
  feedback_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project files table
CREATE TABLE IF NOT EXISTS project_files (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES creator_projects(id) ON DELETE CASCADE,
  creator_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  is_deliverable BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project revision history
CREATE TABLE IF NOT EXISTS project_revisions (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES creator_projects(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('requested', 'submitted', 'approved', 'rejected')),
  request_notes TEXT,
  response_notes TEXT,
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255)
);

-- Indexes for creator_projects
CREATE INDEX IF NOT EXISTS idx_creator_projects_creator ON creator_projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_projects_brand ON creator_projects(brand_id);
CREATE INDEX IF NOT EXISTS idx_creator_projects_status ON creator_projects(status);
CREATE INDEX IF NOT EXISTS idx_creator_projects_due_date ON creator_projects(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_projects_created ON creator_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_projects_creator_status ON creator_projects(creator_id, status);

-- Indexes for project_files
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_creator ON project_files(creator_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded ON project_files(uploaded_at DESC);

-- Indexes for project_revisions
CREATE INDEX IF NOT EXISTS idx_project_revisions_project ON project_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_revisions_status ON project_revisions(project_id, status);

-- Trigger for updated_at on creator_projects
CREATE OR REPLACE FUNCTION update_creator_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS creator_projects_updated_at ON creator_projects;
CREATE TRIGGER creator_projects_updated_at
  BEFORE UPDATE ON creator_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_projects_updated_at();
