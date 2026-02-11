-- PHASE-2SV: Survey System
-- Post-purchase surveys, attribution collection, and response analytics

-- Survey definitions
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,

  -- Type and trigger
  survey_type TEXT NOT NULL DEFAULT 'post_purchase'
    CHECK (survey_type IN ('post_purchase', 'post_delivery', 'nps', 'custom')),
  trigger_config JSONB DEFAULT '{"timing": "immediate"}'::jsonb,

  -- Display settings
  title TEXT NOT NULL,
  subtitle TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for your feedback!',
  redirect_url TEXT,

  -- Branding (inherits tenant theme by default)
  branding_config JSONB DEFAULT '{}'::jsonb,

  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),

  -- Targeting
  target_config JSONB DEFAULT '{}'::jsonb,

  -- Limits
  response_limit INTEGER,
  expires_at TIMESTAMPTZ,

  -- Multi-language
  locale TEXT DEFAULT 'en',
  translations JSONB DEFAULT '{}'::jsonb,

  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT surveys_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_type ON surveys(survey_type);
CREATE INDEX idx_surveys_created ON surveys(created_at DESC);


-- Survey questions
CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,

  -- Question content
  question_text TEXT NOT NULL,
  help_text TEXT,

  -- Type
  question_type TEXT NOT NULL
    CHECK (question_type IN ('single_select', 'multi_select', 'text', 'textarea', 'rating', 'nps', 'email', 'phone')),

  -- Options (for select types)
  options JSONB DEFAULT '[]'::jsonb,

  -- Validation
  required BOOLEAN DEFAULT FALSE,
  validation_config JSONB DEFAULT '{}'::jsonb,

  -- Conditional logic
  show_when JSONB,

  -- Attribution flag
  is_attribution_question BOOLEAN DEFAULT FALSE,

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Multi-language
  translations JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id, display_order);
CREATE INDEX idx_survey_questions_attribution ON survey_questions(is_attribution_question)
  WHERE is_attribution_question = TRUE;


-- Attribution options (predefined + custom)
CREATE TABLE attribution_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT,

  -- Categorization
  category TEXT
    CHECK (category IN ('social', 'search', 'ads', 'referral', 'offline', 'other')),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,

  -- Ordering
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT attribution_options_value_unique UNIQUE (value)
);

CREATE INDEX idx_attribution_options_active ON attribution_options(is_active, display_order);


-- Survey responses
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,

  -- Context
  order_id TEXT,
  customer_id TEXT,
  customer_email TEXT,

  -- Response metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_complete BOOLEAN DEFAULT FALSE,

  -- Device/context
  user_agent TEXT,
  ip_address TEXT,
  locale TEXT,

  -- Calculated fields
  nps_score INTEGER,
  attribution_source TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate responses per order per survey
  CONSTRAINT survey_responses_order_unique UNIQUE (survey_id, order_id)
);

CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id, created_at DESC);
CREATE INDEX idx_survey_responses_order ON survey_responses(order_id);
CREATE INDEX idx_survey_responses_customer ON survey_responses(customer_id);
CREATE INDEX idx_survey_responses_complete ON survey_responses(is_complete);
CREATE INDEX idx_survey_responses_attribution ON survey_responses(attribution_source);
CREATE INDEX idx_survey_responses_nps ON survey_responses(nps_score) WHERE nps_score IS NOT NULL;


-- Individual question answers
CREATE TABLE survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,

  -- Answer data
  answer_value TEXT,
  answer_values TEXT[],
  answer_numeric DECIMAL,
  answer_json JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT survey_answers_unique UNIQUE (response_id, question_id)
);

CREATE INDEX idx_survey_answers_response ON survey_answers(response_id);
CREATE INDEX idx_survey_answers_question ON survey_answers(question_id);


-- Slack notification config
CREATE TABLE survey_slack_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,

  -- NULL survey_id = global config for all surveys

  -- Slack settings
  webhook_url TEXT NOT NULL,
  channel_name TEXT,

  -- Notification settings
  notify_on_complete BOOLEAN DEFAULT TRUE,
  notify_on_nps_low BOOLEAN DEFAULT TRUE,
  nps_low_threshold INTEGER DEFAULT 6,

  -- Digest settings
  daily_digest BOOLEAN DEFAULT FALSE,
  weekly_digest BOOLEAN DEFAULT FALSE,
  digest_day INTEGER DEFAULT 1,
  digest_hour INTEGER DEFAULT 9,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_slack_survey ON survey_slack_config(survey_id);
CREATE INDEX idx_survey_slack_active ON survey_slack_config(is_active) WHERE is_active = TRUE;


-- Seed default attribution options
INSERT INTO attribution_options (label, value, icon, category, is_system, display_order) VALUES
  -- Social
  ('TikTok', 'tiktok', '🎵', 'social', TRUE, 1),
  ('Instagram', 'instagram', '📸', 'social', TRUE, 2),
  ('Facebook', 'facebook', '👍', 'social', TRUE, 3),
  ('YouTube', 'youtube', '📺', 'social', TRUE, 4),
  ('Twitter/X', 'twitter', '🐦', 'social', TRUE, 5),

  -- Search
  ('Google Search', 'google_search', '🔍', 'search', TRUE, 10),
  ('Bing Search', 'bing_search', '🔎', 'search', TRUE, 11),

  -- Ads
  ('Facebook/Instagram Ad', 'meta_ads', '📣', 'ads', TRUE, 20),
  ('TikTok Ad', 'tiktok_ads', '🎯', 'ads', TRUE, 21),
  ('Google Ad', 'google_ads', '💰', 'ads', TRUE, 22),

  -- Referral
  ('Friend or Family', 'friend_family', '👥', 'referral', TRUE, 30),
  ('Influencer/Creator', 'influencer', '⭐', 'referral', TRUE, 31),
  ('Podcast', 'podcast', '🎙️', 'referral', TRUE, 32),
  ('Blog/Article', 'blog', '📝', 'referral', TRUE, 33),

  -- Offline
  ('Retail Store', 'retail', '🏪', 'offline', TRUE, 40),
  ('Event/Conference', 'event', '🎪', 'offline', TRUE, 41),
  ('Print Ad/Mailer', 'print', '📰', 'offline', TRUE, 42),

  -- Other
  ('Other (please specify)', 'other', '✏️', 'other', TRUE, 99)
ON CONFLICT (value) DO NOTHING;


-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_updated_at();

CREATE TRIGGER survey_slack_config_updated_at
  BEFORE UPDATE ON survey_slack_config
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_updated_at();
