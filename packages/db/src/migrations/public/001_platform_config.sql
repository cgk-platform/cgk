-- Platform configuration table
-- Used by setup wizard to detect if platform is configured
-- Stores platform-wide settings as key-value pairs

-- Create updated_at trigger function (shared across all tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Platform configuration
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_platform_config_updated_at ON platform_config;
CREATE TRIGGER update_platform_config_updated_at
  BEFORE UPDATE ON platform_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for key lookups
CREATE INDEX IF NOT EXISTS idx_platform_config_key ON platform_config(key);

COMMENT ON TABLE platform_config IS 'Platform-wide configuration as key-value pairs';
COMMENT ON COLUMN platform_config.key IS 'Configuration key (e.g., setup, platform, defaults, features)';
COMMENT ON COLUMN platform_config.value IS 'Configuration value as JSON';
