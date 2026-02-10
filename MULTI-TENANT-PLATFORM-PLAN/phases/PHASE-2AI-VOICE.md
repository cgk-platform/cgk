# PHASE-2AI-VOICE: Voice Capabilities

> **Goal**: Implement text-to-speech, speech-to-text, and voice call handling for AI agents
> **Duration**: 1 week
> **Dependencies**: PHASE-2AI-CORE (agent registry)
> **Parallelizable**: Yes (can run alongside PHASE-2AI-MEMORY)

---

## Success Criteria

- [ ] TTS provider abstraction (ElevenLabs, Google, OpenAI)
- [ ] STT provider abstraction (AssemblyAI, Whisper, Google)
- [ ] Voice call integration (Retell.ai or similar)
- [ ] Real-time transcription for voice calls
- [ ] Voice configuration per agent
- [ ] Call session tracking and transcript storage
- [ ] Admin UI for voice settings and call history

---

## Architecture Overview

The voice system provides:

1. **Text-to-Speech (TTS)**: Generate spoken audio from agent responses
2. **Speech-to-Text (STT)**: Transcribe user voice input
3. **Voice Calls**: Handle inbound/outbound phone calls
4. **Real-time Processing**: Low-latency voice interaction
5. **Transcript Storage**: Searchable call history

---

## Provider Selection

### TTS Providers

| Provider | Strengths | Cost | Use Case |
|----------|-----------|------|----------|
| **ElevenLabs** | Best quality, voice cloning | $5/100k chars | Primary for calls |
| **OpenAI TTS** | Good quality, fast | $15/1M chars | Fallback |
| **Google Cloud TTS** | Many voices, stable | $4/1M chars | Bulk/batch |

### STT Providers

| Provider | Strengths | Cost | Use Case |
|----------|-----------|------|----------|
| **AssemblyAI** | Best accuracy, real-time | $0.37/min | Primary |
| **OpenAI Whisper** | Good accuracy, simple | $0.006/min | Fallback |
| **Google Cloud STT** | Real-time, stable | $0.024/min | Alternative |

### Voice Call Providers

| Provider | Strengths | Use Case |
|----------|-----------|----------|
| **Retell.ai** | Purpose-built for AI calls, handles TTS/STT | Primary |
| **Twilio** | Flexible, mature | Custom integration |
| **Daily.co** | Video + audio, meetings | Meeting bots |

---

## Database Schema

### Voice Configuration

```sql
-- Agent voice settings
CREATE TABLE agent_voice_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(agent_id)
);
```

### Voice Call Sessions

```sql
-- Track voice calls
CREATE TABLE agent_voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
  status TEXT NOT NULL DEFAULT 'initiated',   -- initiated, ringing, in_progress, completed, failed, voicemail
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

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_voice_calls_tenant ON agent_voice_calls(tenant_id);
CREATE INDEX idx_voice_calls_agent ON agent_voice_calls(agent_id);
CREATE INDEX idx_voice_calls_sid ON agent_voice_calls(call_sid);
CREATE INDEX idx_voice_calls_creator ON agent_voice_calls(tenant_id, creator_id);
CREATE INDEX idx_voice_calls_date ON agent_voice_calls(tenant_id, started_at DESC);
```

### Call Transcripts

```sql
-- Real-time call transcripts
CREATE TABLE agent_voice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_transcripts_call ON agent_voice_transcripts(call_id);
CREATE INDEX idx_transcripts_tenant ON agent_voice_transcripts(tenant_id);
```

### Agent Responses During Calls

```sql
-- What the agent said during calls
CREATE TABLE agent_voice_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES agent_voice_calls(id) ON DELETE CASCADE,

  -- Response details
  response_text TEXT NOT NULL,
  source_transcript TEXT,                     -- What triggered this response
  tools_used TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Audio
  audio_url TEXT,
  audio_duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_voice_responses_call ON agent_voice_responses(call_id);
```

---

## Package Structure

```
packages/ai-agents/
├── src/
│   ├── voice/
│   │   ├── index.ts             # Public exports
│   │   ├── types.ts             # Voice types
│   │   │
│   │   ├── tts/
│   │   │   ├── provider.ts      # Abstract TTS provider
│   │   │   ├── elevenlabs.ts    # ElevenLabs implementation
│   │   │   ├── openai.ts        # OpenAI TTS implementation
│   │   │   └── google.ts        # Google Cloud TTS
│   │   │
│   │   ├── stt/
│   │   │   ├── provider.ts      # Abstract STT provider
│   │   │   ├── assemblyai.ts    # AssemblyAI implementation
│   │   │   ├── whisper.ts       # OpenAI Whisper
│   │   │   └── google.ts        # Google Cloud STT
│   │   │
│   │   ├── calls/
│   │   │   ├── session.ts       # Call session management
│   │   │   ├── retell.ts        # Retell.ai integration
│   │   │   └── twilio.ts        # Twilio integration
│   │   │
│   │   ├── config.ts            # Voice configuration
│   │   └── models.ts            # Available voices/models
│   │
│   └── db/
│       └── voice-schema.ts      # Voice table definitions
```

---

## TTS Implementation

### Abstract Provider

```typescript
// packages/ai-agents/src/voice/tts/provider.ts

export interface TTSProvider {
  name: string
  generateSpeech(text: string, options: TTSOptions): Promise<TTSResult>
  getVoices(): Promise<Voice[]>
  estimateCost(text: string): number
}

export interface TTSOptions {
  voiceId: string
  speakingRate?: number
  pitch?: number
  volumeGainDb?: number
}

export interface TTSResult {
  audioBuffer: Buffer
  audioUrl?: string
  durationMs: number
  characterCount: number
}

export interface Voice {
  id: string
  name: string
  gender: 'male' | 'female' | 'neutral'
  language: string
  accent?: string
  previewUrl?: string
}
```

### ElevenLabs Implementation

```typescript
// packages/ai-agents/src/voice/tts/elevenlabs.ts

import { ElevenLabsClient } from 'elevenlabs'

export class ElevenLabsTTS implements TTSProvider {
  name = 'elevenlabs'
  private client: ElevenLabsClient

  constructor(apiKey: string) {
    this.client = new ElevenLabsClient({ apiKey })
  }

  async generateSpeech(text: string, options: TTSOptions): Promise<TTSResult> {
    const response = await this.client.textToSpeech.convert(options.voiceId, {
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      }
    })

    const chunks: Buffer[] = []
    for await (const chunk of response) {
      chunks.push(Buffer.from(chunk))
    }

    const audioBuffer = Buffer.concat(chunks)

    return {
      audioBuffer,
      durationMs: this.estimateDuration(text),
      characterCount: text.length
    }
  }

  async getVoices(): Promise<Voice[]> {
    const response = await this.client.voices.getAll()
    return response.voices.map(v => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender || 'neutral',
      language: 'en',
      previewUrl: v.preview_url
    }))
  }

  estimateCost(text: string): number {
    // ElevenLabs: ~$5 per 100k characters
    return (text.length / 100000) * 5
  }

  private estimateDuration(text: string): number {
    // Average speaking rate: ~150 words per minute
    const words = text.split(/\s+/).length
    return (words / 150) * 60 * 1000
  }
}
```

---

## STT Implementation

### AssemblyAI Real-time

```typescript
// packages/ai-agents/src/voice/stt/assemblyai.ts

import { AssemblyAI, RealtimeTranscriber } from 'assemblyai'

export class AssemblyAISTT implements STTProvider {
  name = 'assemblyai'
  private client: AssemblyAI

  constructor(apiKey: string) {
    this.client = new AssemblyAI({ apiKey })
  }

  async transcribeRealtime(options: RealtimeSTTOptions): Promise<RealtimeTranscriber> {
    const transcriber = this.client.realtime.transcriber({
      sampleRate: options.sampleRate || 16000,
      encoding: options.encoding || 'pcm_s16le',
      language_code: options.language || 'en_us'
    })

    transcriber.on('transcript', (transcript) => {
      options.onTranscript({
        text: transcript.text,
        isFinal: transcript.message_type === 'FinalTranscript',
        confidence: transcript.confidence,
        startTime: transcript.audio_start,
        endTime: transcript.audio_end
      })
    })

    await transcriber.connect()
    return transcriber
  }

  async transcribeFile(audioUrl: string): Promise<Transcription> {
    const transcript = await this.client.transcripts.transcribe({
      audio_url: audioUrl,
      speaker_labels: true
    })

    return {
      text: transcript.text || '',
      speakers: transcript.utterances?.map(u => ({
        speaker: u.speaker,
        text: u.text,
        start: u.start,
        end: u.end
      })) || [],
      confidence: transcript.confidence
    }
  }

  estimateCost(durationSeconds: number): number {
    // AssemblyAI: $0.37 per minute
    return (durationSeconds / 60) * 0.37
  }
}
```

---

## Voice Call Integration (Retell.ai)

```typescript
// packages/ai-agents/src/voice/calls/retell.ts

import Retell from 'retell-sdk'

export class RetellVoiceCalls {
  private client: Retell

  constructor(apiKey: string) {
    this.client = new Retell({ apiKey })
  }

  async createOutboundCall(params: {
    agentId: string
    toNumber: string
    fromNumber: string
    context?: string
  }): Promise<VoiceCall> {
    // Get agent configuration
    const voiceConfig = await getAgentVoiceConfig(params.agentId)

    // Create Retell agent if not exists
    const retellAgentId = await this.ensureRetellAgent(params.agentId, voiceConfig)

    // Initiate call
    const call = await this.client.call.createPhoneCall({
      agent_id: retellAgentId,
      to_number: params.toNumber,
      from_number: params.fromNumber
    })

    // Record call in our database
    const callRecord = await createVoiceCall({
      tenantId: voiceConfig.tenantId,
      agentId: params.agentId,
      callSid: call.call_id,
      provider: 'retell',
      direction: 'outbound',
      fromNumber: params.fromNumber,
      toNumber: params.toNumber,
      status: 'initiated'
    })

    return callRecord
  }

  async handleWebhook(event: RetellWebhookEvent): Promise<void> {
    switch (event.event) {
      case 'call_started':
        await updateCallStatus(event.call_id, 'in_progress', {
          answeredAt: new Date()
        })
        break

      case 'call_ended':
        await updateCallStatus(event.call_id, 'completed', {
          endedAt: new Date(),
          durationSeconds: event.call_duration,
          recordingUrl: event.recording_url
        })
        // Generate summary
        await generateCallSummary(event.call_id)
        break

      case 'call_analyzed':
        await updateCallAnalysis(event.call_id, {
          summary: event.call_analysis.call_summary,
          sentiment: event.call_analysis.agent_sentiment
        })
        break

      case 'transcript':
        await saveTranscript(event.call_id, event.transcript)
        break
    }
  }

  private async ensureRetellAgent(agentId: string, config: VoiceConfig): Promise<string> {
    // Check if we already have a Retell agent ID
    if (config.retellAgentId) {
      return config.retellAgentId
    }

    // Create new Retell agent
    const agent = await this.client.agent.create({
      agent_name: `Agent ${agentId}`,
      voice_id: config.ttsVoiceId,
      language: 'en-US',
      llm_websocket_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/ai-agents/${agentId}/voice/llm`,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/ai-agents/voice/webhooks/retell`
    })

    // Save Retell agent ID
    await saveRetellAgentId(agentId, agent.agent_id)

    return agent.agent_id
  }
}
```

---

## API Endpoints

### Voice Configuration

```typescript
// GET /api/admin/ai-agents/[agentId]/voice
// Get voice configuration

// PATCH /api/admin/ai-agents/[agentId]/voice
// Update voice settings
export async function PATCH(req: Request, { params }: { params: { agentId: string } }) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'ai.voice.manage')

  const updates = await req.json()
  const config = await withTenant(tenantId, () =>
    updateVoiceConfig(params.agentId, updates)
  )
  return Response.json({ config })
}

// GET /api/admin/ai-agents/[agentId]/voice/voices
// List available voices for current TTS provider
```

### Call Management

```typescript
// GET /api/admin/ai-agents/calls
// List voice calls with filters

// POST /api/admin/ai-agents/[agentId]/calls
// Initiate outbound call
export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const { tenantId } = await getTenantContext(req)
  await requirePermission(req, 'ai.calls.initiate')

  const { toNumber, context } = await req.json()
  const voiceConfig = await getAgentVoiceConfig(params.agentId)

  const call = await retellVoiceCalls.createOutboundCall({
    agentId: params.agentId,
    toNumber,
    fromNumber: voiceConfig.phoneNumber,
    context
  })

  return Response.json({ call })
}

// GET /api/admin/ai-agents/calls/[callId]
// Get call details with transcript

// GET /api/admin/ai-agents/calls/[callId]/transcript
// Get full transcript
```

### Webhooks

```typescript
// POST /api/ai-agents/voice/webhooks/retell
// Retell.ai webhook handler
export async function POST(req: Request) {
  const signature = req.headers.get('x-retell-signature')
  const body = await req.text()

  // Verify signature
  if (!verifyRetellSignature(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  await retellVoiceCalls.handleWebhook(event)

  return Response.json({ received: true })
}
```

### Real-time Voice LLM

```typescript
// WebSocket: /api/ai-agents/[agentId]/voice/llm
// Real-time LLM for voice conversations (Retell calls this)
export async function GET(req: Request, { params }: { params: { agentId: string } }) {
  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('call_id')

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req)

  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data)

    switch (message.type) {
      case 'user_transcript':
        // Process user speech and generate response
        const agentResponse = await processVoiceMessage({
          agentId: params.agentId,
          callId,
          userMessage: message.transcript,
          conversationHistory: message.history
        })

        socket.send(JSON.stringify({
          type: 'agent_response',
          text: agentResponse.text,
          endOfResponse: true
        }))
        break
    }
  }

  return response
}
```

---

## Admin UI Pages

### Voice Configuration (`/admin/ai-team/[agentId]/voice`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Voice Settings                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ TEXT-TO-SPEECH                                               │ │
│ │                                                               │ │
│ │ Provider: [ElevenLabs ▼]                                     │ │
│ │ Voice:    [Rachel - American Female ▼]    [▶ Preview]        │ │
│ │                                                               │ │
│ │ Speed:    ░░░░░░░░█░░░ 1.0x                                  │ │
│ │ Pitch:    ░░░░░░░░█░░░ 0                                     │ │
│ │                                                               │ │
│ │ Fallback: [OpenAI TTS ▼]                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SPEECH-TO-TEXT                                               │ │
│ │                                                               │ │
│ │ Provider: [AssemblyAI ▼]                                     │ │
│ │ Language: [English (US) ▼]                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHONE CALLS                                                  │ │
│ │                                                               │ │
│ │ Phone Number: +1 (555) 123-4567          [Change Number]     │ │
│ │                                                               │ │
│ │ Max Call Duration: [30 ▼] minutes                            │ │
│ │ Voicemail: [✓] Enabled                                       │ │
│ │ Greeting: "Hi, this is Bri. I'm not available right now..." │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                                              [Save Changes]      │
└─────────────────────────────────────────────────────────────────┘
```

### Call History (`/admin/ai-team/calls`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Voice Calls                                                      │
├─────────────────────────────────────────────────────────────────┤
│ Agent: [All ▼]  Direction: [All ▼]  Status: [All ▼]  📅 7 days  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📞 +1 (555) 987-6543                     Today, 2:30 PM   │   │
│ │    ↗ Outbound • Bri • 4:32 duration                        │   │
│ │    Sarah Miller (Creator)                                  │   │
│ │    ✓ Completed                                             │   │
│ │    Summary: Discussed project timeline, extended deadline  │   │
│ │    [View Transcript] [Play Recording]                      │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📞 +1 (555) 456-7890                    Yesterday, 11:15 AM│   │
│ │    ↙ Inbound • Bri • 2:18 duration                         │   │
│ │    Unknown Caller                                          │   │
│ │    ✓ Completed                                             │   │
│ │    Summary: Inquiry about partnership opportunities        │   │
│ │    [View Transcript] [Play Recording]                      │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Call Detail (`/admin/ai-team/calls/[callId]`)

Full transcript with speaker labels, timestamps, and ability to play recording segments.

---

## Multi-Tenant Considerations

1. **Per-Tenant API Keys**: Each tenant provides their own ElevenLabs, AssemblyAI, etc. keys
2. **Isolated Phone Numbers**: Each tenant has their own phone numbers
3. **Call Records Scoped**: All call data is tenant-isolated
4. **Usage Tracking**: Track voice API usage per tenant for billing
5. **Separate Retell Agents**: Each tenant gets their own Retell agent configuration

---

## Provider Credentials Storage

```sql
-- Store encrypted credentials per tenant
CREATE TABLE tenant_voice_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

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

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id)
);
```

---

## Background Jobs

| Job | Purpose | Schedule |
|-----|---------|----------|
| `ai-agents/generate-call-summaries` | Generate AI summaries for completed calls | Every 15 min |
| `ai-agents/cleanup-old-recordings` | Archive/delete old call recordings | Daily |
| `ai-agents/sync-retell-agents` | Sync agent configs with Retell | Hourly |

---

## Deliverables Checklist

- [ ] Database schema for voice config, calls, transcripts
- [ ] TTS provider abstraction with ElevenLabs implementation
- [ ] STT provider abstraction with AssemblyAI implementation
- [ ] Retell.ai integration for voice calls
- [ ] Real-time WebSocket LLM endpoint
- [ ] Voice configuration admin UI
- [ ] Call history and transcript UI
- [ ] Webhook handlers for call events
- [ ] Per-tenant credential storage
- [ ] Integration tests

---

## Next Phase

After PHASE-2AI-VOICE:
- **PHASE-2AI-INTEGRATIONS**: Slack, Calendar, Email integrations
- **PHASE-2AI-TEAMS**: Multi-agent teams and org chart
