-- Support Channels: Chat, CSAT, and Privacy
-- Phase 2SP-CHANNELS: Multi-channel support with CSAT surveys and GDPR/CCPA compliance

-- Chat session status enum
DO $$ BEGIN
  CREATE TYPE chat_session_status AS ENUM ('waiting', 'active', 'ended', 'transferred');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Chat message sender type enum
DO $$ BEGIN
  CREATE TYPE chat_sender_type AS ENUM ('visitor', 'agent', 'bot');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Chat widget position enum
DO $$ BEGIN
  CREATE TYPE chat_widget_position AS ENUM ('bottom-right', 'bottom-left');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CSAT survey channel enum
DO $$ BEGIN
  CREATE TYPE csat_channel AS ENUM ('email', 'sms', 'in_app');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Privacy request type enum
DO $$ BEGIN
  CREATE TYPE privacy_request_type AS ENUM ('export', 'delete', 'do_not_sell', 'disclosure');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Privacy request status enum
DO $$ BEGIN
  CREATE TYPE privacy_request_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Privacy verification method enum
DO $$ BEGIN
  CREATE TYPE privacy_verification_method AS ENUM ('email', 'phone', 'identity');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Consent type enum
DO $$ BEGIN
  CREATE TYPE consent_type AS ENUM ('marketing', 'analytics', 'third_party', 'data_processing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  conversation_id TEXT,

  visitor_id VARCHAR(100) NOT NULL,
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),

  page_url TEXT,
  referrer_url TEXT,

  status chat_session_status NOT NULL DEFAULT 'waiting',

  assigned_agent_id TEXT REFERENCES support_agents(id) ON DELETE SET NULL,
  queue_position INTEGER,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  wait_time_seconds INTEGER,
  duration_seconds INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor ON chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_waiting ON chat_sessions(status, created_at) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(status) WHERE status = 'active';

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

  sender_id VARCHAR(100) NOT NULL,
  sender_type chat_sender_type NOT NULL,

  content TEXT NOT NULL,
  attachments TEXT[] NOT NULL DEFAULT '{}',

  is_read BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(session_id, is_read) WHERE NOT is_read;

-- Chat widget configuration (single row per tenant)
CREATE TABLE IF NOT EXISTS chat_widget_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  primary_color VARCHAR(7) NOT NULL DEFAULT '#374d42',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#3d3d3d',
  header_text VARCHAR(255) NOT NULL DEFAULT 'Chat with us',
  greeting_message TEXT NOT NULL DEFAULT 'Hi! How can we help you today?',

  position chat_widget_position NOT NULL DEFAULT 'bottom-right',
  offset_x INTEGER NOT NULL DEFAULT 20,
  offset_y INTEGER NOT NULL DEFAULT 20,

  auto_open_delay_seconds INTEGER,

  show_agent_typing BOOLEAN NOT NULL DEFAULT TRUE,
  show_read_receipts BOOLEAN NOT NULL DEFAULT TRUE,

  business_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  business_hours JSONB,
  offline_message TEXT NOT NULL DEFAULT 'We''re currently offline. Leave a message!',

  file_upload_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_file_size_mb INTEGER NOT NULL DEFAULT 10,
  allowed_file_types TEXT[] NOT NULL DEFAULT ARRAY['image/*', 'application/pdf'],

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on chat_widget_config
DROP TRIGGER IF EXISTS update_chat_widget_config_updated_at ON chat_widget_config;
CREATE TRIGGER update_chat_widget_config_updated_at
  BEFORE UPDATE ON chat_widget_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize widget config
INSERT INTO chat_widget_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- CSAT surveys
CREATE TABLE IF NOT EXISTS csat_surveys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  ticket_id TEXT REFERENCES support_tickets(id) ON DELETE SET NULL,
  conversation_id TEXT,

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,

  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  feedback TEXT,

  agent_id TEXT REFERENCES support_agents(id) ON DELETE SET NULL,

  channel csat_channel NOT NULL DEFAULT 'email',

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for csat_surveys
CREATE INDEX IF NOT EXISTS idx_csat_surveys_ticket ON csat_surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_agent ON csat_surveys(agent_id);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_customer ON csat_surveys(customer_email);
CREATE INDEX IF NOT EXISTS idx_csat_surveys_responded ON csat_surveys(responded_at) WHERE responded_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_csat_surveys_pending ON csat_surveys(expires_at) WHERE responded_at IS NULL;

-- Daily CSAT metrics (aggregated)
CREATE TABLE IF NOT EXISTS csat_metrics_daily (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  metric_date DATE NOT NULL UNIQUE,

  surveys_sent INTEGER NOT NULL DEFAULT 0,
  surveys_responded INTEGER NOT NULL DEFAULT 0,
  total_rating INTEGER NOT NULL DEFAULT 0,
  avg_rating DECIMAL(3,2),

  rating_1_count INTEGER NOT NULL DEFAULT 0,
  rating_2_count INTEGER NOT NULL DEFAULT 0,
  rating_3_count INTEGER NOT NULL DEFAULT 0,
  rating_4_count INTEGER NOT NULL DEFAULT 0,
  rating_5_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for csat_metrics_daily
CREATE INDEX IF NOT EXISTS idx_csat_metrics_date ON csat_metrics_daily(metric_date);

-- Privacy requests (GDPR/CCPA)
CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,

  request_type privacy_request_type NOT NULL,

  status privacy_request_status NOT NULL DEFAULT 'pending',

  verified_at TIMESTAMPTZ,
  verification_method privacy_verification_method,

  processed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,

  result_url TEXT,
  rejection_reason TEXT,
  notes TEXT,

  deadline_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on privacy_requests
DROP TRIGGER IF EXISTS update_privacy_requests_updated_at ON privacy_requests;
CREATE TRIGGER update_privacy_requests_updated_at
  BEFORE UPDATE ON privacy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for privacy_requests
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_deadline ON privacy_requests(deadline_at);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_customer ON privacy_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_pending ON privacy_requests(status, deadline_at) WHERE status = 'pending' OR status = 'processing';
CREATE INDEX IF NOT EXISTS idx_privacy_requests_overdue ON privacy_requests(deadline_at) WHERE status IN ('pending', 'processing');

-- Consent records
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  customer_id VARCHAR(100),
  customer_email VARCHAR(255) NOT NULL,

  consent_type consent_type NOT NULL,

  granted BOOLEAN NOT NULL,
  source VARCHAR(100),
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Indexes for consent_records
CREATE INDEX IF NOT EXISTS idx_consent_records_customer ON consent_records(customer_email);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_active ON consent_records(customer_email, consent_type) WHERE revoked_at IS NULL;

-- CSAT configuration table
CREATE TABLE IF NOT EXISTS csat_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_send_on_resolution BOOLEAN NOT NULL DEFAULT TRUE,
  delay_hours INTEGER NOT NULL DEFAULT 1,
  expiry_days INTEGER NOT NULL DEFAULT 7,

  default_channel csat_channel NOT NULL DEFAULT 'email',

  -- Survey customization
  rating_question TEXT NOT NULL DEFAULT 'How would you rate your support experience?',
  feedback_prompt TEXT NOT NULL DEFAULT 'Any additional feedback?',

  -- Thresholds for alerting
  low_rating_threshold INTEGER NOT NULL DEFAULT 2,
  alert_on_low_rating BOOLEAN NOT NULL DEFAULT TRUE,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on csat_config
DROP TRIGGER IF EXISTS update_csat_config_updated_at ON csat_config;
CREATE TRIGGER update_csat_config_updated_at
  BEFORE UPDATE ON csat_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize CSAT config
INSERT INTO csat_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON TABLE chat_sessions IS 'Live chat sessions between visitors and agents';
COMMENT ON TABLE chat_messages IS 'Messages within chat sessions';
COMMENT ON TABLE chat_widget_config IS 'Configuration for the embeddable chat widget';
COMMENT ON TABLE csat_surveys IS 'Customer satisfaction surveys linked to tickets';
COMMENT ON TABLE csat_metrics_daily IS 'Aggregated daily CSAT metrics for reporting';
COMMENT ON TABLE csat_config IS 'CSAT feature configuration per tenant';
COMMENT ON TABLE privacy_requests IS 'GDPR/CCPA data requests from customers';
COMMENT ON TABLE consent_records IS 'Customer consent records for compliance tracking';
