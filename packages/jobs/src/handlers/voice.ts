/**
 * Voice-related background jobs for AI agents
 *
 * Handles:
 * - Call summary generation
 * - Recording cleanup
 * - Retell agent sync
 * - Voice usage processing for billing
 */

import { sql, withTenant } from '@cgk-platform/db'

import { defineJob } from '../define.js'
import type { JobResult } from '../types.js'

/**
 * Generate AI summaries for completed calls
 *
 * Runs every 15 minutes to process calls that have ended
 * but don't have a summary yet.
 */
export const generateCallSummariesJob = defineJob({
  name: 'ai-agents/generate-call-summaries',
  handler: async (job): Promise<JobResult> => {
    const { tenantId } = job.payload as { tenantId: string }

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId is required', retryable: false } }
    }

    try {
      const { listVoiceCalls, updateVoiceCall, getFullTranscriptText } = await import('@cgk-platform/ai-agents/voice')
      const { getTenantAnthropicClient } = await import('@cgk-platform/integrations')

      // Check if Anthropic is configured
      const anthropic = await getTenantAnthropicClient(tenantId)
      if (!anthropic) {
        console.log(`[ai-agents/generate-call-summaries] Anthropic not configured for tenant ${tenantId}`)
        return { success: true, data: { skipped: 'Anthropic not configured' } }
      }

      // Get completed calls without summaries
      const calls = await listVoiceCalls({
        status: 'completed',
        limit: 20,
      })

      const callsNeedingSummary = calls.filter((c) => !c.summary && c.durationSeconds && c.durationSeconds > 30)

      if (callsNeedingSummary.length === 0) {
        return { success: true, data: { processed: 0 } }
      }

      let summarized = 0

      for (const call of callsNeedingSummary) {
        try {
          // Get transcript
          const transcript = await getFullTranscriptText(call.id)

          if (!transcript || transcript.length < 50) {
            continue // Skip calls with no/short transcripts
          }

          // Generate summary
          const response = await anthropic.createMessage({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: `Summarize this phone call transcript in 2-3 sentences. Include the main topic discussed and any action items or outcomes.\n\nTranscript:\n${transcript.substring(0, 4000)}`,
              },
            ],
          })

          const summary = response.content[0]?.text?.trim()

          if (summary) {
            await updateVoiceCall(call.id, { summary })
            summarized++
          }
        } catch (callError) {
          console.error(
            `[ai-agents/generate-call-summaries] Error summarizing call ${call.id}:`,
            callError instanceof Error ? callError.message : 'Unknown error'
          )
        }
      }

      console.log(`[ai-agents/generate-call-summaries] tenantId=${tenantId} summarized=${summarized}`)

      return {
        success: true,
        data: { checked: callsNeedingSummary.length, summarized },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[ai-agents/generate-call-summaries] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 3 },
})

/**
 * Cleanup old call recordings
 *
 * Runs daily to archive or delete recordings older than retention period.
 */
export const cleanupOldRecordingsJob = defineJob({
  name: 'ai-agents/cleanup-old-recordings',
  handler: async (job) => {
    const { tenantId, retentionDays = 90 } = job.payload as {
      tenantId: string
      retentionDays?: number
    }

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId is required', retryable: false } }
    }

    try {
      const deleted = await withTenant(tenantId, async () => {
        // Delete old voice calls and their associated data
        // First, get calls to delete
        const oldCalls = await sql`
          SELECT id FROM voice_calls
          WHERE ended_at IS NOT NULL
            AND ended_at < NOW() - INTERVAL '1 day' * ${retentionDays}
          LIMIT 100
        `

        if (oldCalls.rows.length === 0) {
          return { calls: 0, transcripts: 0, responses: 0 }
        }

        const callIds = oldCalls.rows.map((r) => r.id as string)
        const callIdsArray = `{${callIds.join(',')}}`

        // Delete transcripts first (FK constraint)
        const transcriptsResult = await sql`
          DELETE FROM voice_transcripts
          WHERE call_id = ANY(${callIdsArray}::text[])
          RETURNING id
        `

        // Delete responses
        const responsesResult = await sql`
          DELETE FROM voice_responses
          WHERE call_id = ANY(${callIdsArray}::text[])
          RETURNING id
        `

        // Delete calls
        const callsResult = await sql`
          DELETE FROM voice_calls
          WHERE id = ANY(${callIdsArray}::text[])
          RETURNING id
        `

        return {
          calls: callsResult.rows.length,
          transcripts: transcriptsResult.rows.length,
          responses: responsesResult.rows.length,
        }
      })

      console.log(
        `[ai-agents/cleanup-old-recordings] tenantId=${tenantId} deleted: calls=${deleted.calls} transcripts=${deleted.transcripts} responses=${deleted.responses}`
      )

      return {
        success: true,
        data: deleted,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[ai-agents/cleanup-old-recordings] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 2 },
})

/**
 * Sync agent configurations with Retell
 *
 * Runs hourly to ensure Retell agents are in sync with our configuration.
 */
export const syncRetellAgentsJob = defineJob({
  name: 'ai-agents/sync-retell-agents',
  handler: async (job): Promise<JobResult> => {
    const { tenantId } = job.payload as { tenantId: string }

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId is required', retryable: false } }
    }

    try {
      const { getVoiceCredentials } = await import('@cgk-platform/ai-agents/voice')

      // Get tenant's Retell credentials
      const credentials = await getVoiceCredentials(tenantId)

      if (!credentials?.retellApiKeyEncrypted) {
        console.log(`[ai-agents/sync-retell-agents] Retell not configured for tenant ${tenantId}`)
        return { success: true, data: { skipped: 'Retell not configured' } }
      }

      // Get all AI agents that use voice calls
      const agents = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT id, name, voice_config, retell_agent_id
          FROM ai_agents
          WHERE voice_enabled = true
        `
        return result.rows
      })

      if (agents.length === 0) {
        return { success: true, data: { synced: 0 } }
      }

      let synced = 0

      for (const agent of agents) {
        try {
          // If agent has retell_agent_id, verify it still exists
          // For now, just log the sync - actual Retell API calls would go here
          console.log(`[ai-agents/sync-retell-agents] Would sync agent ${agent.id} (${agent.name})`)
          synced++
        } catch (agentError) {
          console.error(
            `[ai-agents/sync-retell-agents] Error syncing agent ${agent.id}:`,
            agentError instanceof Error ? agentError.message : 'Unknown error'
          )
        }
      }

      console.log(`[ai-agents/sync-retell-agents] tenantId=${tenantId} synced=${synced}`)

      return {
        success: true,
        data: { checked: agents.length, synced },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[ai-agents/sync-retell-agents] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 3 },
})

/**
 * Process voice usage for billing
 *
 * Runs daily to calculate voice API usage costs.
 */
export const processVoiceUsageJob = defineJob({
  name: 'ai-agents/process-voice-usage',
  handler: async (job) => {
    const { tenantId, periodStart, periodEnd } = job.payload as {
      tenantId: string
      periodStart: string
      periodEnd: string
    }

    if (!tenantId || !periodStart || !periodEnd) {
      return {
        success: false,
        error: {
          message: 'tenantId, periodStart, and periodEnd are required',
          retryable: false,
        },
      }
    }

    try {
      const usage = await withTenant(tenantId, async () => {
        // Calculate total voice minutes for the period
        const callsResult = await sql`
          SELECT
            COUNT(*) as call_count,
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_count,
            COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_count
          FROM voice_calls
          WHERE ended_at >= ${periodStart}::timestamp
            AND ended_at < ${periodEnd}::timestamp
        `

        const stats = callsResult.rows[0] as {
          call_count: string
          total_seconds: string
          inbound_count: string
          outbound_count: string
        }

        const totalMinutes = Math.ceil(parseInt(stats.total_seconds || '0') / 60)

        // Calculate costs (example rates)
        const COST_PER_MINUTE = 0.015 // $0.015 per minute
        const totalCost = totalMinutes * COST_PER_MINUTE

        // Store usage record
        await sql`
          INSERT INTO voice_usage_records (
            period_start,
            period_end,
            call_count,
            total_minutes,
            inbound_calls,
            outbound_calls,
            total_cost_cents
          ) VALUES (
            ${periodStart}::timestamp,
            ${periodEnd}::timestamp,
            ${parseInt(stats.call_count || '0')},
            ${totalMinutes},
            ${parseInt(stats.inbound_count || '0')},
            ${parseInt(stats.outbound_count || '0')},
            ${Math.round(totalCost * 100)}
          )
          ON CONFLICT (period_start, period_end)
          DO UPDATE SET
            call_count = EXCLUDED.call_count,
            total_minutes = EXCLUDED.total_minutes,
            inbound_calls = EXCLUDED.inbound_calls,
            outbound_calls = EXCLUDED.outbound_calls,
            total_cost_cents = EXCLUDED.total_cost_cents,
            updated_at = NOW()
        `

        return {
          callCount: parseInt(stats.call_count || '0'),
          totalMinutes,
          inboundCalls: parseInt(stats.inbound_count || '0'),
          outboundCalls: parseInt(stats.outbound_count || '0'),
          totalCostCents: Math.round(totalCost * 100),
        }
      })

      console.log(
        `[ai-agents/process-voice-usage] tenantId=${tenantId} period=${periodStart} to ${periodEnd}: calls=${usage.callCount} minutes=${usage.totalMinutes} cost=$${(usage.totalCostCents / 100).toFixed(2)}`
      )

      return {
        success: true,
        data: usage,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[ai-agents/process-voice-usage] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 2 },
})

/**
 * Export all voice-related jobs
 */
export const voiceJobs = {
  generateCallSummaries: generateCallSummariesJob,
  cleanupOldRecordings: cleanupOldRecordingsJob,
  syncRetellAgents: syncRetellAgentsJob,
  processVoiceUsage: processVoiceUsageJob,
}
