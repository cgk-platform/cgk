-- UGC Submissions table for gallery moderation
-- Migration: 016_ugc_submissions

CREATE TABLE IF NOT EXISTS ugc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer info
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,

  -- Content
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  testimonial TEXT,
  products_used TEXT[],
  duration_days INTEGER,

  -- Consent
  consent_marketing BOOLEAN DEFAULT false,
  consent_terms BOOLEAN DEFAULT false,

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  source TEXT DEFAULT 'web_form',
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ugc_submissions_status ON ugc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_ugc_submissions_created_at ON ugc_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_submissions_customer_email ON ugc_submissions(customer_email);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ugc_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ugc_submissions_updated_at ON ugc_submissions;
CREATE TRIGGER ugc_submissions_updated_at
  BEFORE UPDATE ON ugc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_ugc_submissions_updated_at();
