-- Creator applications table
-- Tracks creator program applications and review status

-- Application status enum
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('new', 'in_review', 'approved', 'rejected', 'waitlisted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS creator_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Contact info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Social profiles
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  other_social JSONB NOT NULL DEFAULT '{}',

  -- Follower info
  follower_count INTEGER,
  engagement_rate NUMERIC(5,2),

  -- Application content
  bio TEXT,
  why_interested TEXT,
  previous_partnerships TEXT,
  content_categories TEXT[],

  -- Source tracking
  source TEXT, -- organic, referral, ad, etc.
  referrer_code TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Status
  status application_status NOT NULL DEFAULT 'new',

  -- Review
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  internal_notes TEXT,

  -- Resulting creator (if approved)
  creator_id TEXT REFERENCES creators(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creator_applications_updated_at ON creator_applications;
CREATE TRIGGER update_creator_applications_updated_at
  BEFORE UPDATE ON creator_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_applications_status ON creator_applications(status);
CREATE INDEX IF NOT EXISTS idx_creator_applications_email ON creator_applications(email);
CREATE INDEX IF NOT EXISTS idx_creator_applications_source ON creator_applications(source);
CREATE INDEX IF NOT EXISTS idx_creator_applications_created_at ON creator_applications(created_at);

COMMENT ON TABLE creator_applications IS 'Creator program applications';
COMMENT ON COLUMN creator_applications.source IS 'How the applicant found the program';
