-- Tenant Slack Integration
-- Each tenant has independent Slack workspace connection

-- Per-tenant Slack workspace connection
CREATE TABLE IF NOT EXISTS tenant_slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workspace_id VARCHAR(50) NOT NULL,
  workspace_name VARCHAR(255),

  -- Encrypted tokens (AES-256-CBC)
  bot_token_encrypted TEXT NOT NULL,
  user_token_encrypted TEXT,

  -- Connected user info
  connected_by_user_id UUID,
  connected_by_slack_user_id VARCHAR(50),

  -- Scopes granted
  bot_scopes TEXT[] NOT NULL,
  user_scopes TEXT[],

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)  -- One workspace per tenant
);

-- Channel mappings for notification types
CREATE TABLE IF NOT EXISTS tenant_slack_channel_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, notification_type)
);

-- Scheduled reports configuration
CREATE TABLE IF NOT EXISTS tenant_slack_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100),

  -- Schedule
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  send_hour INTEGER NOT NULL CHECK (send_hour >= 0 AND send_hour <= 23),
  timezone VARCHAR(50) NOT NULL,

  -- Configuration
  metrics JSONB NOT NULL,  -- Array of { id, enabled, order }
  date_range_type VARCHAR(20) CHECK (date_range_type IN ('yesterday', 'last_n_days', 'last_week', 'last_month')),
  date_range_days INTEGER,
  custom_header TEXT,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20) CHECK (last_run_status IN ('success', 'failed')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom message templates (Block Kit)
CREATE TABLE IF NOT EXISTS tenant_slack_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  blocks JSONB NOT NULL,
  fallback_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, notification_type)
);

-- Notification log for tracking and debugging
CREATE TABLE IF NOT EXISTS tenant_slack_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  channel_id VARCHAR(50) NOT NULL,
  message_ts VARCHAR(50),
  thread_ts VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'rate_limited')),
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User associations (platform user <-> Slack user)
CREATE TABLE IF NOT EXISTS tenant_slack_user_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  platform_user_id UUID NOT NULL,
  slack_user_id VARCHAR(50) NOT NULL,
  slack_email VARCHAR(255),
  association_method VARCHAR(20) NOT NULL CHECK (association_method IN ('auto', 'manual')),
  last_verified_at TIMESTAMPTZ,
  lookup_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, platform_user_id)
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS tenant_user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  slack_enabled BOOLEAN DEFAULT false,
  slack_dm_enabled BOOLEAN DEFAULT true,
  notify_on_mention BOOLEAN DEFAULT true,
  notify_on_reply BOOLEAN DEFAULT true,
  notify_on_asset_update BOOLEAN DEFAULT false,
  quiet_hours_start INTEGER CHECK (quiet_hours_start >= 0 AND quiet_hours_start <= 23),
  quiet_hours_end INTEGER CHECK (quiet_hours_end >= 0 AND quiet_hours_end <= 23),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slack_workspaces_tenant ON tenant_slack_workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slack_mappings_tenant ON tenant_slack_channel_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slack_mappings_type ON tenant_slack_channel_mappings(notification_type);
CREATE INDEX IF NOT EXISTS idx_slack_reports_tenant ON tenant_slack_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slack_reports_schedule ON tenant_slack_reports(tenant_id, is_enabled, send_hour);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_tenant ON tenant_slack_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_created ON tenant_slack_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_type ON tenant_slack_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_slack_user_assoc_tenant ON tenant_slack_user_associations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_assoc_platform ON tenant_slack_user_associations(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_tenant ON tenant_user_notification_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_user ON tenant_user_notification_preferences(user_id);

-- Comments
COMMENT ON TABLE tenant_slack_workspaces IS 'Per-tenant Slack workspace connections';
COMMENT ON TABLE tenant_slack_channel_mappings IS 'Notification type to Slack channel mappings';
COMMENT ON TABLE tenant_slack_reports IS 'Scheduled Slack report configurations';
COMMENT ON TABLE tenant_slack_templates IS 'Custom Block Kit message templates';
COMMENT ON TABLE tenant_slack_notifications IS 'Log of all Slack notifications sent';
COMMENT ON TABLE tenant_slack_user_associations IS 'Platform user to Slack user ID mappings';
COMMENT ON TABLE tenant_user_notification_preferences IS 'Per-user notification preferences including quiet hours';
COMMENT ON COLUMN tenant_slack_workspaces.bot_token_encrypted IS 'AES-256-CBC encrypted bot token';
COMMENT ON COLUMN tenant_slack_reports.metrics IS 'Array of { id, enabled, order } for report metrics';
