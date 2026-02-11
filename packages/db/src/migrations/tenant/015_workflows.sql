-- PHASE-2H-WORKFLOWS: Workflow Automation Engine tables
-- Migration: 015_workflows
-- Scope: Tenant schema

-- ============================================================
-- Workflow trigger type enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE workflow_trigger_type AS ENUM (
    'status_change',
    'time_elapsed',
    'scheduled',
    'event',
    'manual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Workflow action type enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE workflow_action_type AS ENUM (
    'send_message',
    'send_notification',
    'slack_notify',
    'suggest_action',
    'schedule_followup',
    'update_status',
    'update_field',
    'create_task',
    'assign_to',
    'webhook',
    'generate_report'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Workflow execution result enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE workflow_execution_result AS ENUM (
    'success',
    'partial',
    'failed',
    'skipped',
    'pending_approval'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Scheduled action status enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE scheduled_action_status AS ENUM (
    'pending',
    'executed',
    'cancelled',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Contact type enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_contact_type AS ENUM (
    'creator',
    'customer',
    'vendor',
    'partner',
    'team_member',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Thread type enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_thread_type AS ENUM (
    'general',
    'project',
    'support',
    'onboarding'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Thread status enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_thread_status AS ENUM (
    'open',
    'snoozed',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Thread priority enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_thread_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Message direction enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_message_direction AS ENUM (
    'inbound',
    'outbound'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Message channel enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_message_channel AS ENUM (
    'sms',
    'email',
    'slack',
    'internal'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Message sender type enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_sender_type AS ENUM (
    'contact',
    'team_member',
    'system',
    'ai'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Message status enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE inbox_message_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'read',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Workflow Rules Table
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule metadata
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 10, -- Higher = runs first

  -- Trigger configuration
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL, -- Type-specific config

  -- Conditions (all must pass)
  conditions JSONB DEFAULT '[]', -- Array of {field, operator, value}

  -- Actions to execute
  actions JSONB NOT NULL, -- Array of action definitions

  -- Execution limits
  cooldown_hours INTEGER, -- Minimum hours between executions
  max_executions INTEGER, -- Maximum total executions per entity

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approver_role TEXT, -- Role required to approve

  -- Scope (what entities this rule applies to)
  entity_types TEXT[] DEFAULT '{}', -- project, task, order, creator

  -- Ownership
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_active ON workflow_rules(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger ON workflow_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_entity_types ON workflow_rules USING GIN(entity_types);

-- ============================================================
-- Workflow Executions Table (Audit Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,

  -- Context
  entity_type TEXT NOT NULL, -- project, task, order, creator
  entity_id UUID NOT NULL,

  -- Trigger data
  trigger_data JSONB NOT NULL, -- What triggered this execution

  -- Condition evaluation
  conditions_evaluated JSONB, -- Result of each condition check
  conditions_passed BOOLEAN,

  -- Action results
  actions_taken JSONB, -- Result of each action

  -- Result
  result workflow_execution_result NOT NULL,
  error_message TEXT,

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_exec_rule ON workflow_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_entity ON workflow_executions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_pending ON workflow_executions(result) WHERE result = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_workflow_exec_time ON workflow_executions(started_at DESC);

-- ============================================================
-- Scheduled Actions Table (Delayed Execution)
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  rule_id UUID REFERENCES workflow_rules(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,

  -- Context
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Action details
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Cancellation conditions
  cancel_if JSONB, -- Conditions that cancel this action
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Status
  status scheduled_action_status DEFAULT 'pending',
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_actions_pending ON scheduled_actions(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_entity ON scheduled_actions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_status ON scheduled_actions(status);

-- ============================================================
-- Entity Workflow State Table (Tracks execution count per rule per entity)
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_workflow_state (
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,

  execution_count INTEGER DEFAULT 0,
  last_execution_at TIMESTAMPTZ,
  last_execution_id UUID,

  -- Rule-specific state data
  state_data JSONB DEFAULT '{}',

  PRIMARY KEY (entity_type, entity_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_workflow_state_rule ON entity_workflow_state(rule_id);

-- ============================================================
-- Smart Inbox: Contacts Table
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact type & linking
  contact_type inbox_contact_type NOT NULL,
  external_id UUID, -- creator_id, customer_id, etc.

  -- Identity
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  company_role TEXT,
  avatar_url TEXT,

  -- Preferences
  preferred_channel inbox_message_channel DEFAULT 'email',
  timezone TEXT,

  -- Organization
  tags TEXT[] DEFAULT '{}',

  -- Consent (for SMS)
  sms_consent BOOLEAN DEFAULT FALSE,
  sms_consented_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_contacts_type ON inbox_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_external ON inbox_contacts(contact_type, external_id);
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_email ON inbox_contacts(email);
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_phone ON inbox_contacts(phone);

-- ============================================================
-- Smart Inbox: Communication Threads Table
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES inbox_contacts(id) ON DELETE CASCADE,

  -- Thread context
  thread_type inbox_thread_type DEFAULT 'general',
  related_entity_type TEXT, -- project, order, etc.
  related_entity_id UUID,

  -- Display
  subject TEXT,

  -- Status
  status inbox_thread_status DEFAULT 'open',
  snoozed_until TIMESTAMPTZ,
  priority inbox_thread_priority DEFAULT 'normal',

  -- Assignment
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Last message info (denormalized for performance)
  last_message_at TIMESTAMPTZ,
  last_message_sender inbox_sender_type,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,

  -- Organization
  tags TEXT[] DEFAULT '{}',

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- External references (Slack thread, etc.)
  external_thread_id TEXT,
  external_thread_type TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_threads_contact ON inbox_threads(contact_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_status ON inbox_threads(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_assigned ON inbox_threads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_entity ON inbox_threads(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_snoozed ON inbox_threads(snoozed_until) WHERE status = 'snoozed';

-- ============================================================
-- Smart Inbox: Messages Table
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,

  -- Direction
  direction inbox_message_direction NOT NULL,
  channel inbox_message_channel NOT NULL,

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  body_html TEXT,

  -- Sender
  sender_type inbox_sender_type NOT NULL,
  sender_id UUID, -- user_id if team_member

  -- AI draft metadata
  ai_drafted BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),
  ai_was_edited BOOLEAN DEFAULT FALSE,
  original_ai_draft TEXT,

  -- Delivery status (for outbound)
  status inbox_message_status DEFAULT 'pending',
  external_id TEXT, -- Message ID from email/SMS provider
  failed_reason TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread ON inbox_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_channel ON inbox_messages(channel);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_sender ON inbox_messages(sender_type, sender_id);

-- ============================================================
-- AI Drafts Table (for pending AI-generated responses)
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,

  -- Draft content
  body TEXT NOT NULL,
  body_html TEXT,
  suggested_channel inbox_message_channel DEFAULT 'email',

  -- AI metadata
  confidence DECIMAL(3,2),
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, sent, edited_and_sent, discarded
  sent_message_id UUID REFERENCES inbox_messages(id) ON DELETE SET NULL,
  edited_content TEXT,

  -- Timing
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_ai_drafts_thread ON inbox_ai_drafts(thread_id);
CREATE INDEX IF NOT EXISTS idx_inbox_ai_drafts_status ON inbox_ai_drafts(status) WHERE status = 'pending';

-- ============================================================
-- Triggers for updated_at
-- ============================================================

DROP TRIGGER IF EXISTS update_workflow_rules_updated_at ON workflow_rules;
CREATE TRIGGER update_workflow_rules_updated_at
  BEFORE UPDATE ON workflow_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_inbox_contacts_updated_at ON inbox_contacts;
CREATE TRIGGER update_inbox_contacts_updated_at
  BEFORE UPDATE ON inbox_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_inbox_threads_updated_at ON inbox_threads;
CREATE TRIGGER update_inbox_threads_updated_at
  BEFORE UPDATE ON inbox_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE workflow_rules IS 'Workflow automation rules with triggers, conditions, and actions';
COMMENT ON TABLE workflow_executions IS 'Audit log of workflow rule executions';
COMMENT ON TABLE scheduled_actions IS 'Delayed workflow actions pending execution';
COMMENT ON TABLE entity_workflow_state IS 'Tracks execution state per entity per rule for cooldowns and limits';
COMMENT ON TABLE inbox_contacts IS 'Contact directory for Smart Inbox communications';
COMMENT ON TABLE inbox_threads IS 'Communication threads with contacts';
COMMENT ON TABLE inbox_messages IS 'Individual messages within threads';
COMMENT ON TABLE inbox_ai_drafts IS 'AI-generated draft responses pending approval';

COMMENT ON COLUMN workflow_rules.trigger_type IS 'Trigger type: status_change, time_elapsed, scheduled, event, manual';
COMMENT ON COLUMN workflow_rules.priority IS 'Higher priority rules execute first (default 10)';
COMMENT ON COLUMN workflow_rules.cooldown_hours IS 'Minimum hours between executions on same entity';
COMMENT ON COLUMN workflow_rules.max_executions IS 'Maximum total executions per entity (null = unlimited)';
COMMENT ON COLUMN workflow_executions.result IS 'Result: success, partial, failed, skipped, pending_approval';
COMMENT ON COLUMN scheduled_actions.cancel_if IS 'Conditions that will cancel this scheduled action';
COMMENT ON COLUMN inbox_threads.unread_count IS 'Denormalized unread message count for performance';
