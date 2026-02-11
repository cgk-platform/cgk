-- Health check history table for trend analysis
-- Stores time-series health data with 30-day retention

CREATE TABLE IF NOT EXISTS health_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Service identification
  service VARCHAR(50) NOT NULL,
  tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Check result
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  latency_ms INTEGER NOT NULL,
  details JSONB,

  -- Timestamp
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_health_history_service_time
  ON health_check_history(service, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_history_tenant_time
  ON health_check_history(tenant_id, checked_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_health_history_status
  ON health_check_history(status);

CREATE INDEX IF NOT EXISTS idx_health_history_checked_at
  ON health_check_history(checked_at DESC);

-- Composite index for service + tenant lookups
CREATE INDEX IF NOT EXISTS idx_health_history_service_tenant_time
  ON health_check_history(service, tenant_id, checked_at DESC);

-- Function to clean up old health check history
CREATE OR REPLACE FUNCTION cleanup_health_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM health_check_history
  WHERE checked_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup daily
-- This would be handled by the application's job scheduler (Inngest)
-- but we provide the function for manual execution if needed

COMMENT ON TABLE health_check_history IS 'Time-series health check results with 30-day retention';
COMMENT ON COLUMN health_check_history.service IS 'Name of the monitored service (e.g., database, redis, shopify)';
COMMENT ON COLUMN health_check_history.latency_ms IS 'Response time of the health check in milliseconds';
COMMENT ON COLUMN health_check_history.details IS 'Service-specific metrics and information from the check';
COMMENT ON FUNCTION cleanup_health_history IS 'Deletes health check records older than 30 days';
