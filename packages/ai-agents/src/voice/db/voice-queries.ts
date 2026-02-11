/**
 * Database queries for voice system
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries expect to be run within withTenant() context
 */

import { sql } from '@cgk/db'
import type {
  AgentVoiceConfig,
  CreateTranscriptInput,
  CreateVoiceCallInput,
  CreateVoiceConfigInput,
  CreateVoiceResponseInput,
  TenantVoiceCredentials,
  UpdateVoiceCallInput,
  UpdateVoiceConfigInput,
  UpdateVoiceCredentialsInput,
  VoiceCall,
  VoiceCallFilters,
  VoiceCallStats,
  VoiceResponse,
  VoiceTranscript,
} from '../types.js'

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result
}

// ============================================================================
// Voice Configuration
// ============================================================================

/**
 * Get voice configuration for an agent
 */
export async function getVoiceConfig(agentId: string): Promise<AgentVoiceConfig | null> {
  const result = await sql`
    SELECT * FROM agent_voice_config WHERE agent_id = ${agentId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentVoiceConfig) : null
}

/**
 * Create voice configuration for an agent
 */
export async function createVoiceConfig(
  tenantId: string,
  input: CreateVoiceConfigInput
): Promise<AgentVoiceConfig> {
  const result = await sql`
    INSERT INTO agent_voice_config (
      tenant_id, agent_id,
      tts_provider, tts_voice_id, tts_voice_name, tts_fallback_provider,
      stt_provider, stt_language, stt_model,
      speaking_rate, pitch, volume_gain_db,
      phone_number, voicemail_enabled, voicemail_greeting, max_call_duration_minutes
    )
    VALUES (
      ${tenantId},
      ${input.agentId},
      ${input.ttsProvider || 'elevenlabs'},
      ${input.ttsVoiceId || null},
      ${input.ttsVoiceName || null},
      ${input.ttsFallbackProvider || null},
      ${input.sttProvider || 'assemblyai'},
      ${input.sttLanguage || 'en'},
      ${input.sttModel || null},
      ${input.speakingRate ?? 1.0},
      ${input.pitch ?? 0.0},
      ${input.volumeGainDb ?? 0.0},
      ${input.phoneNumber || null},
      ${input.voicemailEnabled ?? true},
      ${input.voicemailGreeting || null},
      ${input.maxCallDurationMinutes ?? 30}
    )
    ON CONFLICT (agent_id) DO UPDATE SET
      tts_provider = EXCLUDED.tts_provider,
      tts_voice_id = EXCLUDED.tts_voice_id,
      tts_voice_name = EXCLUDED.tts_voice_name,
      tts_fallback_provider = EXCLUDED.tts_fallback_provider,
      stt_provider = EXCLUDED.stt_provider,
      stt_language = EXCLUDED.stt_language,
      stt_model = EXCLUDED.stt_model,
      speaking_rate = EXCLUDED.speaking_rate,
      pitch = EXCLUDED.pitch,
      volume_gain_db = EXCLUDED.volume_gain_db,
      phone_number = EXCLUDED.phone_number,
      voicemail_enabled = EXCLUDED.voicemail_enabled,
      voicemail_greeting = EXCLUDED.voicemail_greeting,
      max_call_duration_minutes = EXCLUDED.max_call_duration_minutes,
      updated_at = NOW()
    RETURNING *
  `
  return toCamelCase(result.rows[0]) as AgentVoiceConfig
}

/**
 * Update voice configuration for an agent
 */
export async function updateVoiceConfig(
  agentId: string,
  input: UpdateVoiceConfigInput
): Promise<AgentVoiceConfig | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.ttsProvider !== undefined) {
    sets.push(`tts_provider = $${paramIndex++}`)
    values.push(input.ttsProvider)
  }
  if (input.ttsVoiceId !== undefined) {
    sets.push(`tts_voice_id = $${paramIndex++}`)
    values.push(input.ttsVoiceId)
  }
  if (input.ttsVoiceName !== undefined) {
    sets.push(`tts_voice_name = $${paramIndex++}`)
    values.push(input.ttsVoiceName)
  }
  if (input.ttsFallbackProvider !== undefined) {
    sets.push(`tts_fallback_provider = $${paramIndex++}`)
    values.push(input.ttsFallbackProvider)
  }
  if (input.sttProvider !== undefined) {
    sets.push(`stt_provider = $${paramIndex++}`)
    values.push(input.sttProvider)
  }
  if (input.sttLanguage !== undefined) {
    sets.push(`stt_language = $${paramIndex++}`)
    values.push(input.sttLanguage)
  }
  if (input.sttModel !== undefined) {
    sets.push(`stt_model = $${paramIndex++}`)
    values.push(input.sttModel)
  }
  if (input.speakingRate !== undefined) {
    sets.push(`speaking_rate = $${paramIndex++}`)
    values.push(input.speakingRate)
  }
  if (input.pitch !== undefined) {
    sets.push(`pitch = $${paramIndex++}`)
    values.push(input.pitch)
  }
  if (input.volumeGainDb !== undefined) {
    sets.push(`volume_gain_db = $${paramIndex++}`)
    values.push(input.volumeGainDb)
  }
  if (input.phoneNumber !== undefined) {
    sets.push(`phone_number = $${paramIndex++}`)
    values.push(input.phoneNumber)
  }
  if (input.voicemailEnabled !== undefined) {
    sets.push(`voicemail_enabled = $${paramIndex++}`)
    values.push(input.voicemailEnabled)
  }
  if (input.voicemailGreeting !== undefined) {
    sets.push(`voicemail_greeting = $${paramIndex++}`)
    values.push(input.voicemailGreeting)
  }
  if (input.maxCallDurationMinutes !== undefined) {
    sets.push(`max_call_duration_minutes = $${paramIndex++}`)
    values.push(input.maxCallDurationMinutes)
  }
  if (input.retellAgentId !== undefined) {
    sets.push(`retell_agent_id = $${paramIndex++}`)
    values.push(input.retellAgentId)
  }

  if (sets.length === 0) {
    return getVoiceConfig(agentId)
  }

  sets.push('updated_at = NOW()')
  values.push(agentId)

  const result = await sql.query(
    `UPDATE agent_voice_config SET ${sets.join(', ')} WHERE agent_id = $${paramIndex} RETURNING *`,
    values
  )

  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentVoiceConfig) : null
}

// ============================================================================
// Voice Calls
// ============================================================================

/**
 * Create a voice call record
 */
export async function createVoiceCall(
  tenantId: string,
  input: CreateVoiceCallInput
): Promise<VoiceCall> {
  const result = await sql`
    INSERT INTO agent_voice_calls (
      tenant_id, agent_id, call_sid, provider,
      direction, from_number, to_number, caller_name,
      creator_id, contact_id, status
    )
    VALUES (
      ${tenantId},
      ${input.agentId},
      ${input.callSid},
      ${input.provider},
      ${input.direction},
      ${input.fromNumber || null},
      ${input.toNumber || null},
      ${input.callerName || null},
      ${input.creatorId || null},
      ${input.contactId || null},
      'initiated'
    )
    RETURNING *
  `
  const row = toCamelCase(result.rows[0]) as VoiceCall & { actionItems?: unknown }
  row.actionItems = row.actionItems ? (row.actionItems as VoiceCall['actionItems']) : []
  return row as VoiceCall
}

/**
 * Get a voice call by ID
 */
export async function getVoiceCall(callId: string): Promise<VoiceCall | null> {
  const result = await sql`
    SELECT * FROM agent_voice_calls WHERE id = ${callId}
  `
  if (!result.rows[0]) return null
  const row = toCamelCase(result.rows[0]) as VoiceCall & { actionItems?: unknown }
  row.actionItems = row.actionItems ? (row.actionItems as VoiceCall['actionItems']) : []
  return row as VoiceCall
}

/**
 * Get a voice call by call SID
 */
export async function getVoiceCallBySid(callSid: string): Promise<VoiceCall | null> {
  const result = await sql`
    SELECT * FROM agent_voice_calls WHERE call_sid = ${callSid}
  `
  if (!result.rows[0]) return null
  const row = toCamelCase(result.rows[0]) as VoiceCall & { actionItems?: unknown }
  row.actionItems = row.actionItems ? (row.actionItems as VoiceCall['actionItems']) : []
  return row as VoiceCall
}

/**
 * Update a voice call
 */
export async function updateVoiceCall(
  callId: string,
  input: UpdateVoiceCallInput
): Promise<VoiceCall | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.status !== undefined) {
    sets.push(`status = $${paramIndex++}`)
    values.push(input.status)
  }
  if (input.answeredAt !== undefined) {
    sets.push(`answered_at = $${paramIndex++}`)
    values.push(input.answeredAt.toISOString())
  }
  if (input.endedAt !== undefined) {
    sets.push(`ended_at = $${paramIndex++}`)
    values.push(input.endedAt.toISOString())
  }
  if (input.durationSeconds !== undefined) {
    sets.push(`duration_seconds = $${paramIndex++}`)
    values.push(input.durationSeconds)
  }
  if (input.recordingUrl !== undefined) {
    sets.push(`recording_url = $${paramIndex++}`)
    values.push(input.recordingUrl)
  }
  if (input.recordingDurationSeconds !== undefined) {
    sets.push(`recording_duration_seconds = $${paramIndex++}`)
    values.push(input.recordingDurationSeconds)
  }
  if (input.summary !== undefined) {
    sets.push(`summary = $${paramIndex++}`)
    values.push(input.summary)
  }
  if (input.sentiment !== undefined) {
    sets.push(`sentiment = $${paramIndex++}`)
    values.push(input.sentiment)
  }
  if (input.actionItems !== undefined) {
    sets.push(`action_items = $${paramIndex++}`)
    values.push(JSON.stringify(input.actionItems))
  }

  if (sets.length === 0) {
    return getVoiceCall(callId)
  }

  values.push(callId)
  const result = await sql.query(
    `UPDATE agent_voice_calls SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  )

  if (!result.rows[0]) return null
  const row = toCamelCase(result.rows[0]) as VoiceCall & { actionItems?: unknown }
  row.actionItems = row.actionItems ? (row.actionItems as VoiceCall['actionItems']) : []
  return row as VoiceCall
}

/**
 * Update voice call by SID
 */
export async function updateVoiceCallBySid(
  callSid: string,
  input: UpdateVoiceCallInput
): Promise<VoiceCall | null> {
  const call = await getVoiceCallBySid(callSid)
  if (!call) return null
  return updateVoiceCall(call.id, input)
}

/**
 * List voice calls with filters
 */
export async function listVoiceCalls(filters: VoiceCallFilters = {}): Promise<VoiceCall[]> {
  const conditions: string[] = ['1=1']
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.agentId) {
    conditions.push(`agent_id = $${paramIndex++}`)
    values.push(filters.agentId)
  }
  if (filters.direction) {
    conditions.push(`direction = $${paramIndex++}`)
    values.push(filters.direction)
  }
  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`)
    values.push(filters.status)
  }
  if (filters.creatorId) {
    conditions.push(`creator_id = $${paramIndex++}`)
    values.push(filters.creatorId)
  }
  if (filters.contactId) {
    conditions.push(`contact_id = $${paramIndex++}`)
    values.push(filters.contactId)
  }
  if (filters.startDate) {
    conditions.push(`started_at >= $${paramIndex++}`)
    values.push(filters.startDate.toISOString())
  }
  if (filters.endDate) {
    conditions.push(`started_at <= $${paramIndex++}`)
    values.push(filters.endDate.toISOString())
  }

  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const query = `
    SELECT * FROM agent_voice_calls
    WHERE ${conditions.join(' AND ')}
    ORDER BY started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await sql.query(query, values)
  return result.rows.map((row) => {
    const call = toCamelCase(row) as VoiceCall & { actionItems?: unknown }
    call.actionItems = call.actionItems ? (call.actionItems as VoiceCall['actionItems']) : []
    return call as VoiceCall
  })
}

/**
 * Get voice call statistics
 */
export async function getVoiceCallStats(
  filters: { agentId?: string; startDate?: Date; endDate?: Date } = {}
): Promise<VoiceCallStats> {
  const conditions: string[] = ['1=1']
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.agentId) {
    conditions.push(`agent_id = $${paramIndex++}`)
    values.push(filters.agentId)
  }
  if (filters.startDate) {
    conditions.push(`started_at >= $${paramIndex++}`)
    values.push(filters.startDate.toISOString())
  }
  if (filters.endDate) {
    conditions.push(`started_at <= $${paramIndex++}`)
    values.push(filters.endDate.toISOString())
  }

  const query = `
    SELECT
      COUNT(*)::INTEGER as total_calls,
      COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_calls,
      COUNT(*) FILTER (WHERE status = 'missed')::INTEGER as missed_calls,
      COALESCE(AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL), 0)::INTEGER as avg_duration_seconds,
      COALESCE(SUM(duration_seconds), 0)::INTEGER as total_duration_seconds,
      COUNT(*) FILTER (WHERE direction = 'inbound')::INTEGER as inbound_calls,
      COUNT(*) FILTER (WHERE direction = 'outbound')::INTEGER as outbound_calls,
      COALESCE(
        (COUNT(*) FILTER (WHERE sentiment = 'positive')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE sentiment IS NOT NULL), 0)) * 100,
        0
      )::INTEGER as positive_call_percent,
      COALESCE(
        (COUNT(*) FILTER (WHERE sentiment = 'negative')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE sentiment IS NOT NULL), 0)) * 100,
        0
      )::INTEGER as negative_call_percent
    FROM agent_voice_calls
    WHERE ${conditions.join(' AND ')}
  `

  const result = await sql.query(query, values)
  return toCamelCase(result.rows[0]) as VoiceCallStats
}

// ============================================================================
// Transcripts
// ============================================================================

/**
 * Create a transcript entry
 */
export async function createTranscript(
  tenantId: string,
  input: CreateTranscriptInput
): Promise<VoiceTranscript> {
  const result = await sql`
    INSERT INTO agent_voice_transcripts (
      tenant_id, call_id, speaker, speaker_name, text, confidence,
      started_at, ended_at, duration_ms, is_final
    )
    VALUES (
      ${tenantId},
      ${input.callId},
      ${input.speaker},
      ${input.speakerName || null},
      ${input.text},
      ${input.confidence ?? null},
      ${input.startedAt.toISOString()},
      ${input.endedAt?.toISOString() || null},
      ${input.durationMs ?? null},
      ${input.isFinal ?? true}
    )
    RETURNING *
  `
  return toCamelCase(result.rows[0]) as VoiceTranscript
}

/**
 * Get transcripts for a call
 */
export async function getCallTranscripts(callId: string): Promise<VoiceTranscript[]> {
  const result = await sql`
    SELECT * FROM agent_voice_transcripts
    WHERE call_id = ${callId}
    ORDER BY started_at ASC
  `
  return result.rows.map((row) => toCamelCase(row) as VoiceTranscript)
}

/**
 * Get full transcript text for a call
 */
export async function getFullTranscriptText(callId: string): Promise<string> {
  const transcripts = await getCallTranscripts(callId)
  return transcripts
    .filter((t) => t.isFinal)
    .map((t) => `${t.speakerName || t.speaker}: ${t.text}`)
    .join('\n')
}

// ============================================================================
// Voice Responses
// ============================================================================

/**
 * Create a voice response record
 */
export async function createVoiceResponse(
  tenantId: string,
  input: CreateVoiceResponseInput
): Promise<VoiceResponse> {
  const result = await sql`
    INSERT INTO agent_voice_responses (
      tenant_id, call_id, response_text, source_transcript,
      tools_used, audio_url, audio_duration_ms
    )
    VALUES (
      ${tenantId},
      ${input.callId},
      ${input.responseText},
      ${input.sourceTranscript || null},
      ${input.toolsUsed || []},
      ${input.audioUrl || null},
      ${input.audioDurationMs ?? null}
    )
    RETURNING *
  `
  return toCamelCase(result.rows[0]) as VoiceResponse
}

/**
 * Get voice responses for a call
 */
export async function getCallResponses(callId: string): Promise<VoiceResponse[]> {
  const result = await sql`
    SELECT * FROM agent_voice_responses
    WHERE call_id = ${callId}
    ORDER BY created_at ASC
  `
  return result.rows.map((row) => toCamelCase(row) as VoiceResponse)
}

// ============================================================================
// Tenant Voice Credentials
// ============================================================================

/**
 * Get voice credentials for a tenant (from public schema)
 */
export async function getVoiceCredentials(
  tenantId: string
): Promise<TenantVoiceCredentials | null> {
  // This queries the public schema directly since credentials are platform-level
  const result = await sql`
    SELECT * FROM public.tenant_voice_credentials WHERE tenant_id = ${tenantId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as TenantVoiceCredentials) : null
}

/**
 * Update voice credentials for a tenant
 */
export async function updateVoiceCredentials(
  tenantId: string,
  input: UpdateVoiceCredentialsInput
): Promise<TenantVoiceCredentials> {
  // Note: In production, these should be encrypted before storage
  const result = await sql`
    INSERT INTO public.tenant_voice_credentials (
      tenant_id,
      elevenlabs_api_key_encrypted,
      assemblyai_api_key_encrypted,
      openai_api_key_encrypted,
      retell_api_key_encrypted,
      retell_phone_number,
      google_service_account_encrypted
    )
    VALUES (
      ${tenantId},
      ${input.elevenlabsApiKey || null},
      ${input.assemblyaiApiKey || null},
      ${input.openaiApiKey || null},
      ${input.retellApiKey || null},
      ${input.retellPhoneNumber || null},
      ${input.googleServiceAccount || null}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      elevenlabs_api_key_encrypted = COALESCE(EXCLUDED.elevenlabs_api_key_encrypted, tenant_voice_credentials.elevenlabs_api_key_encrypted),
      assemblyai_api_key_encrypted = COALESCE(EXCLUDED.assemblyai_api_key_encrypted, tenant_voice_credentials.assemblyai_api_key_encrypted),
      openai_api_key_encrypted = COALESCE(EXCLUDED.openai_api_key_encrypted, tenant_voice_credentials.openai_api_key_encrypted),
      retell_api_key_encrypted = COALESCE(EXCLUDED.retell_api_key_encrypted, tenant_voice_credentials.retell_api_key_encrypted),
      retell_phone_number = COALESCE(EXCLUDED.retell_phone_number, tenant_voice_credentials.retell_phone_number),
      google_service_account_encrypted = COALESCE(EXCLUDED.google_service_account_encrypted, tenant_voice_credentials.google_service_account_encrypted),
      updated_at = NOW()
    RETURNING *
  `
  return toCamelCase(result.rows[0]) as TenantVoiceCredentials
}
