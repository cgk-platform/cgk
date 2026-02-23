-- Migration: 074_sms_esign_extensions
-- Description: SMS consent tracking and e-sign workflow tables
-- Phase: Phase 8 Audit
--
-- Sources:
--   apps/admin/src/app/api/admin/sms/status/route.ts
--   apps/admin/src/app/api/admin/sms/audit-log/route.ts
--   packages/esign/src/lib/workflows.ts
--   packages/esign/src/lib/jobs.ts

-- ============================================================
-- 1. sms_consent — Current consent state per phone/channel
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_consent (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone TEXT NOT NULL,
  email TEXT,
  channel TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  source TEXT NOT NULL,
  ip_address TEXT,
  opted_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phone, channel)
);

DROP TRIGGER IF EXISTS update_sms_consent_updated_at ON sms_consent;
CREATE TRIGGER update_sms_consent_updated_at
  BEFORE UPDATE ON sms_consent
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sms_consent_phone ON sms_consent(phone);
CREATE INDEX IF NOT EXISTS idx_sms_consent_opted_in ON sms_consent(opted_in);

COMMENT ON TABLE sms_consent IS 'Current SMS/email consent state per phone+channel';

-- ============================================================
-- 2. sms_consent_log — Immutable audit trail of consent changes
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_consent_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone TEXT NOT NULL,
  email TEXT,
  channel TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  source TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_consent_log_phone ON sms_consent_log(phone);
CREATE INDEX IF NOT EXISTS idx_sms_consent_log_created_at ON sms_consent_log(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_consent_log_phone_channel ON sms_consent_log(phone, channel);

COMMENT ON TABLE sms_consent_log IS 'Immutable audit log of all consent opt-in/opt-out events';

-- ============================================================
-- 3. esign_workflows — Workflow definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS esign_workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  steps JSONB NOT NULL DEFAULT '[]',
  default_message TEXT,
  default_expires_days INTEGER,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_days INTEGER NOT NULL DEFAULT 3,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_esign_workflows_updated_at ON esign_workflows;
CREATE TRIGGER update_esign_workflows_updated_at
  BEFORE UPDATE ON esign_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_esign_workflows_status ON esign_workflows(status);
CREATE INDEX IF NOT EXISTS idx_esign_workflows_trigger_type ON esign_workflows(trigger_type);

COMMENT ON TABLE esign_workflows IS 'E-sign workflow definitions with configurable steps';

-- ============================================================
-- 4. esign_workflow_executions — Running/completed workflow instances
-- ============================================================

CREATE TABLE IF NOT EXISTS esign_workflow_executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES esign_workflows(id),
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  context JSONB NOT NULL DEFAULT '{}',
  document_ids JSONB NOT NULL DEFAULT '[]',
  triggered_by TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_esign_workflow_executions_updated_at ON esign_workflow_executions;
CREATE TRIGGER update_esign_workflow_executions_updated_at
  BEFORE UPDATE ON esign_workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_esign_workflow_exec_workflow_id ON esign_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_esign_workflow_exec_status ON esign_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_esign_workflow_exec_started_at ON esign_workflow_executions(started_at);

COMMENT ON TABLE esign_workflow_executions IS 'Running/completed e-sign workflow instances';
