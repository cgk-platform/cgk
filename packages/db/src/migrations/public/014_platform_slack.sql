-- Platform (Super Admin) Slack Workspace for Ops Notifications
-- This is separate from tenant Slack integrations

-- Platform-level Slack connection (super admin only)
CREATE TABLE IF NOT EXISTS platform_slack_workspace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(50) NOT NULL,
  workspace_name VARCHAR(255),
  bot_token_encrypted TEXT NOT NULL,
  user_token_encrypted TEXT,

  -- Alert routing by severity
  channel_critical VARCHAR(50),
  channel_errors VARCHAR(50),
  channel_warnings VARCHAR(50),
  channel_info VARCHAR(50),
  channel_deployments VARCHAR(50),

  -- Mention settings (@here, @channel, user group ID)
  mention_critical VARCHAR(50),
  mention_errors VARCHAR(50),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform alert log
CREATE TABLE IF NOT EXISTS platform_slack_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  service VARCHAR(50) NOT NULL,
  tenant_id UUID REFERENCES organizations(id),  -- NULL for platform-wide alerts
  title TEXT NOT NULL,
  message TEXT,
  channel_id VARCHAR(50),
  message_ts VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'rate_limited')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_slack_alerts_severity ON platform_slack_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_platform_slack_alerts_created ON platform_slack_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_slack_alerts_tenant ON platform_slack_alerts(tenant_id) WHERE tenant_id IS NOT NULL;

-- Comments
COMMENT ON TABLE platform_slack_workspace IS 'Platform-level Slack workspace for super admin ops notifications';
COMMENT ON TABLE platform_slack_alerts IS 'Log of all platform-level Slack alerts sent';
COMMENT ON COLUMN platform_slack_workspace.bot_token_encrypted IS 'AES-256-CBC encrypted bot token';
COMMENT ON COLUMN platform_slack_workspace.mention_critical IS 'Mention pattern for critical alerts (@here, @channel, or user group ID)';
