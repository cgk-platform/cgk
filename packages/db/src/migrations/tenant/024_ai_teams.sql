-- Migration: AI Teams, Org Chart, Relationships, and Handoffs
-- Phase: PHASE-2AI-TEAMS

-- ============================================================================
-- AI Teams
-- ============================================================================

-- AI teams (groups of agents)
CREATE TABLE IF NOT EXISTS ai_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Team identity
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,                           -- What area this team handles

  -- Slack integration
  slack_channel_id TEXT,
  slack_channel_name TEXT,

  -- Leadership
  supervisor_type TEXT,                  -- 'ai' or 'human'
  supervisor_id TEXT,                    -- Agent ID or user ID
  supervisor_slack_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ai_teams_tenant ON ai_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_teams_domain ON ai_teams(tenant_id, domain);
CREATE INDEX IF NOT EXISTS idx_ai_teams_slack ON ai_teams(slack_channel_id);

-- ============================================================================
-- Team Membership
-- ============================================================================

-- Team roster
CREATE TABLE IF NOT EXISTS ai_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES ai_teams(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Role in team
  role TEXT NOT NULL DEFAULT 'member',   -- lead, member, specialist
  slack_user_id TEXT,                    -- Agent's Slack bot user ID

  -- Specializations
  specializations TEXT[] DEFAULT ARRAY[]::TEXT[],

  joined_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(team_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON ai_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_agent ON ai_team_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON ai_team_members(tenant_id);

-- ============================================================================
-- Unified Org Chart
-- ============================================================================

-- Combined org chart (humans + AI)
CREATE TABLE IF NOT EXISTS org_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Entity reference
  employee_type TEXT NOT NULL,           -- 'ai' or 'human'
  employee_id TEXT NOT NULL,             -- Agent ID or user ID

  -- Reporting relationship
  reports_to_type TEXT,                  -- 'ai' or 'human'
  reports_to_id TEXT,                    -- Manager's ID

  -- Organizational info
  level INTEGER DEFAULT 0,               -- Depth in hierarchy (0 = top)
  department TEXT,
  team TEXT,

  -- Display
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, employee_type, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_org_chart_tenant ON org_chart(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_reports_to ON org_chart(tenant_id, reports_to_type, reports_to_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_level ON org_chart(tenant_id, level);

-- ============================================================================
-- Agent Relationships
-- ============================================================================

-- Familiarity between agents and people
CREATE TABLE IF NOT EXISTS agent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Who the relationship is with
  person_type TEXT NOT NULL,             -- 'team_member', 'creator', 'contact'
  person_id TEXT NOT NULL,

  -- Relationship metrics
  familiarity_score DECIMAL(3,2) DEFAULT 0.0,  -- 0 to 1
  trust_level DECIMAL(3,2) DEFAULT 0.5,        -- 0 to 1
  interaction_count INTEGER DEFAULT 0,
  total_conversation_minutes INTEGER DEFAULT 0,

  -- Context
  last_interaction_at TIMESTAMPTZ,
  communication_preferences JSONB DEFAULT '{}',
  /*
  {
    "preferred_channel": "slack",
    "response_style": "concise",
    "topics_discussed": ["projects", "deadlines"]
  }
  */
  relationship_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(agent_id, person_type, person_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_agent ON agent_relationships(agent_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person ON agent_relationships(tenant_id, person_type, person_id);
CREATE INDEX IF NOT EXISTS idx_relationships_familiarity ON agent_relationships(agent_id, familiarity_score DESC);

-- ============================================================================
-- Agent-to-Agent Communication
-- ============================================================================

-- Inter-agent Slack messages
CREATE TABLE IF NOT EXISTS agent_slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Slack identifiers
  slack_message_ts TEXT NOT NULL,
  slack_channel_id TEXT NOT NULL,

  -- Sender/Receiver
  from_agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  to_agent_id TEXT REFERENCES ai_agents(id) ON DELETE SET NULL,  -- NULL = broadcast

  -- Message details
  message_type TEXT NOT NULL,            -- status, question, handoff, task, response
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',            -- Additional context

  -- For handoffs
  handoff_conversation_id TEXT,
  handoff_accepted BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_tenant ON agent_slack_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_from ON agent_slack_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_to ON agent_slack_messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_type ON agent_slack_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_agent_messages_slack ON agent_slack_messages(slack_message_ts, slack_channel_id);

-- ============================================================================
-- Handoffs
-- ============================================================================

-- Conversation handoffs between agents
CREATE TABLE IF NOT EXISTS agent_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Participants
  from_agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  to_agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Conversation context
  conversation_id TEXT NOT NULL,
  channel TEXT NOT NULL,                 -- slack, email, sms
  channel_id TEXT,                       -- Slack channel, email thread, etc.

  -- Reason and context
  reason TEXT NOT NULL,
  context_summary TEXT,
  key_points JSONB DEFAULT '[]',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, completed
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_tenant ON agent_handoffs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_from ON agent_handoffs(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_to ON agent_handoffs(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON agent_handoffs(status);
CREATE INDEX IF NOT EXISTS idx_handoffs_conversation ON agent_handoffs(conversation_id);

-- ============================================================================
-- Conversation Log (for handoff context)
-- ============================================================================

-- Store conversation messages for handoff context
CREATE TABLE IF NOT EXISTS agent_conversation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Conversation reference
  conversation_id TEXT NOT NULL,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Message details
  role TEXT NOT NULL,                    -- 'user' or 'agent'
  content TEXT NOT NULL,

  -- Metadata
  channel TEXT,                          -- slack, email, sms, etc.
  channel_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_log_tenant ON agent_conversation_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_log_conversation ON agent_conversation_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_log_agent ON agent_conversation_log(agent_id);
