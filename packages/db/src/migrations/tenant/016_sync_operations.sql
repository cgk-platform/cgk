-- Sync Operations table for system maintenance tracking
-- Migration: 016_sync_operations

CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation details
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  -- Data
  preview_data JSONB,
  result_data JSONB,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Who ran it
  run_by TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_operations_type ON sync_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sync_operations_created_at ON sync_operations(created_at DESC);
