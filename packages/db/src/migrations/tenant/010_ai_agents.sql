-- AI Agents tables for BRII (Business Relationships & Interaction Intelligence)
-- Phase: PHASE-2AI-CORE

-- Agent status enum
DO $$ BEGIN
  CREATE TYPE ai_agent_status AS ENUM ('active', 'paused', 'training', 'retired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Autonomy level enum
DO $$ BEGIN
  CREATE TYPE autonomy_level AS ENUM ('autonomous', 'suggest_and_confirm', 'human_required');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Approval status enum
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'timeout', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AI Agents (one per tenant, or multiple for AI teams)
CREATE TABLE IF NOT EXISTS ai_agents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Identity
  name TEXT NOT NULL,                    -- e.g., 'bri'
  display_name TEXT NOT NULL,            -- e.g., 'Bri Wilder'
  email TEXT,                            -- e.g., 'bri@tenant.com'
  role TEXT NOT NULL,                    -- e.g., 'Creator Pipeline Operations Agent'
  avatar_url TEXT,

  -- Status
  status ai_agent_status NOT NULL DEFAULT 'active',
  is_primary BOOLEAN DEFAULT false,      -- Primary agent for tenant

  -- AI Configuration
  ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  ai_temperature NUMERIC(3,2) DEFAULT 0.7,
  ai_max_tokens INTEGER DEFAULT 4096,

  -- Capabilities
  capabilities TEXT[] DEFAULT ARRAY['slack', 'email'],
  tool_access TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Which MCP tools can this agent use

  -- Relationships
  manager_agent_id TEXT REFERENCES ai_agents(id),
  human_manager_id TEXT,                 -- Reference to team member

  -- Connected accounts (encrypted)
  connected_accounts JSONB DEFAULT '{}', -- OAuth tokens for various services

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agents_name_unique ON ai_agents(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agents_email_unique ON ai_agents(email) WHERE email IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_primary ON ai_agents(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_created_at ON ai_agents(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE ai_agents IS 'AI Agent configurations for BRII system';
COMMENT ON COLUMN ai_agents.is_primary IS 'Primary agent for the tenant';
COMMENT ON COLUMN ai_agents.ai_temperature IS 'Model temperature (0.0-1.0)';

-- Agent personality configuration
CREATE TABLE IF NOT EXISTS agent_personality (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- 6 Core Traits (0.0 to 1.0 scale)
  trait_formality NUMERIC(3,2) DEFAULT 0.5,      -- Casual <-> Formal
  trait_verbosity NUMERIC(3,2) DEFAULT 0.5,      -- Concise <-> Detailed
  trait_proactivity NUMERIC(3,2) DEFAULT 0.7,    -- Reactive <-> Proactive
  trait_humor NUMERIC(3,2) DEFAULT 0.3,          -- Serious <-> Playful
  trait_emoji_usage NUMERIC(3,2) DEFAULT 0.2,    -- None <-> Frequent
  trait_assertiveness NUMERIC(3,2) DEFAULT 0.5,  -- Deferential <-> Assertive

  -- Customization
  preferred_greeting TEXT,                        -- e.g., 'Hey there!'
  signature TEXT,                                 -- e.g., '- Bri'
  go_to_emojis TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Behavioral controls
  always_confirm_actions BOOLEAN DEFAULT false,
  offer_alternatives BOOLEAN DEFAULT true,
  explain_reasoning BOOLEAN DEFAULT true,

  -- Templates
  custom_greeting_templates JSONB DEFAULT '[]',   -- Array of greeting variations
  custom_error_templates JSONB DEFAULT '[]',      -- How to handle errors
  forbidden_topics TEXT[] DEFAULT ARRAY[]::TEXT[], -- Topics to avoid

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_personality UNIQUE(agent_id)
);

-- Indexes for agent_personality
CREATE INDEX IF NOT EXISTS idx_agent_personality_agent_id ON agent_personality(agent_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_personality_updated_at ON agent_personality;
CREATE TRIGGER update_agent_personality_updated_at
  BEFORE UPDATE ON agent_personality
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_personality IS 'Configurable personality traits for AI agents';
COMMENT ON COLUMN agent_personality.trait_formality IS 'Casual (0) to Formal (1)';
COMMENT ON COLUMN agent_personality.trait_verbosity IS 'Concise (0) to Detailed (1)';

-- Agent autonomy settings (global limits)
CREATE TABLE IF NOT EXISTS agent_autonomy_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Global limits
  max_actions_per_hour INTEGER DEFAULT 100,
  max_cost_per_day NUMERIC(10,2) DEFAULT 50.00,  -- API spend limit
  require_human_for_high_value NUMERIC(10,2) DEFAULT 1000.00,

  -- Learning settings
  adapt_to_feedback BOOLEAN DEFAULT true,
  track_success_patterns BOOLEAN DEFAULT true,
  adjust_to_user_preferences BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_autonomy UNIQUE(agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_autonomy_agent_id ON agent_autonomy_settings(agent_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_autonomy_settings_updated_at ON agent_autonomy_settings;
CREATE TRIGGER update_agent_autonomy_settings_updated_at
  BEFORE UPDATE ON agent_autonomy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_autonomy_settings IS 'Global autonomy limits for AI agents';

-- Per-action autonomy configuration
CREATE TABLE IF NOT EXISTS agent_action_autonomy (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL,              -- e.g., 'send_message', 'approve_payout'
  autonomy_level autonomy_level NOT NULL, -- autonomous, suggest_and_confirm, human_required

  -- Limits
  enabled BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  max_per_day INTEGER,
  cooldown_hours NUMERIC(5,2),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_action_type UNIQUE(agent_id, action_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_action_autonomy_agent ON agent_action_autonomy(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_autonomy_type ON agent_action_autonomy(action_type);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_action_autonomy_updated_at ON agent_action_autonomy;
CREATE TRIGGER update_agent_action_autonomy_updated_at
  BEFORE UPDATE ON agent_action_autonomy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE agent_action_autonomy IS 'Per-action autonomy levels for AI agents';

-- Complete audit trail of agent actions
CREATE TABLE IF NOT EXISTS agent_action_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL,
  action_category TEXT,                   -- messaging, content, finance, etc.
  action_description TEXT NOT NULL,

  -- Data
  input_data JSONB,
  output_data JSONB,
  tools_used TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Related entities
  creator_id TEXT,
  project_id TEXT,
  conversation_id TEXT,

  -- Approval workflow
  required_approval BOOLEAN DEFAULT false,
  approval_status approval_status,
  approved_by TEXT,                       -- User ID who approved
  approved_at TIMESTAMPTZ,

  -- Result
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Visibility
  visible_to_creator BOOLEAN DEFAULT false,
  visible_in_dashboard BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for agent_action_log
CREATE INDEX IF NOT EXISTS idx_action_log_agent ON agent_action_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_action_log_type ON agent_action_log(action_type);
CREATE INDEX IF NOT EXISTS idx_action_log_created ON agent_action_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_log_creator ON agent_action_log(creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_log_project ON agent_action_log(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_log_pending ON agent_action_log(approval_status) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_action_log_category ON agent_action_log(action_category) WHERE action_category IS NOT NULL;

COMMENT ON TABLE agent_action_log IS 'Complete audit trail of AI agent actions';

-- Queue for actions awaiting human approval
CREATE TABLE IF NOT EXISTS agent_approval_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  action_log_id TEXT REFERENCES agent_action_log(id),

  -- Request details
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  reason TEXT,                            -- Why agent wants to do this

  -- Approval routing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approver_type TEXT,                     -- human, ai (for escalation)
  approver_id TEXT,                       -- Who should approve

  -- Response
  status approval_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  response_note TEXT,

  -- Slack integration
  slack_message_ts TEXT,
  slack_channel_id TEXT,

  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for approval requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_agent ON agent_approval_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_pending ON agent_approval_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON agent_approval_requests(approver_id) WHERE approver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_requests_expires ON agent_approval_requests(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approval_requests_created ON agent_approval_requests(created_at DESC);

COMMENT ON TABLE agent_approval_requests IS 'Queue for agent actions awaiting human approval';
