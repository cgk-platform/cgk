-- Platform logs table with monthly partitioning
-- Migration: 009_platform_logs
-- Date: 2026-02-10

-- Create the partitioned parent table
CREATE TABLE IF NOT EXISTS platform_logs (
  id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('trace', 'debug', 'info', 'warn', 'error', 'fatal')),

  -- Tenant context
  tenant_id TEXT,
  tenant_slug TEXT,

  -- User context
  user_id TEXT,
  session_id TEXT,
  impersonator_id TEXT,

  -- Request tracing
  request_id TEXT,
  trace_id TEXT,
  span_id TEXT,

  -- Source
  service TEXT NOT NULL CHECK (service IN (
    'orchestrator', 'admin', 'storefront', 'creator-portal',
    'mcp-server', 'inngest', 'webhook-handler'
  )),
  action TEXT NOT NULL DEFAULT '',
  file TEXT,
  line INTEGER,
  function_name TEXT,

  -- Content
  message TEXT NOT NULL,
  data JSONB,

  -- Error (if applicable)
  error_type TEXT,
  error_code TEXT,
  error_stack TEXT,
  error_signature TEXT,

  -- Environment
  environment TEXT NOT NULL DEFAULT 'development',
  version TEXT,
  region TEXT,

  -- Primary key includes timestamp for partitioning
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create index on common query patterns
CREATE INDEX IF NOT EXISTS idx_platform_logs_tenant_time
  ON platform_logs (tenant_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_platform_logs_level_time
  ON platform_logs (level, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_platform_logs_service_time
  ON platform_logs (service, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_platform_logs_trace
  ON platform_logs (trace_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_platform_logs_request
  ON platform_logs (request_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_platform_logs_user
  ON platform_logs (user_id, timestamp DESC)
  WHERE user_id IS NOT NULL;

-- Partial index for recent errors (commonly queried)
CREATE INDEX IF NOT EXISTS idx_platform_logs_recent_errors
  ON platform_logs (timestamp DESC, error_signature)
  WHERE level IN ('error', 'fatal') AND error_signature IS NOT NULL;

-- Full-text search on message
ALTER TABLE platform_logs ADD COLUMN IF NOT EXISTS message_tsv TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', message)) STORED;

CREATE INDEX IF NOT EXISTS idx_platform_logs_message_search
  ON platform_logs USING GIN (message_tsv);

-- Error aggregation index
CREATE INDEX IF NOT EXISTS idx_platform_logs_error_signature
  ON platform_logs (error_signature, timestamp DESC)
  WHERE error_signature IS NOT NULL;

-- Create initial partitions (current month and next month)
DO $$
DECLARE
  current_month DATE := date_trunc('month', CURRENT_DATE);
  next_month DATE := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
  current_partition TEXT;
  next_partition TEXT;
BEGIN
  current_partition := 'platform_logs_p' || to_char(current_month, 'YYYYMM');
  next_partition := 'platform_logs_p' || to_char(next_month, 'YYYYMM');

  -- Create current month partition
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF platform_logs
     FOR VALUES FROM (%L) TO (%L)',
    current_partition,
    current_month,
    next_month
  );

  -- Create next month partition
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF platform_logs
     FOR VALUES FROM (%L) TO (%L)',
    next_partition,
    next_month,
    next_month + INTERVAL '1 month'
  );
END $$;

-- Function to create new partitions automatically
CREATE OR REPLACE FUNCTION create_platform_logs_partition()
RETURNS void AS $$
DECLARE
  target_month DATE := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
  partition_name TEXT;
  end_month DATE;
BEGIN
  partition_name := 'platform_logs_p' || to_char(target_month, 'YYYYMM');
  end_month := target_month + INTERVAL '1 month';

  -- Check if partition exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF platform_logs
       FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      target_month,
      end_month
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions (older than 90 days)
CREATE OR REPLACE FUNCTION drop_old_platform_logs_partitions()
RETURNS void AS $$
DECLARE
  cutoff_month DATE := date_trunc('month', CURRENT_DATE - INTERVAL '90 days');
  partition_record RECORD;
BEGIN
  FOR partition_record IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'platform_logs_p%'
    ORDER BY tablename
  LOOP
    -- Extract date from partition name (platform_logs_pYYYYMM)
    IF substring(partition_record.tablename FROM 17 FOR 6)::DATE < cutoff_month THEN
      EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.tablename);
      RAISE NOTICE 'Dropped old partition: %', partition_record.tablename;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE platform_logs IS 'Partitioned table for platform-wide structured logs. Partitioned by month for efficient retention management.';
