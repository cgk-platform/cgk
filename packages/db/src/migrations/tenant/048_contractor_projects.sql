-- Migration: 048_contractor_projects
-- Description: Contractor project assignments and tracking
-- Phase: INFRASTRUCTURE-FIX

CREATE TABLE IF NOT EXISTS contractor_projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contractor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  budget_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  start_date DATE,
  end_date DATE,
  deliverables JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_projects_contractor ON contractor_projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_projects_status ON contractor_projects(status);
CREATE INDEX IF NOT EXISTS idx_contractor_projects_dates ON contractor_projects(start_date, end_date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_contractor_projects_updated_at ON contractor_projects;
CREATE TRIGGER update_contractor_projects_updated_at
  BEFORE UPDATE ON contractor_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE contractor_projects IS 'Projects assigned to contractors within the tenant';
COMMENT ON COLUMN contractor_projects.deliverables IS 'JSON array of project deliverables with status';
COMMENT ON COLUMN contractor_projects.milestones IS 'JSON array of project milestones with dates and payment amounts';
