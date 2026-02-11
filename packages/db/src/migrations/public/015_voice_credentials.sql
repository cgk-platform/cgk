-- PHASE-2AI-VOICE: Platform-level Voice Provider Credentials
-- Stored in public schema because credentials are shared across tenant schemas

-- Store encrypted credentials per tenant
CREATE TABLE IF NOT EXISTS tenant_voice_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- ElevenLabs
  elevenlabs_api_key_encrypted TEXT,

  -- AssemblyAI
  assemblyai_api_key_encrypted TEXT,

  -- OpenAI (for TTS/STT)
  openai_api_key_encrypted TEXT,

  -- Retell
  retell_api_key_encrypted TEXT,
  retell_phone_number TEXT,

  -- Google Cloud (for TTS/STT)
  google_service_account_encrypted TEXT,

  -- Twilio (optional for custom integration)
  twilio_account_sid_encrypted TEXT,
  twilio_auth_token_encrypted TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_voice_credentials_tenant ON tenant_voice_credentials(tenant_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_voice_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_voice_credentials_updated_at ON tenant_voice_credentials;
CREATE TRIGGER trigger_voice_credentials_updated_at
  BEFORE UPDATE ON tenant_voice_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_credentials_updated_at();

-- Voice usage tracking for billing
CREATE TABLE IF NOT EXISTS voice_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Usage type
  usage_type TEXT NOT NULL,                   -- tts, stt, voice_call
  provider TEXT NOT NULL,                     -- elevenlabs, assemblyai, retell, etc.

  -- Metrics
  characters_used INTEGER DEFAULT 0,          -- For TTS
  minutes_used DECIMAL(10,2) DEFAULT 0,       -- For STT and calls
  calls_count INTEGER DEFAULT 0,              -- For voice calls

  -- Cost tracking
  estimated_cost_usd DECIMAL(10,4) DEFAULT 0,

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_usage_tenant ON voice_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_usage_period ON voice_usage_logs(tenant_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_voice_usage_type ON voice_usage_logs(usage_type);

-- Voice feature flags
INSERT INTO feature_flags (name, description, default_enabled, category)
VALUES
  ('voice_calls_enabled', 'Enable AI voice call capabilities', false, 'ai'),
  ('voice_tts_enabled', 'Enable text-to-speech for agents', true, 'ai'),
  ('voice_stt_enabled', 'Enable speech-to-text transcription', true, 'ai'),
  ('voice_recording_enabled', 'Enable call recording', true, 'ai'),
  ('voice_realtime_enabled', 'Enable real-time voice transcription', false, 'ai')
ON CONFLICT (name) DO NOTHING;
