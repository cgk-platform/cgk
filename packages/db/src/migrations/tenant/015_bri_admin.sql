-- BRI Admin tables for AI Agent administration
-- Phase: PHASE-2AI-ADMIN

-- Conversation history for AI agent
CREATE TABLE IF NOT EXISTS bri_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Conversation context
  channel_id TEXT,                      -- Slack channel ID
  thread_ts TEXT,                       -- Slack thread timestamp
  user_id TEXT NOT NULL,                -- User talking to Bri

  -- Content
  messages JSONB NOT NULL DEFAULT '[]', -- Array of {role, content, timestamp}
  tools_used TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  summary TEXT,                         -- AI-generated summary

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_bri_conversations_user ON bri_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_bri_conversations_channel ON bri_conversations(channel_id);
CREATE INDEX IF NOT EXISTS idx_bri_conversations_active ON bri_conversations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bri_conversations_created ON bri_conversations(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bri_conversations_updated_at ON bri_conversations;
CREATE TRIGGER update_bri_conversations_updated_at
  BEFORE UPDATE ON bri_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE bri_conversations IS 'Conversation history between users and Bri AI agent';

-- Creative ideas (scripts, hooks, concepts)
DO $$ BEGIN
  CREATE TYPE creative_idea_type AS ENUM (
    'ad_concept', 'script', 'hook', 'angle', 'cta',
    'testimonial', 'trend', 'inspiration'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE creative_idea_status AS ENUM (
    'draft', 'ready', 'in_use', 'proven', 'archived', 'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS creative_ideas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Identity
  title TEXT NOT NULL,
  type creative_idea_type NOT NULL DEFAULT 'hook',
  status creative_idea_status NOT NULL DEFAULT 'draft',

  -- Content
  description TEXT,
  content TEXT,                         -- The actual script/hook text

  -- Categorization
  products TEXT[] DEFAULT ARRAY[]::TEXT[],
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  formats TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Performance
  times_used INTEGER DEFAULT 0,
  performance_score NUMERIC(5,2),       -- 0-100 scale
  best_example TEXT,                    -- Link to best performing usage

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for creative ideas
CREATE INDEX IF NOT EXISTS idx_creative_ideas_type ON creative_ideas(type);
CREATE INDEX IF NOT EXISTS idx_creative_ideas_status ON creative_ideas(status);
CREATE INDEX IF NOT EXISTS idx_creative_ideas_created ON creative_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_ideas_performance ON creative_ideas(performance_score DESC NULLS LAST);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_creative_ideas_updated_at ON creative_ideas;
CREATE TRIGGER update_creative_ideas_updated_at
  BEFORE UPDATE ON creative_ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE creative_ideas IS 'Creative hooks, scripts, and concepts for content creation';

-- Link creative ideas to projects
CREATE TABLE IF NOT EXISTS creative_idea_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  idea_id TEXT NOT NULL REFERENCES creative_ideas(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,

  -- Usage details
  usage_type TEXT,                      -- 'direct', 'inspired', 'variation'
  performance_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_idea_links_idea ON creative_idea_links(idea_id);
CREATE INDEX IF NOT EXISTS idx_creative_idea_links_project ON creative_idea_links(project_id);

COMMENT ON TABLE creative_idea_links IS 'Links creative ideas to projects they were used in';

-- BRI integrations (OAuth tokens, API keys)
CREATE TABLE IF NOT EXISTS bri_integrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Integration type
  provider TEXT NOT NULL,               -- slack, google, retell, resend

  -- OAuth tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- API credentials (encrypted)
  api_key TEXT,

  -- Configuration
  config JSONB DEFAULT '{}',            -- Provider-specific settings

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_bri_integration_provider UNIQUE(provider)
);

CREATE INDEX IF NOT EXISTS idx_bri_integrations_provider ON bri_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_bri_integrations_active ON bri_integrations(is_active) WHERE is_active = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bri_integrations_updated_at ON bri_integrations;
CREATE TRIGGER update_bri_integrations_updated_at
  BEFORE UPDATE ON bri_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE bri_integrations IS 'OAuth tokens and API keys for Bri integrations';

-- Team member memories
DO $$ BEGIN
  CREATE TYPE memory_type AS ENUM (
    'role_pattern', 'response_style', 'availability',
    'preference', 'special_consideration', 'interaction_note', 'expertise'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE memory_source AS ENUM ('told', 'observed', 'inferred');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS team_member_memories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Who this is about
  user_id TEXT NOT NULL,                -- Reference to users table

  -- Memory content
  memory_type memory_type NOT NULL,
  source memory_source NOT NULL DEFAULT 'told',
  content TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 1.0,  -- 0.0 to 1.0

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_member_memories_user ON team_member_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_team_member_memories_type ON team_member_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_team_member_memories_source ON team_member_memories(source);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_team_member_memories_updated_at ON team_member_memories;
CREATE TRIGGER update_team_member_memories_updated_at
  BEFORE UPDATE ON team_member_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE team_member_memories IS 'Knowledge Bri has about team members';

-- User semantic memories (searchable knowledge store)
CREATE TABLE IF NOT EXISTS user_memories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Content
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'general', -- general, preference, context

  -- Search (use public.vector since extension is in public schema)
  embedding public.vector(1536),        -- OpenAI embedding for semantic search
  importance_score NUMERIC(5,2) DEFAULT 50.0,

  -- State
  is_archived BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only create vector index if extension exists
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_memories_embedding ON user_memories
    USING ivfflat (embedding public.vector_cosine_ops) WITH (lists = 100);
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_memories_type ON user_memories(content_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_archived ON user_memories(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_user_memories_importance ON user_memories(importance_score DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_memories_updated_at ON user_memories;
CREATE TRIGGER update_user_memories_updated_at
  BEFORE UPDATE ON user_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE user_memories IS 'Semantic memory store for Bri';

-- Team defaults for project assignments
CREATE TABLE IF NOT EXISTS bri_team_defaults (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Default assignments
  primary_contact_id TEXT,              -- Main point of contact
  secondary_contact_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  default_reviewer_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  finance_contact_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bri_team_defaults_updated_at ON bri_team_defaults;
CREATE TRIGGER update_bri_team_defaults_updated_at
  BEFORE UPDATE ON bri_team_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE bri_team_defaults IS 'Default team assignments for new projects';

-- Slack user links
CREATE TABLE IF NOT EXISTS slack_user_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- User mapping
  user_id TEXT NOT NULL,                -- Our user ID
  slack_user_id TEXT NOT NULL,          -- Slack user ID
  slack_username TEXT,

  -- Auto-linked or manual
  is_auto_linked BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_slack_link UNIQUE(user_id),
  CONSTRAINT unique_slack_user_link UNIQUE(slack_user_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_user_links_user ON slack_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_links_slack ON slack_user_links(slack_user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_slack_user_links_updated_at ON slack_user_links;
CREATE TRIGGER update_slack_user_links_updated_at
  BEFORE UPDATE ON slack_user_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE slack_user_links IS 'Mapping between internal users and Slack users';

-- Notification settings
CREATE TABLE IF NOT EXISTS bri_notification_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Event configuration (JSONB with per-event settings)
  event_settings JSONB NOT NULL DEFAULT '{}',

  -- Default channel
  default_slack_channel TEXT,

  -- Quiet hours
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'America/New_York',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bri_notification_settings_updated_at ON bri_notification_settings;
CREATE TRIGGER update_bri_notification_settings_updated_at
  BEFORE UPDATE ON bri_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE bri_notification_settings IS 'Notification event configuration';

-- Follow-up settings
CREATE TABLE IF NOT EXISTS bri_followup_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Delivery follow-ups
  enable_delivery_reminders BOOLEAN DEFAULT true,
  delivery_reminder_days INTEGER DEFAULT 7,

  -- Script trafficking
  traffic_scripts_on_production BOOLEAN DEFAULT true,
  traffic_script_delay_hours INTEGER DEFAULT 0,

  -- Deadline reminders
  days_before_deadline TEXT DEFAULT '1, 0',  -- Comma-separated
  days_after_deadline TEXT DEFAULT '1, 2, 3',
  escalate_after_days INTEGER DEFAULT 5,
  escalation_channel TEXT,

  -- Quiet hours
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'America/New_York',

  -- Custom templates (JSON)
  template_overrides JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bri_followup_settings_updated_at ON bri_followup_settings;
CREATE TRIGGER update_bri_followup_settings_updated_at
  BEFORE UPDATE ON bri_followup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE bri_followup_settings IS 'Follow-up timing and escalation configuration';

-- Voice configuration
CREATE TABLE IF NOT EXISTS bri_voice_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- TTS Settings
  tts_provider TEXT DEFAULT 'elevenlabs',
  tts_voice_id TEXT,
  tts_model TEXT DEFAULT 'eleven_turbo_v2_5',
  tts_stability NUMERIC(3,2) DEFAULT 0.5,
  tts_similarity_boost NUMERIC(3,2) DEFAULT 0.75,
  tts_speed NUMERIC(3,2) DEFAULT 1.0,

  -- STT Settings
  stt_provider TEXT DEFAULT 'assemblyai',
  stt_model TEXT,
  stt_language TEXT DEFAULT 'en',

  -- Personality
  acknowledgments TEXT[] DEFAULT ARRAY['Got it', 'Understood', 'Sure thing']::TEXT[],
  thinking_phrases TEXT[] DEFAULT ARRAY['Let me check...', 'One moment...']::TEXT[],
  speech_speed NUMERIC(3,2) DEFAULT 1.0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bri_voice_config_updated_at ON bri_voice_config;
CREATE TRIGGER update_bri_voice_config_updated_at
  BEFORE UPDATE ON bri_voice_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE bri_voice_config IS 'Voice/TTS/STT configuration for Bri';

-- BRI global settings
CREATE TABLE IF NOT EXISTS bri_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Status
  is_enabled BOOLEAN DEFAULT true,

  -- Basic settings
  respond_to_all_dms BOOLEAN DEFAULT true,
  require_approval_for_actions BOOLEAN DEFAULT false,
  messages_per_user_per_hour INTEGER DEFAULT 10,

  -- Channels
  daily_standup_channel TEXT,
  creator_ops_channel TEXT,
  escalation_channel TEXT,

  -- AI Model settings
  ai_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  ai_temperature NUMERIC(3,2) DEFAULT 0.7,
  ai_max_tokens INTEGER DEFAULT 4096,
  response_style TEXT DEFAULT 'balanced', -- concise, balanced, detailed

  -- Automated outreach
  enable_sms_outreach BOOLEAN DEFAULT false,
  enable_email_outreach BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bri_settings_updated_at ON bri_settings;
CREATE TRIGGER update_bri_settings_updated_at
  BEFORE UPDATE ON bri_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE bri_settings IS 'Global settings for Bri AI agent';
