-- Tenant onboarding settings table
-- Stores per-tenant creator onboarding configuration
-- Migration: 027_onboarding_settings.sql

CREATE TABLE IF NOT EXISTS tenant_onboarding_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Welcome call configuration
  welcome_call_enabled BOOLEAN NOT NULL DEFAULT true,
  welcome_call_mode TEXT NOT NULL DEFAULT 'internal'
    CHECK (welcome_call_mode IN ('internal', 'external', 'disabled')),
  welcome_call_external_url TEXT,
  welcome_call_external_behavior TEXT DEFAULT 'embed'
    CHECK (welcome_call_external_behavior IN ('redirect', 'embed')),

  -- Internal welcome call event type ID (references scheduling_event_types)
  welcome_call_event_type_id TEXT,

  -- Configurable survey questions as JSON array
  -- Format: [{id, question, type, options, placeholder, required}]
  survey_questions JSONB NOT NULL DEFAULT '[]',

  -- Application form customization
  require_social_media BOOLEAN NOT NULL DEFAULT false,
  require_portfolio BOOLEAN NOT NULL DEFAULT false,
  enabled_social_platforms JSONB NOT NULL DEFAULT '["instagram", "tiktok", "youtube"]',

  -- Notification settings
  notify_on_application_email TEXT,
  auto_approve_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_approve_min_followers INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton pattern - only one settings row per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_onboarding_settings_singleton
  ON tenant_onboarding_settings ((1));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tenant_onboarding_settings_updated_at ON tenant_onboarding_settings;
CREATE TRIGGER update_tenant_onboarding_settings_updated_at
  BEFORE UPDATE ON tenant_onboarding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO tenant_onboarding_settings (id)
VALUES (gen_random_uuid()::TEXT)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE tenant_onboarding_settings IS 'Per-tenant creator onboarding configuration';
COMMENT ON COLUMN tenant_onboarding_settings.welcome_call_mode IS 'internal=platform scheduling, external=third-party, disabled=skip';
COMMENT ON COLUMN tenant_onboarding_settings.survey_questions IS 'Custom survey questions for step 4';
