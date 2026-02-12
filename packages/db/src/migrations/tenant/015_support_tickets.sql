-- Support Tickets System
-- Phase 2SP-TICKETS: Complete ticket management with SLA tracking

-- Ticket status enum
DO $$ BEGIN
  CREATE TYPE support_ticket_status AS ENUM ('open', 'pending', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ticket priority enum
DO $$ BEGIN
  CREATE TYPE support_ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ticket channel enum
DO $$ BEGIN
  CREATE TYPE support_ticket_channel AS ENUM ('email', 'chat', 'phone', 'form', 'sms');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Support agent role enum
DO $$ BEGIN
  CREATE TYPE support_agent_role AS ENUM ('agent', 'lead', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comment author type enum
DO $$ BEGIN
  CREATE TYPE ticket_comment_author_type AS ENUM ('agent', 'customer', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Support agents (tenant team members with support role)
CREATE TABLE IF NOT EXISTS support_agents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,

  role support_agent_role NOT NULL DEFAULT 'agent',

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,

  max_tickets INTEGER NOT NULL DEFAULT 20,
  current_ticket_count INTEGER NOT NULL DEFAULT 0,

  skills TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on support_agents
DROP TRIGGER IF EXISTS update_support_agents_updated_at ON support_agents;
CREATE TRIGGER update_support_agents_updated_at
  BEFORE UPDATE ON support_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for support_agents
CREATE INDEX IF NOT EXISTS idx_support_agents_user_id ON support_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agents_email ON support_agents(email);
CREATE INDEX IF NOT EXISTS idx_support_agents_active_online ON support_agents(is_active, is_online);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_agents_user_unique ON support_agents(user_id);

-- Ticket number counter (atomic sequential numbering per tenant)
CREATE TABLE IF NOT EXISTS support_ticket_counter (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Initialize counter
INSERT INTO support_ticket_counter (id, last_number) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_number VARCHAR(20) NOT NULL UNIQUE,

  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,

  status support_ticket_status NOT NULL DEFAULT 'open',
  priority support_ticket_priority NOT NULL DEFAULT 'normal',

  channel support_ticket_channel NOT NULL DEFAULT 'form',

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),

  assigned_to TEXT REFERENCES support_agents(id) ON DELETE SET NULL,

  tags TEXT[] NOT NULL DEFAULT '{}',

  -- SLA tracking
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
  first_response_at TIMESTAMPTZ,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- AI analysis
  sentiment_score DECIMAL(3,2),

  -- Conversation link (for chat-originated tickets)
  conversation_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on support_tickets
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla ON support_tickets(sla_breached, sla_deadline);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_channel ON support_tickets(channel);

-- Ticket comments (agent/customer/system messages)
CREATE TABLE IF NOT EXISTS ticket_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,
  author_type ticket_comment_author_type NOT NULL,

  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,

  attachments TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ticket_comments
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author_id ON ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at);

-- Sentiment alerts (auto-generated for negative sentiment)
CREATE TABLE IF NOT EXISTS sentiment_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  sentiment_score DECIMAL(3,2) NOT NULL,
  trigger_reason TEXT,

  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sentiment_alerts
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_ticket_id ON sentiment_alerts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_acknowledged ON sentiment_alerts(acknowledged);

-- Ticket audit log
CREATE TABLE IF NOT EXISTS ticket_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,

  old_value JSONB,
  new_value JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ticket_audit_log
CREATE INDEX IF NOT EXISTS idx_ticket_audit_log_ticket_id ON ticket_audit_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_log_actor_id ON ticket_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_log_created_at ON ticket_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_log_action ON ticket_audit_log(action);

-- SLA configuration table
CREATE TABLE IF NOT EXISTS support_sla_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  priority support_ticket_priority NOT NULL UNIQUE,

  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on support_sla_config
DROP TRIGGER IF EXISTS update_support_sla_config_updated_at ON support_sla_config;
CREATE TRIGGER update_support_sla_config_updated_at
  BEFORE UPDATE ON support_sla_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SLA configuration
INSERT INTO support_sla_config (priority, first_response_minutes, resolution_minutes) VALUES
  ('urgent', 60, 240),      -- 1 hour / 4 hours
  ('high', 240, 1440),      -- 4 hours / 24 hours
  ('normal', 1440, 4320),   -- 24 hours / 72 hours
  ('low', 4320, 10080)      -- 72 hours / 1 week
ON CONFLICT (priority) DO NOTHING;

-- Function to generate next ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INTEGER;
BEGIN
  UPDATE support_ticket_counter
  SET last_number = last_number + 1
  WHERE id = 1
  RETURNING last_number INTO next_num;

  RETURN 'TKT-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE support_agents IS 'Support team agents with capacity tracking';
COMMENT ON TABLE support_tickets IS 'Customer support tickets with SLA tracking';
COMMENT ON TABLE ticket_comments IS 'Comments and replies on support tickets';
COMMENT ON TABLE sentiment_alerts IS 'Alerts for negative sentiment requiring attention';
COMMENT ON TABLE ticket_audit_log IS 'Audit trail for all ticket changes';
COMMENT ON TABLE support_sla_config IS 'SLA configuration per priority level';
COMMENT ON TABLE support_ticket_counter IS 'Atomic counter for ticket number generation';
COMMENT ON FUNCTION generate_ticket_number IS 'Generates unique sequential ticket numbers (TKT-000001)';
