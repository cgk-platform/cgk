-- Migration: 067_system_tables
-- Description: Create missing system tables for MCP system tools
-- Phase: MCP Tool Fixes
-- Refs: packages/mcp/src/tools/system.ts

-- =============================================================================
-- tenant_users — Tenant-scoped user records
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES public.users(id),
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(role);
CREATE INDEX IF NOT EXISTS idx_tenant_users_status ON tenant_users(status);

DROP TRIGGER IF EXISTS set_tenant_users_updated_at ON tenant_users;
CREATE TRIGGER set_tenant_users_updated_at
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- notifications — Notification records
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'slack', 'webhook', 'in_app')),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);

DROP TRIGGER IF EXISTS set_notifications_updated_at ON notifications;
CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- system_logs — Structured system logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  service TEXT NOT NULL DEFAULT 'platform',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  request_id TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id) WHERE request_id IS NOT NULL;

-- =============================================================================
-- system_errors — System error tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_errors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL DEFAULT 'runtime',
  message TEXT NOT NULL,
  stack TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_errors_type ON system_errors(type);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON system_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_system_errors_occurred_at ON system_errors(occurred_at DESC);

-- =============================================================================
-- audit_logs — Audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- tenant_config — Tenant configuration key-value store
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_config_key ON tenant_config(key);

DROP TRIGGER IF EXISTS set_tenant_config_updated_at ON tenant_config;
CREATE TRIGGER set_tenant_config_updated_at
  BEFORE UPDATE ON tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- job_runs — Background job execution tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_name TEXT NOT NULL,
  queue TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_name ON job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_runs_queue ON job_runs(queue);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON job_runs(status);
CREATE INDEX IF NOT EXISTS idx_job_runs_created_at ON job_runs(created_at DESC);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE tenant_users IS 'Tenant-scoped user records with roles and status';
COMMENT ON TABLE notifications IS 'Notification delivery records (email, SMS, Slack, webhook)';
COMMENT ON TABLE system_logs IS 'Structured system log entries';
COMMENT ON TABLE system_errors IS 'System error tracking with resolution status';
COMMENT ON TABLE audit_logs IS 'Audit trail for user actions on resources';
COMMENT ON TABLE tenant_config IS 'Tenant configuration key-value store';
COMMENT ON TABLE job_runs IS 'Background job execution tracking';
