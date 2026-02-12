-- Impersonation Sessions
-- Tracks super admin impersonation of tenant users with full audit trail
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  super_admin_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT NOT NULL REFERENCES users(id),
  target_tenant_id TEXT NOT NULL REFERENCES organizations(id),
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes for impersonation lookups
CREATE INDEX IF NOT EXISTS idx_impersonation_super_admin
  ON impersonation_sessions(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target_user
  ON impersonation_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target_tenant
  ON impersonation_sessions(target_tenant_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_active
  ON impersonation_sessions(super_admin_id, expires_at)
  WHERE ended_at IS NULL;

-- Platform Errors Table
-- Cross-tenant error tracking for super admin error explorer
CREATE TABLE IF NOT EXISTS platform_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES organizations(id),
  tenant_name TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('p1', 'p2', 'p3')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  metadata JSONB DEFAULT '{}',
  pattern_hash TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for error explorer queries
CREATE INDEX IF NOT EXISTS idx_platform_errors_tenant
  ON platform_errors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_errors_severity
  ON platform_errors(severity);
CREATE INDEX IF NOT EXISTS idx_platform_errors_status
  ON platform_errors(status);
CREATE INDEX IF NOT EXISTS idx_platform_errors_occurred
  ON platform_errors(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_errors_pattern
  ON platform_errors(pattern_hash);
CREATE INDEX IF NOT EXISTS idx_platform_errors_active
  ON platform_errors(status, severity, occurred_at DESC)
  WHERE status != 'resolved';

-- Platform Jobs Table
-- Cross-tenant job monitoring for super admin dashboard
CREATE TABLE IF NOT EXISTS platform_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES organizations(id),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  payload JSONB DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  error_stack TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for job monitoring
CREATE INDEX IF NOT EXISTS idx_platform_jobs_tenant
  ON platform_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_jobs_status
  ON platform_jobs(status);
CREATE INDEX IF NOT EXISTS idx_platform_jobs_failed
  ON platform_jobs(status, created_at DESC)
  WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_platform_jobs_type
  ON platform_jobs(job_type);

-- Platform Webhooks Table
-- Cross-tenant webhook delivery monitoring
CREATE TABLE IF NOT EXISTS platform_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES organizations(id),
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for webhook monitoring
CREATE INDEX IF NOT EXISTS idx_platform_webhooks_tenant
  ON platform_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_webhooks_status
  ON platform_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_platform_webhooks_failed
  ON platform_webhooks(status, created_at DESC)
  WHERE status = 'failed';

-- Health Check Matrix Table
-- Stores per-tenant per-service health status
CREATE TABLE IF NOT EXISTS platform_health_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  response_time_ms INTEGER,
  last_error TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, service_name)
);

-- Index for health matrix queries
CREATE INDEX IF NOT EXISTS idx_health_matrix_tenant
  ON platform_health_matrix(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_matrix_service
  ON platform_health_matrix(service_name);
CREATE INDEX IF NOT EXISTS idx_health_matrix_status
  ON platform_health_matrix(status);
