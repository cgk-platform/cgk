-- PHASE-2AI-VOICE: Agent Voice Configuration and Call Tracking
-- Tenant-scoped voice tables

-- Agent voice settings
CREATE TABLE IF NOT EXISTS agent_voice_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- TTS Settings
  tts_provider TEXT DEFAULT 'elevenlabs',     -- elevenlabs, openai, google
  tts_voice_id TEXT,                          -- Provider-specific voice ID
  tts_voice_name TEXT,                        -- Human-readable voice name
  tts_fallback_provider TEXT,                 -- Fallback if primary fails

  -- STT Settings
  stt_provider TEXT DEFAULT 'assemblyai',     -- assemblyai, whisper, google
  stt_language TEXT DEFAULT 'en',
  stt_model TEXT,                             -- Provider-specific model

  -- Voice characteristics
  speaking_rate DECIMAL(3,2) DEFAULT 1.0,     -- 0.5 to 2.0
  pitch DECIMAL(3,2) DEFAULT 0.0,             -- -20 to 20
  volume_gain_db DECIMAL(4,1) DEFAULT 0.0,    -- -96 to 16

  -- Call settings
  phone_number TEXT,                          -- Agent's phone number
  voicemail_enabled BOOLEAN DEFAULT true,
  voicemail_greeting TEXT,
  max_call_duration_minutes INTEGER DEFAULT 30,

  -- Provider-specific IDs
  retell_agent_id TEXT,                       -- Retell.ai agent ID

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(agent_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_voice_config_agent ON agent_voice_config(agent_id);


-- Track voice calls
CREATE TABLE IF NOT EXISTS agent_voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Call identifiers
  call_sid TEXT NOT NULL,                     -- Provider's call ID
  provider TEXT NOT NULL,                     -- retell, twilio, etc.

  -- Call details
  direction TEXT NOT NULL,                    -- inbound, outbound
  from_number TEXT,
  to_number TEXT,
  caller_name TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'initiated',   -- initiated, ringing, in_progress, completed, failed, voicemail, missed, cancelled
  started_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Related entities
  creator_id TEXT,
  contact_id TEXT,

  -- Recording
  recording_url TEXT,
  recording_duration_seconds INTEGER,

  -- Summary (generated after call)
  summary TEXT,
  sentiment TEXT,                             -- positive, neutral, negative
  action_items JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_tenant ON agent_voice_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_agent ON agent_voice_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_sid ON agent_voice_calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_voice_calls_creator ON agent_voice_calls(tenant_id, creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_calls_date ON agent_voice_calls(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON agent_voice_calls(status);


-- Real-time call transcripts
CREATE TABLE IF NOT EXISTS agent_voice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  call_id UUID NOT NULL REFERENCES agent_voice_calls(id) ON DELETE CASCADE,

  -- Transcript entry
  speaker TEXT NOT NULL,                      -- agent, caller, system
  speaker_name TEXT,
  text TEXT NOT NULL,
  confidence DECIMAL(3,2),

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Whether this is final or interim
  is_final BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_call ON agent_voice_transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_tenant ON agent_voice_transcripts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_speaker ON agent_voice_transcripts(call_id, speaker);


-- What the agent said during calls
CREATE TABLE IF NOT EXISTS agent_voice_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  call_id UUID NOT NULL REFERENCES agent_voice_calls(id) ON DELETE CASCADE,

  -- Response details
  response_text TEXT NOT NULL,
  source_transcript TEXT,                     -- What triggered this response
  tools_used TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Audio
  audio_url TEXT,
  audio_duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_responses_call ON agent_voice_responses(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_responses_tenant ON agent_voice_responses(tenant_id);


-- Add voice-related action types to the default autonomy settings
-- These will be used to control agent voice behavior
INSERT INTO agent_action_autonomy (agent_id, action_type, autonomy_level, enabled, requires_approval)
SELECT a.id, 'make_voice_call', 'suggest_and_confirm', true, true
FROM ai_agents a
WHERE NOT EXISTS (
  SELECT 1 FROM agent_action_autonomy WHERE agent_id = a.id AND action_type = 'make_voice_call'
);

INSERT INTO agent_action_autonomy (agent_id, action_type, autonomy_level, enabled, requires_approval)
SELECT a.id, 'answer_voice_call', 'autonomous', true, false
FROM ai_agents a
WHERE NOT EXISTS (
  SELECT 1 FROM agent_action_autonomy WHERE agent_id = a.id AND action_type = 'answer_voice_call'
);
