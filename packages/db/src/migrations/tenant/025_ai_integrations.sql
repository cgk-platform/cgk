-- AI Agent Integrations: Slack, Google Calendar, Email, SMS
-- Phase: PHASE-2AI-INTEGRATIONS

-- ============================================================================
-- SLACK INTEGRATION
-- ============================================================================

-- Per-tenant Slack app configuration
CREATE TABLE IF NOT EXISTS tenant_slack_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- App credentials (encrypted)
  slack_client_id TEXT NOT NULL,
  slack_client_secret_encrypted TEXT NOT NULL,
  slack_signing_secret_encrypted TEXT NOT NULL,
  slack_app_id TEXT,

  -- OAuth tokens (encrypted)
  slack_bot_token_encrypted TEXT,
  slack_user_token_encrypted TEXT,
  slack_bot_user_id TEXT,

  -- Workspace info
  slack_team_id TEXT,
  slack_team_name TEXT,

  -- Configuration
  enabled BOOLEAN DEFAULT true,
  default_agent_id TEXT REFERENCES ai_agents(id) ON DELETE SET NULL,

  -- Channel mappings: {"C123456": {"agent_id": "...", "respond_to_mentions": true}}
  channel_config JSONB DEFAULT '{}',

  installed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: Only one config row per tenant schema enforced at application level

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tenant_slack_config_updated_at ON tenant_slack_config;
CREATE TRIGGER update_tenant_slack_config_updated_at
  BEFORE UPDATE ON tenant_slack_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE tenant_slack_config IS 'Slack workspace integration configuration';
COMMENT ON COLUMN tenant_slack_config.channel_config IS 'Channel-specific agent routing and behavior config';

-- Per-agent Slack app (for multi-agent setups)
CREATE TABLE IF NOT EXISTS agent_slack_apps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- App credentials (encrypted)
  slack_client_id TEXT,
  slack_client_secret_encrypted TEXT,
  slack_app_id TEXT,
  slack_app_name TEXT,
  slack_bot_user_id TEXT,

  -- Tokens (encrypted)
  bot_token_encrypted TEXT,
  app_token_encrypted TEXT,
  signing_secret_encrypted TEXT,

  -- Manifest
  manifest_json JSONB,
  manifest_version INTEGER DEFAULT 1,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, active, error, disabled
  last_verified_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_slack_app UNIQUE(agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_slack_apps_status ON agent_slack_apps(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_slack_apps_updated_at ON agent_slack_apps;
CREATE TRIGGER update_agent_slack_apps_updated_at
  BEFORE UPDATE ON agent_slack_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_slack_apps IS 'Per-agent Slack app configurations for multi-agent setups';

-- Slack user associations (link Slack users to platform users)
CREATE TABLE IF NOT EXISTS slack_user_associations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Slack user
  slack_user_id TEXT NOT NULL,
  slack_username TEXT,
  slack_display_name TEXT,
  slack_email TEXT,

  -- Platform user
  platform_user_id TEXT,            -- Linked platform user ID
  creator_id TEXT,                  -- Linked creator ID

  -- Association method
  association_method TEXT,          -- auto (email match), manual, verified
  associated_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,

  -- Cache
  slack_profile_cached JSONB,
  slack_cached_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_slack_user UNIQUE(slack_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slack_users_email ON slack_user_associations(slack_email) WHERE slack_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slack_users_platform ON slack_user_associations(platform_user_id) WHERE platform_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slack_users_creator ON slack_user_associations(creator_id) WHERE creator_id IS NOT NULL;

COMMENT ON TABLE slack_user_associations IS 'Maps Slack users to platform users/creators';

-- Slack conversation threads
CREATE TABLE IF NOT EXISTS slack_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Slack identifiers
  slack_channel_id TEXT NOT NULL,
  slack_thread_ts TEXT,              -- Thread timestamp (null for channel-level)
  slack_channel_type TEXT,           -- im, mpim, channel, private_channel

  -- Context
  started_by_slack_user_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- State
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  context_summary TEXT,              -- AI-generated summary for context window
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraints via partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_slack_conv_unique_with_thread
  ON slack_conversations(slack_channel_id, slack_thread_ts)
  WHERE slack_thread_ts IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_slack_conv_unique_without_thread
  ON slack_conversations(slack_channel_id)
  WHERE slack_thread_ts IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slack_conversations_agent ON slack_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_slack_conversations_channel ON slack_conversations(slack_channel_id);
CREATE INDEX IF NOT EXISTS idx_slack_conversations_active ON slack_conversations(is_active) WHERE is_active = true;

COMMENT ON TABLE slack_conversations IS 'Tracks Slack conversation threads with agents';

-- ============================================================================
-- GOOGLE CALENDAR INTEGRATION
-- ============================================================================

-- Per-agent Google OAuth tokens
CREATE TABLE IF NOT EXISTS agent_google_oauth (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- OAuth tokens (encrypted)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,

  -- Account info
  google_email TEXT NOT NULL,
  google_account_id TEXT,

  -- Scopes granted
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Calendar watch subscription
  watch_channel_id TEXT,
  watch_resource_id TEXT,
  watch_expiration TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_google_oauth UNIQUE(agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_google_oauth_email ON agent_google_oauth(google_email);
CREATE INDEX IF NOT EXISTS idx_agent_google_oauth_watch ON agent_google_oauth(watch_channel_id) WHERE watch_channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_google_oauth_expiry ON agent_google_oauth(watch_expiration) WHERE watch_expiration IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_google_oauth_updated_at ON agent_google_oauth;
CREATE TRIGGER update_agent_google_oauth_updated_at
  BEFORE UPDATE ON agent_google_oauth
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_google_oauth IS 'Google OAuth tokens for agent calendar access';

-- Calendar events cache
CREATE TABLE IF NOT EXISTS agent_calendar_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Google event ID
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,

  -- Event details
  summary TEXT,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  timezone TEXT,

  -- Meeting info
  meet_link TEXT,
  conference_type TEXT,             -- hangoutsMeet, zoom, etc.

  -- Attendees
  organizer_email TEXT,
  attendees JSONB DEFAULT '[]',     -- Array of {email, responseStatus, displayName}

  -- Status
  status TEXT DEFAULT 'confirmed',  -- confirmed, tentative, cancelled
  is_agent_invited BOOLEAN DEFAULT false,

  -- Sync
  etag TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_calendar_event UNIQUE(agent_id, google_event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_agent ON agent_calendar_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON agent_calendar_events(agent_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_upcoming ON agent_calendar_events(start_time) WHERE status = 'confirmed';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_calendar_events_updated_at ON agent_calendar_events;
CREATE TRIGGER update_agent_calendar_events_updated_at
  BEFORE UPDATE ON agent_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_calendar_events IS 'Cached calendar events for agents';

-- ============================================================================
-- EMAIL INTEGRATION
-- ============================================================================

-- Agent email sender configuration
CREATE TABLE IF NOT EXISTS agent_email_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Sender info
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  reply_to_email TEXT,

  -- Inbound handling
  inbound_enabled BOOLEAN DEFAULT false,
  inbound_address TEXT,             -- Dedicated inbound address for this agent

  -- Rate limiting
  max_emails_per_hour INTEGER DEFAULT 50,
  max_emails_per_day INTEGER DEFAULT 500,

  -- Stats
  emails_sent_today INTEGER DEFAULT 0,
  emails_sent_this_hour INTEGER DEFAULT 0,
  last_email_at TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_email_config UNIQUE(agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_email_config_sender ON agent_email_config(sender_email);
CREATE INDEX IF NOT EXISTS idx_agent_email_config_inbound ON agent_email_config(inbound_address) WHERE inbound_address IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_email_config_updated_at ON agent_email_config;
CREATE TRIGGER update_agent_email_config_updated_at
  BEFORE UPDATE ON agent_email_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_email_config IS 'Email sender configuration for AI agents';

-- Email conversations (threads)
CREATE TABLE IF NOT EXISTS agent_email_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Thread identifiers
  thread_id TEXT,                   -- Email thread ID (References/In-Reply-To)
  subject TEXT NOT NULL,

  -- Participants
  contact_email TEXT NOT NULL,
  contact_name TEXT,

  -- Linked entities
  creator_id TEXT,
  platform_user_id TEXT,

  -- State
  last_message_at TIMESTAMPTZ,
  last_direction TEXT,              -- inbound, outbound
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_email_conversations_agent ON agent_email_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_email_conversations_thread ON agent_email_conversations(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_email_conversations_contact ON agent_email_conversations(contact_email);

COMMENT ON TABLE agent_email_conversations IS 'Email conversation threads with agents';

-- ============================================================================
-- SMS INTEGRATION
-- ============================================================================

-- Tenant SMS configuration
CREATE TABLE IF NOT EXISTS tenant_sms_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Provider
  provider TEXT NOT NULL DEFAULT 'twilio',  -- twilio, telnyx, etc.

  -- Twilio credentials (encrypted)
  twilio_account_sid_encrypted TEXT,
  twilio_auth_token_encrypted TEXT,

  -- Phone numbers: [{number, agentId, purpose, messagingServiceSid}]
  phone_numbers JSONB DEFAULT '[]',

  -- Default settings
  default_phone_number TEXT,
  default_agent_id TEXT REFERENCES ai_agents(id) ON DELETE SET NULL,

  enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint - one config per tenant schema
-- One config per tenant enforced at application level

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tenant_sms_config_updated_at ON tenant_sms_config;
CREATE TRIGGER update_tenant_sms_config_updated_at
  BEFORE UPDATE ON tenant_sms_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE tenant_sms_config IS 'SMS provider configuration';

-- SMS conversation threads
CREATE TABLE IF NOT EXISTS agent_sms_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Participants
  agent_phone_number TEXT NOT NULL,
  contact_phone_number TEXT NOT NULL,

  -- Contact info
  contact_id TEXT,                    -- Linked creator/user ID
  contact_name TEXT,

  -- Conversation state
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT,       -- inbound, outbound
  message_count INTEGER DEFAULT 0,

  -- Opt-out status
  opted_out BOOLEAN DEFAULT false,
  opted_out_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_sms_conversation UNIQUE(agent_phone_number, contact_phone_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_conversations_agent ON agent_sms_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_contact ON agent_sms_conversations(contact_phone_number);

COMMENT ON TABLE agent_sms_conversations IS 'SMS conversation threads with agents';

-- SMS messages
CREATE TABLE IF NOT EXISTS agent_sms_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  conversation_id TEXT NOT NULL REFERENCES agent_sms_conversations(id) ON DELETE CASCADE,

  -- Message details
  direction TEXT NOT NULL,            -- inbound, outbound
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Media (MMS)
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Provider info
  provider_message_id TEXT,
  status TEXT DEFAULT 'sent',         -- queued, sent, delivered, failed, undelivered
  error_code TEXT,
  error_message TEXT,

  -- AI processing
  agent_response_to TEXT,             -- Message ID this is responding to

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation ON agent_sms_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_provider ON agent_sms_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON agent_sms_messages(created_at DESC);

COMMENT ON TABLE agent_sms_messages IS 'Individual SMS messages';

-- ============================================================================
-- UNIFIED EVENT ROUTING
-- ============================================================================

-- Integration event queue (for async processing)
CREATE TABLE IF NOT EXISTS integration_event_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Event source
  channel TEXT NOT NULL,              -- slack, google_calendar, email, sms
  event_type TEXT NOT NULL,           -- message, mention, calendar_change, etc.

  -- Routing
  agent_id TEXT REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Payload
  raw_payload JSONB NOT NULL,
  processed_payload JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,

  -- Timing
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_events_pending ON integration_event_queue(status, next_retry_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_integration_events_channel ON integration_event_queue(channel, event_type);
CREATE INDEX IF NOT EXISTS idx_integration_events_agent ON integration_event_queue(agent_id) WHERE agent_id IS NOT NULL;

COMMENT ON TABLE integration_event_queue IS 'Queue for incoming integration events';

-- Channel rate limiting
CREATE TABLE IF NOT EXISTS channel_rate_limits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,              -- slack, google_calendar, email, sms

  -- Rate limits
  max_per_minute INTEGER DEFAULT 10,
  max_per_hour INTEGER DEFAULT 100,
  max_per_day INTEGER DEFAULT 1000,

  -- Current counts
  count_this_minute INTEGER DEFAULT 0,
  count_this_hour INTEGER DEFAULT 0,
  count_this_day INTEGER DEFAULT 0,

  -- Reset timestamps
  minute_reset_at TIMESTAMPTZ DEFAULT NOW(),
  hour_reset_at TIMESTAMPTZ DEFAULT NOW(),
  day_reset_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_channel_rate_limit UNIQUE(agent_id, channel)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_channel_rate_limits_updated_at ON channel_rate_limits;
CREATE TRIGGER update_channel_rate_limits_updated_at
  BEFORE UPDATE ON channel_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE channel_rate_limits IS 'Per-agent per-channel rate limiting';
