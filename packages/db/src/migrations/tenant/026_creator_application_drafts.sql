-- Creator application drafts table
-- Stores incomplete application forms for resume functionality
-- Migration: 026_creator_application_drafts.sql

CREATE TABLE IF NOT EXISTS creator_application_drafts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Applicant identifier (email used since no user yet)
  email TEXT NOT NULL,

  -- Draft data as JSON (partial form data)
  draft_data JSONB NOT NULL DEFAULT '{}',

  -- Current step (1-4)
  step INTEGER NOT NULL DEFAULT 1,

  -- UTM tracking captured at draft creation
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One draft per email
  UNIQUE(email)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_application_drafts_updated_at ON creator_application_drafts;
CREATE TRIGGER update_creator_application_drafts_updated_at
  BEFORE UPDATE ON creator_application_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_creator_application_drafts_email
  ON creator_application_drafts(email);

-- Index for cleanup of old drafts
CREATE INDEX IF NOT EXISTS idx_creator_application_drafts_updated
  ON creator_application_drafts(updated_at);

COMMENT ON TABLE creator_application_drafts IS 'Stores incomplete creator application forms';
COMMENT ON COLUMN creator_application_drafts.draft_data IS 'Partial form data as JSON';
COMMENT ON COLUMN creator_application_drafts.step IS 'Last completed step (1-4)';
