-- Onboarding configuration
-- Stores tenant-level onboarding step settings

CREATE TABLE IF NOT EXISTS onboarding_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Steps configuration: [{id, name, required, order, reminderDays}]
  steps JSONB NOT NULL DEFAULT '[
    {"id": "accept_terms", "name": "Accept Terms & Conditions", "required": true, "order": 1, "reminderDays": []},
    {"id": "complete_profile", "name": "Complete Profile", "required": true, "order": 2, "reminderDays": [3, 7, 14]},
    {"id": "sign_agreement", "name": "Sign Creator Agreement", "required": true, "order": 3, "reminderDays": [3, 7]},
    {"id": "submit_tax_info", "name": "Submit W-9 / Tax Info", "required": true, "order": 4, "reminderDays": [7, 14, 21]},
    {"id": "setup_payout", "name": "Set Up Payout Method", "required": true, "order": 5, "reminderDays": [7, 14]},
    {"id": "complete_training", "name": "Complete Training Module", "required": false, "order": 6, "reminderDays": [7]},
    {"id": "receive_samples", "name": "Receive Sample Products", "required": false, "order": 7, "reminderDays": []}
  ]',

  -- Timeline settings
  max_completion_days INTEGER NOT NULL DEFAULT 30,
  auto_deactivate BOOLEAN NOT NULL DEFAULT true,

  -- Auto-assign settings
  default_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  auto_generate_code BOOLEAN NOT NULL DEFAULT true,
  code_format TEXT NOT NULL DEFAULT '{NAME}{RANDOM2}',

  -- Email template
  welcome_template_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton pattern
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_config_singleton ON onboarding_config ((1));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_onboarding_config_updated_at ON onboarding_config;
CREATE TRIGGER update_onboarding_config_updated_at
  BEFORE UPDATE ON onboarding_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE onboarding_config IS 'Tenant-level creator onboarding configuration';
COMMENT ON COLUMN onboarding_config.steps IS 'JSON array of onboarding step definitions';
COMMENT ON COLUMN onboarding_config.code_format IS 'Template for generating discount codes';
