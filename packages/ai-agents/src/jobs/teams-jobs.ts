/**
 * Background jobs for AI Teams system
 * These jobs handle periodic maintenance tasks
 */

import { withTenant } from '@cgk-platform/db'
import { syncOrgChart, validateOrgChart } from '../org-chart/sync.js'
import { applyFamiliarityDecay } from '../relationships/familiarity.js'
import { archiveOldHandoffs, getHandoffStats } from '../db/handoffs-queries.js'

/**
 * Job: Sync org chart with team changes
 * Schedule: Hourly
 *
 * Synchronizes the org chart with changes to:
 * - team_members table (human employees)
 * - ai_agents table (AI agents)
 */
export async function syncOrgChartJob(tenantId: string): Promise<{
  success: boolean
  result?: {
    humansAdded: number
    aiAgentsAdded: number
    levelsCalculated: boolean
    validation: { valid: boolean; issues: string[] }
  }
  error?: string
}> {
  try {
    const result = await withTenant(tenantId, async () => {
      const syncResult = await syncOrgChart()
      const validation = await validateOrgChart()
      return { ...syncResult, validation }
    })

    return { success: true, result }
  } catch (error) {
    console.error('Org chart sync job failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Job: Apply time decay to familiarity scores
 * Schedule: Daily
 *
 * Reduces familiarity scores for relationships that haven't
 * had recent interactions, ensuring scores reflect recency.
 */
export async function decayFamiliarityJob(tenantId: string): Promise<{
  success: boolean
  decayedCount?: number
  error?: string
}> {
  try {
    const decayedCount = await withTenant(tenantId, async () => {
      return applyFamiliarityDecay()
    })

    return { success: true, decayedCount }
  } catch (error) {
    console.error('Familiarity decay job failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Job: Archive old completed handoffs
 * Schedule: Weekly
 *
 * Removes completed handoffs older than 30 days to keep
 * the handoffs table manageable.
 */
export async function cleanupHandoffsJob(
  tenantId: string,
  daysOld = 30
): Promise<{
  success: boolean
  archivedCount?: number
  stats?: {
    total: number
    pending: number
    accepted: number
    declined: number
    completed: number
    avgTimeToAccept: number | null
  }
  error?: string
}> {
  try {
    const result = await withTenant(tenantId, async () => {
      const archivedCount = await archiveOldHandoffs(daysOld)
      const stats = await getHandoffStats()
      return { archivedCount, stats }
    })

    return { success: true, ...result }
  } catch (error) {
    console.error('Handoff cleanup job failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Job definitions for use with @cgk-platform/jobs
 */
export const teamsJobDefinitions = {
  'ai-agents/sync-org-chart': {
    name: 'ai-agents/sync-org-chart',
    description: 'Sync org chart with team_members and ai_agents tables',
    schedule: '0 * * * *', // Every hour
    handler: syncOrgChartJob,
  },

  'ai-agents/decay-familiarity': {
    name: 'ai-agents/decay-familiarity',
    description: 'Apply time decay to familiarity scores',
    schedule: '0 0 * * *', // Daily at midnight
    handler: decayFamiliarityJob,
  },

  'ai-agents/cleanup-handoffs': {
    name: 'ai-agents/cleanup-handoffs',
    description: 'Archive completed handoffs older than 30 days',
    schedule: '0 0 * * 0', // Weekly on Sunday at midnight
    handler: cleanupHandoffsJob,
  },
}
