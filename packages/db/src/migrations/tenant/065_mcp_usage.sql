-- Migration: 065_mcp_usage
-- Description: Create mcp_usage table for MCP tool analytics
-- Phase: REMEDIATION (P0 Schema Fix)
-- Refs: AGENT-20-SHOPIFY-MCP-JOBS-INFRA.md
--
-- The MCP analytics route (apps/admin/src/app/api/admin/mcp/analytics/route.ts)
-- currently checks if this table exists and returns zeros if not. Creating
-- the table enables actual analytics tracking.

CREATE TABLE IF NOT EXISTS mcp_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tool_name TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  duration_ms INTEGER,
  tokens_used INTEGER,
  error_message TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_usage_created ON mcp_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_tool ON mcp_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_status ON mcp_usage(status);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_session ON mcp_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_category ON mcp_usage(category);

COMMENT ON TABLE mcp_usage IS 'MCP tool invocation tracking for analytics dashboard';
COMMENT ON COLUMN mcp_usage.tool_name IS 'Name of the MCP tool that was called';
COMMENT ON COLUMN mcp_usage.category IS 'Tool category (e.g., commerce, content, analytics)';
COMMENT ON COLUMN mcp_usage.tokens_used IS 'LLM tokens consumed during the tool call';
COMMENT ON COLUMN mcp_usage.session_id IS 'MCP session ID for grouping related calls';
