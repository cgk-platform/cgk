-- Survey System Migration
-- PHASE-2SV: Surveys & Post-Purchase Attribution

-- Enum for survey status
DO $$ BEGIN
  CREATE TYPE survey_status AS ENUM ('draft', 'active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum for survey type
DO $$ BEGIN
  CREATE TYPE survey_type AS ENUM ('post_purchase', 'post_delivery', 'nps', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum for question type
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('single_select', 'multi_select', 'text', 'textarea', 'rating', 'nps', 'email', 'phone');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum for attribution category
DO $$ BEGIN
  CREATE TYPE attribution_category AS ENUM ('social', 'search', 'ads', 'referral', 'offline', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) NOT NULL UNIQUE,
  survey_type survey_type NOT NULL DEFAULT 'post_purchase',
  trigger_config JSONB NOT NULL DEFAULT '{"timing": "immediate"}'::jsonb,
  title VARCHAR(500) NOT NULL,
  subtitle TEXT,
  thank_you_message TEXT,
  redirect_url TEXT,
  branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status survey_status NOT NULL DEFAULT 'draft',
  target_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_limit INTEGER,
  expires_at TIMESTAMPTZ,
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS surveys_status_idx ON surveys (status);
CREATE INDEX IF NOT EXISTS surveys_type_idx ON surveys (survey_type);
CREATE INDEX IF NOT EXISTS surveys_slug_idx ON surveys (slug);

-- Survey questions table
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  help_text TEXT,
  question_type question_type NOT NULL DEFAULT 'single_select',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  required BOOLEAN NOT NULL DEFAULT true,
  validation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  show_when JSONB,
  is_attribution_question BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS survey_questions_survey_idx ON survey_questions (survey_id);
CREATE INDEX IF NOT EXISTS survey_questions_order_idx ON survey_questions (survey_id, display_order);

-- Attribution options (reusable across surveys)
CREATE TABLE IF NOT EXISTS attribution_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL UNIQUE,
  icon VARCHAR(100),
  category attribution_category,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attribution_options_active_idx ON attribution_options (is_active);
CREATE INDEX IF NOT EXISTS attribution_options_order_idx ON attribution_options (display_order);

-- Survey responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  order_id VARCHAR(100),
  customer_id VARCHAR(100),
  customer_email VARCHAR(255),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  ip_address INET,
  locale VARCHAR(10),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  attribution_source VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS survey_responses_survey_idx ON survey_responses (survey_id);
CREATE INDEX IF NOT EXISTS survey_responses_order_idx ON survey_responses (order_id);
CREATE INDEX IF NOT EXISTS survey_responses_created_idx ON survey_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS survey_responses_complete_idx ON survey_responses (is_complete);
CREATE INDEX IF NOT EXISTS survey_responses_attribution_idx ON survey_responses (attribution_source);

-- Survey answers table
CREATE TABLE IF NOT EXISTS survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer_value TEXT,
  answer_values TEXT[],
  answer_numeric DECIMAL(10, 2),
  answer_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS survey_answers_response_idx ON survey_answers (response_id);
CREATE INDEX IF NOT EXISTS survey_answers_question_idx ON survey_answers (question_id);

-- Slack configuration table
CREATE TABLE IF NOT EXISTS survey_slack_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  channel_name VARCHAR(255),
  notify_on_complete BOOLEAN NOT NULL DEFAULT true,
  notify_on_nps_low BOOLEAN NOT NULL DEFAULT false,
  nps_low_threshold INTEGER NOT NULL DEFAULT 6,
  daily_digest BOOLEAN NOT NULL DEFAULT false,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  digest_day INTEGER NOT NULL DEFAULT 1 CHECK (digest_day >= 0 AND digest_day <= 6),
  digest_hour INTEGER NOT NULL DEFAULT 9 CHECK (digest_hour >= 0 AND digest_hour <= 23),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS survey_slack_config_survey_idx ON survey_slack_config (survey_id);
CREATE INDEX IF NOT EXISTS survey_slack_config_active_idx ON survey_slack_config (is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_survey_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS surveys_updated_at ON surveys;
CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_survey_timestamp();

DROP TRIGGER IF EXISTS survey_slack_config_updated_at ON survey_slack_config;
CREATE TRIGGER survey_slack_config_updated_at
  BEFORE UPDATE ON survey_slack_config
  FOR EACH ROW EXECUTE FUNCTION update_survey_timestamp();

-- Insert default attribution options
INSERT INTO attribution_options (label, value, icon, category, is_system, display_order)
VALUES
  ('Instagram', 'instagram', 'instagram', 'social', true, 1),
  ('TikTok', 'tiktok', 'music', 'social', true, 2),
  ('Facebook', 'facebook', 'facebook', 'social', true, 3),
  ('Google Search', 'google_search', 'search', 'search', true, 4),
  ('YouTube', 'youtube', 'youtube', 'social', true, 5),
  ('Podcast', 'podcast', 'headphones', 'other', true, 6),
  ('Friend/Family', 'friend_family', 'users', 'referral', true, 7),
  ('Twitter/X', 'twitter', 'twitter', 'social', true, 8),
  ('Email Newsletter', 'email', 'mail', 'other', true, 9),
  ('Blog/Article', 'blog', 'file-text', 'other', true, 10),
  ('Online Ad', 'online_ad', 'target', 'ads', true, 11),
  ('TV/Radio', 'tv_radio', 'tv', 'offline', true, 12),
  ('Retail Store', 'retail', 'store', 'offline', true, 13),
  ('Other', 'other', 'help-circle', 'other', true, 99)
ON CONFLICT (value) DO NOTHING;

-- Create a default post-purchase survey
INSERT INTO surveys (name, slug, title, survey_type, status)
VALUES (
  'Post-Purchase Attribution Survey',
  'post-purchase-attribution',
  'How did you hear about us?',
  'post_purchase',
  'draft'
)
ON CONFLICT (slug) DO NOTHING;

-- Add attribution question to default survey
INSERT INTO survey_questions (survey_id, question_text, question_type, is_attribution_question, display_order, options)
SELECT
  id,
  'How did you hear about us?',
  'single_select',
  true,
  1,
  '[
    {"id": "opt_1", "label": "Instagram", "value": "instagram"},
    {"id": "opt_2", "label": "TikTok", "value": "tiktok"},
    {"id": "opt_3", "label": "Facebook", "value": "facebook"},
    {"id": "opt_4", "label": "Google Search", "value": "google_search"},
    {"id": "opt_5", "label": "YouTube", "value": "youtube"},
    {"id": "opt_6", "label": "Podcast", "value": "podcast"},
    {"id": "opt_7", "label": "Friend/Family", "value": "friend_family"},
    {"id": "opt_8", "label": "Other", "value": "other", "isOther": true}
  ]'::jsonb
FROM surveys
WHERE slug = 'post-purchase-attribution'
  AND NOT EXISTS (
    SELECT 1 FROM survey_questions WHERE survey_id = surveys.id
  );
