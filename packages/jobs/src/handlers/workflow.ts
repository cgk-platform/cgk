/**
 * Workflow Background Jobs
 * PHASE-2H-WORKFLOWS
 *
 * Handles scheduled processing for:
 * - Scheduled actions (every 5 minutes)
 * - Time-elapsed triggers (hourly)
 * - Execution log cleanup (daily)
 * - Snoozed threads processing
 */

import { sql, withTenant } from '@cgk-platform/db'

import { defineJob } from '../define'
import type { Job } from '../types'

// Import workflow engine and inbox utilities dynamically to avoid circular deps.
// admin-core → jobs (dep) and jobs → admin-core (runtime-only) creates a cycle.
// We break it by keeping admin-core out of jobs' package.json and suppressing
// the TS module-not-found error here. The import resolves correctly at runtime.
async function getWorkflowEngine(tenantId: string) {
  // @ts-ignore — TS2307: admin-core excluded from jobs deps to break Turbo
  // cycle; import resolves correctly at runtime (see commit c696a1a)
  const { WorkflowEngine } = await import('@cgk-platform/admin-core/workflow')
  return WorkflowEngine.getInstance(tenantId)
}

async function unsnoozeThreads(tenantId: string) {
  // @ts-ignore — TS2307: admin-core excluded from jobs deps to break Turbo
  // cycle; import resolves correctly at runtime (see commit c696a1a)
  const { unsnoozeThreads } = await import('@cgk-platform/admin-core/inbox')
  return unsnoozeThreads(tenantId)
}

// ============================================================
// Job: Process Scheduled Actions (Every 5 minutes)
// ============================================================

export interface ProcessScheduledActionsPayload {
  tenantId: string
}

export const processScheduledActionsJob = defineJob<ProcessScheduledActionsPayload>({
  name: 'workflow/process-scheduled-actions',
  handler: async (job: Job<ProcessScheduledActionsPayload>) => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId is required', retryable: false },
      }
    }

    try {
      const engine = await getWorkflowEngine(tenantId)
      await engine.loadRules()
      await engine.processScheduledActions()

      console.log(`[workflow/process-scheduled-actions] tenantId=${tenantId} completed`)

      return {
        success: true,
        data: { processed: true },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[workflow/process-scheduled-actions] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },
})

// ============================================================
// Job: Check Time-Elapsed Triggers (Hourly)
// ============================================================

export interface CheckTimeElapsedTriggersPayload {
  tenantId: string
  entityType?: string
}

export const checkTimeElapsedTriggersJob = defineJob<CheckTimeElapsedTriggersPayload>({
  name: 'workflow/check-time-elapsed-triggers',
  handler: async (job: Job<CheckTimeElapsedTriggersPayload>) => {
    const { tenantId, entityType } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId is required', retryable: false },
      }
    }

    try {
      const engine = await getWorkflowEngine(tenantId)
      await engine.loadRules()

      // Get entities that are in a status with a time-based trigger
      // We fetch entities from projects, orders, creators based on entityType
      const entities = await getEntitiesForTimeElapsedCheck(tenantId, entityType)

      if (entities.length === 0) {
        console.log(`[workflow/check-time-elapsed-triggers] tenantId=${tenantId} no entities to check`)
        return { success: true, data: { checked: 0, triggered: 0 } }
      }

      const executions = await engine.checkTimeElapsedTriggers(entities)

      console.log(
        `[workflow/check-time-elapsed-triggers] tenantId=${tenantId} checked=${entities.length} triggered=${executions.length}`
      )

      return {
        success: true,
        data: { checked: entities.length, triggered: executions.length },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[workflow/check-time-elapsed-triggers] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: {
    maxAttempts: 2,
  },
})

/**
 * Get entities for time-elapsed trigger checking
 */
async function getEntitiesForTimeElapsedCheck(
  tenantId: string,
  entityType?: string
): Promise<Array<{
  entityType: string
  entityId: string
  status: string
  statusChangedAt: Date
  entity: Record<string, unknown>
}>> {
  return withTenant(tenantId, async () => {
    const entities: Array<{
      entityType: string
      entityId: string
      status: string
      statusChangedAt: Date
      entity: Record<string, unknown>
    }> = []

    // Check projects (if no filter or filter is 'project')
    if (!entityType || entityType === 'project') {
      const projects = await sql`
        SELECT id, status, status_changed_at, title, created_at, updated_at
        FROM projects
        WHERE status NOT IN ('completed', 'cancelled', 'archived')
          AND status_changed_at IS NOT NULL
        LIMIT 500
      `
      for (const row of projects.rows) {
        entities.push({
          entityType: 'project',
          entityId: row.id as string,
          status: row.status as string,
          statusChangedAt: new Date(row.status_changed_at as string),
          entity: row as Record<string, unknown>,
        })
      }
    }

    // Check orders (if no filter or filter is 'order')
    if (!entityType || entityType === 'order') {
      const orders = await sql`
        SELECT id, status, status_changed_at, total_price, created_at, updated_at
        FROM orders
        WHERE status NOT IN ('fulfilled', 'cancelled', 'refunded')
          AND status_changed_at IS NOT NULL
        LIMIT 500
      `
      for (const row of orders.rows) {
        entities.push({
          entityType: 'order',
          entityId: row.id as string,
          status: row.status as string,
          statusChangedAt: new Date(row.status_changed_at as string),
          entity: row as Record<string, unknown>,
        })
      }
    }

    // Check creators (if no filter or filter is 'creator')
    if (!entityType || entityType === 'creator') {
      const creators = await sql`
        SELECT id, status, status_changed_at, name, email, created_at, updated_at
        FROM creators
        WHERE status NOT IN ('active', 'terminated', 'rejected')
          AND status_changed_at IS NOT NULL
        LIMIT 500
      `
      for (const row of creators.rows) {
        entities.push({
          entityType: 'creator',
          entityId: row.id as string,
          status: row.status as string,
          statusChangedAt: new Date(row.status_changed_at as string),
          entity: row as Record<string, unknown>,
        })
      }
    }

    return entities
  })
}

// ============================================================
// Job: Clean Up Execution Logs (Daily)
// ============================================================

export interface CleanupExecutionLogsPayload {
  tenantId: string
  retentionDays?: number
}

export const cleanupExecutionLogsJob = defineJob<CleanupExecutionLogsPayload>({
  name: 'workflow/cleanup-execution-logs',
  handler: async (job: Job<CleanupExecutionLogsPayload>) => {
    const { tenantId, retentionDays = 90 } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId is required', retryable: false },
      }
    }

    try {
      const deleted = await withTenant(tenantId, async () => {
        // Delete old workflow executions
        const executionsResult = await sql`
          DELETE FROM workflow_executions
          WHERE completed_at IS NOT NULL
            AND completed_at < NOW() - INTERVAL '1 day' * ${retentionDays}
          RETURNING id
        `

        // Delete old scheduled actions that were executed or cancelled
        const actionsResult = await sql`
          DELETE FROM scheduled_actions
          WHERE status IN ('executed', 'cancelled', 'failed')
            AND (executed_at < NOW() - INTERVAL '1 day' * ${retentionDays}
                 OR cancelled_at < NOW() - INTERVAL '1 day' * ${retentionDays})
          RETURNING id
        `

        // Delete old entity workflow state for completed executions
        const stateResult = await sql`
          DELETE FROM entity_workflow_state
          WHERE last_execution_at < NOW() - INTERVAL '1 day' * ${retentionDays}
          RETURNING entity_id
        `

        return {
          executions: executionsResult.rows.length,
          actions: actionsResult.rows.length,
          states: stateResult.rows.length,
        }
      })

      console.log(
        `[workflow/cleanup-execution-logs] tenantId=${tenantId} deleted: executions=${deleted.executions} actions=${deleted.actions} states=${deleted.states}`
      )

      return {
        success: true,
        data: deleted,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[workflow/cleanup-execution-logs] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: {
    maxAttempts: 2,
  },
})

// ============================================================
// Job: Process Snoozed Threads (Every 5 minutes)
// ============================================================

export interface ProcessSnoozedThreadsPayload {
  tenantId: string
}

export const processSnoozedThreadsJob = defineJob<ProcessSnoozedThreadsPayload>({
  name: 'workflow/process-snoozed-threads',
  handler: async (job: Job<ProcessSnoozedThreadsPayload>) => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId is required', retryable: false },
      }
    }

    try {
      // Unsnooze threads that are past their snooze date
      const unsnoozedCount = await unsnoozeThreads(tenantId)

      console.log(`[workflow/process-snoozed-threads] tenantId=${tenantId} unsnoozed=${unsnoozedCount}`)

      return {
        success: true,
        data: { unsnoozed: unsnoozedCount },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[workflow/process-snoozed-threads] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: {
    maxAttempts: 2,
  },
})

// ============================================================
// Export all workflow jobs
// ============================================================

export const workflowJobs = {
  processScheduledActions: processScheduledActionsJob,
  checkTimeElapsedTriggers: checkTimeElapsedTriggersJob,
  cleanupExecutionLogs: cleanupExecutionLogsJob,
  processSnoozedThreads: processSnoozedThreadsJob,
}
