-- Creator onboarding progress
-- Tracks individual creator progress through onboarding steps

CREATE TABLE IF NOT EXISTS creator_onboarding (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Creator reference
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- Step tracking
  step_id TEXT NOT NULL,

  -- Completion status
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Reminder tracking
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  next_reminder_at TIMESTAMPTZ,

  -- Metadata (e.g., document IDs, verification data)
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per creator per step
  UNIQUE(creator_id, step_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_onboarding_updated_at ON creator_onboarding;
CREATE TRIGGER update_creator_onboarding_updated_at
  BEFORE UPDATE ON creator_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_onboarding_creator ON creator_onboarding(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_onboarding_step ON creator_onboarding(step_id);
CREATE INDEX IF NOT EXISTS idx_creator_onboarding_incomplete ON creator_onboarding(creator_id)
  WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_creator_onboarding_next_reminder ON creator_onboarding(next_reminder_at)
  WHERE next_reminder_at IS NOT NULL AND completed = false;

COMMENT ON TABLE creator_onboarding IS 'Individual creator onboarding step progress';
COMMENT ON COLUMN creator_onboarding.step_id IS 'References step.id from onboarding_config.steps';
