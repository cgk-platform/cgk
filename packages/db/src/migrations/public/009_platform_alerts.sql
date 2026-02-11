-- Platform alerts table for health monitoring
-- Stores alerts with severity, status, and delivery tracking

CREATE TABLE IF NOT EXISTS platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('p1', 'p2', 'p3')),
  source VARCHAR(50) NOT NULL CHECK (source IN ('health_check', 'threshold', 'error_tracker', 'manual')),
  service VARCHAR(50) NOT NULL,

  -- Context
  tenant_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  metric VARCHAR(100),
  current_value NUMERIC,
  threshold_value NUMERIC,

  -- Content
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Delivery tracking
  delivery_status JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_platform_alerts_status_open
  ON platform_alerts(status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_platform_alerts_severity
  ON platform_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_platform_alerts_tenant
  ON platform_alerts(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_alerts_created
  ON platform_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_alerts_service
  ON platform_alerts(service);

CREATE INDEX IF NOT EXISTS idx_platform_alerts_source
  ON platform_alerts(source);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_platform_alerts_status_severity_created
  ON platform_alerts(status, severity, created_at DESC);

COMMENT ON TABLE platform_alerts IS 'Platform-wide alerts for health monitoring and threshold breaches';
COMMENT ON COLUMN platform_alerts.severity IS 'Alert priority: p1 (critical), p2 (warning), p3 (info)';
COMMENT ON COLUMN platform_alerts.source IS 'Origin of alert: health_check, threshold, error_tracker, or manual';
COMMENT ON COLUMN platform_alerts.delivery_status IS 'Tracking for each channel: { slack: "sent", email: "failed", ... }';
