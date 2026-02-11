/**
 * Workflow Rule CRUD Operations
 * PHASE-2H-WORKFLOWS
 */

import { sql, withTenant } from '@cgk/db'

import type {
  CreateWorkflowRuleInput,
  UpdateWorkflowRuleInput,
  WorkflowExecution,
  WorkflowRule,
  ScheduledAction,
} from './types'

// ============================================================
// Rule CRUD
// ============================================================

/**
 * Get all workflow rules for a tenant
 */
export async function getWorkflowRules(
  tenantId: string,
  filters?: {
    isActive?: boolean
    triggerType?: string
    entityType?: string
  }
): Promise<WorkflowRule[]> {
  return withTenant(tenantId, async () => {
    let query = sql`
      SELECT
        r.*,
        u1.name as created_by_name,
        u2.name as updated_by_name
      FROM workflow_rules r
      LEFT JOIN public.users u1 ON u1.id = r.created_by
      LEFT JOIN public.users u2 ON u2.id = r.updated_by
      WHERE 1=1
    `

    if (filters?.isActive !== undefined) {
      query = sql`${query} AND r.is_active = ${filters.isActive}`
    }

    if (filters?.triggerType) {
      query = sql`${query} AND r.trigger_type = ${filters.triggerType}`
    }

    if (filters?.entityType) {
      query = sql`${query} AND (r.entity_types = '{}' OR ${filters.entityType} = ANY(r.entity_types))`
    }

    query = sql`${query} ORDER BY r.priority DESC, r.created_at ASC`

    const result = await query

    return result.rows.map(mapRuleFromDb)
  })
}

/**
 * Get a single workflow rule by ID
 */
export async function getWorkflowRule(
  tenantId: string,
  ruleId: string
): Promise<WorkflowRule | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        r.*,
        u1.name as created_by_name,
        u2.name as updated_by_name
      FROM workflow_rules r
      LEFT JOIN public.users u1 ON u1.id = r.created_by
      LEFT JOIN public.users u2 ON u2.id = r.updated_by
      WHERE r.id = ${ruleId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapRuleFromDb(result.rows[0])
  })
}

/**
 * Create a new workflow rule
 */
export async function createWorkflowRule(
  tenantId: string,
  input: CreateWorkflowRuleInput,
  userId: string
): Promise<WorkflowRule> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO workflow_rules (
        name, description, is_active, priority,
        trigger_type, trigger_config, conditions, actions,
        cooldown_hours, max_executions, requires_approval, approver_role,
        entity_types, created_by
      ) VALUES (
        ${input.name},
        ${input.description || null},
        ${input.isActive ?? true},
        ${input.priority ?? 10},
        ${input.triggerType},
        ${JSON.stringify(input.triggerConfig)},
        ${JSON.stringify(input.conditions || [])},
        ${JSON.stringify(input.actions)},
        ${input.cooldownHours || null},
        ${input.maxExecutions || null},
        ${input.requiresApproval ?? false},
        ${input.approverRole || null},
        ${input.entityTypes || []},
        ${userId}
      )
      RETURNING *
    `

    return mapRuleFromDb(result.rows[0])
  })
}

/**
 * Update a workflow rule
 */
export async function updateWorkflowRule(
  tenantId: string,
  ruleId: string,
  input: UpdateWorkflowRuleInput,
  userId: string
): Promise<WorkflowRule | null> {
  return withTenant(tenantId, async () => {
    // Build update query dynamically
    const updates: string[] = []
    const values: unknown[] = []

    if (input.name !== undefined) {
      values.push(input.name)
      updates.push(`name = $${values.length}`)
    }

    if (input.description !== undefined) {
      values.push(input.description)
      updates.push(`description = $${values.length}`)
    }

    if (input.isActive !== undefined) {
      values.push(input.isActive)
      updates.push(`is_active = $${values.length}`)
    }

    if (input.priority !== undefined) {
      values.push(input.priority)
      updates.push(`priority = $${values.length}`)
    }

    if (input.triggerType !== undefined) {
      values.push(input.triggerType)
      updates.push(`trigger_type = $${values.length}`)
    }

    if (input.triggerConfig !== undefined) {
      values.push(JSON.stringify(input.triggerConfig))
      updates.push(`trigger_config = $${values.length}`)
    }

    if (input.conditions !== undefined) {
      values.push(JSON.stringify(input.conditions))
      updates.push(`conditions = $${values.length}`)
    }

    if (input.actions !== undefined) {
      values.push(JSON.stringify(input.actions))
      updates.push(`actions = $${values.length}`)
    }

    if (input.cooldownHours !== undefined) {
      values.push(input.cooldownHours)
      updates.push(`cooldown_hours = $${values.length}`)
    }

    if (input.maxExecutions !== undefined) {
      values.push(input.maxExecutions)
      updates.push(`max_executions = $${values.length}`)
    }

    if (input.requiresApproval !== undefined) {
      values.push(input.requiresApproval)
      updates.push(`requires_approval = $${values.length}`)
    }

    if (input.approverRole !== undefined) {
      values.push(input.approverRole)
      updates.push(`approver_role = $${values.length}`)
    }

    if (input.entityTypes !== undefined) {
      values.push(input.entityTypes)
      updates.push(`entity_types = $${values.length}`)
    }

    if (updates.length === 0) {
      return getWorkflowRule(tenantId, ruleId)
    }

    // Add updated_by
    values.push(userId)
    updates.push(`updated_by = $${values.length}`)

    // Add updated_at
    updates.push('updated_at = NOW()')

    const result = await sql`
      UPDATE workflow_rules
      SET ${sql.raw(updates.join(', '))}
      WHERE id = ${ruleId}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapRuleFromDb(result.rows[0])
  })
}

/**
 * Delete a workflow rule
 */
export async function deleteWorkflowRule(
  tenantId: string,
  ruleId: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM workflow_rules
      WHERE id = ${ruleId}
      RETURNING id
    `

    return result.rows.length > 0
  })
}

// ============================================================
// Execution Queries
// ============================================================

/**
 * Get workflow executions with optional filters
 */
export async function getWorkflowExecutions(
  tenantId: string,
  filters?: {
    ruleId?: string
    entityType?: string
    entityId?: string
    result?: string
    limit?: number
    offset?: number
  }
): Promise<{ executions: WorkflowExecution[]; total: number }> {
  return withTenant(tenantId, async () => {
    let whereClause = sql`WHERE 1=1`

    if (filters?.ruleId) {
      whereClause = sql`${whereClause} AND e.rule_id = ${filters.ruleId}`
    }

    if (filters?.entityType) {
      whereClause = sql`${whereClause} AND e.entity_type = ${filters.entityType}`
    }

    if (filters?.entityId) {
      whereClause = sql`${whereClause} AND e.entity_id = ${filters.entityId}`
    }

    if (filters?.result) {
      whereClause = sql`${whereClause} AND e.result = ${filters.result}`
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM workflow_executions e
      ${whereClause}
    `
    const total = parseInt(countResult.rows[0].count as string, 10)

    // Get executions
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    const result = await sql`
      SELECT
        e.*,
        r.name as rule_name
      FROM workflow_executions e
      JOIN workflow_rules r ON r.id = e.rule_id
      ${whereClause}
      ORDER BY e.started_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return {
      executions: result.rows.map(mapExecutionFromDb),
      total,
    }
  })
}

/**
 * Get a single execution by ID
 */
export async function getWorkflowExecution(
  tenantId: string,
  executionId: string
): Promise<WorkflowExecution | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        e.*,
        r.name as rule_name,
        u1.name as approved_by_name,
        u2.name as rejected_by_name
      FROM workflow_executions e
      JOIN workflow_rules r ON r.id = e.rule_id
      LEFT JOIN public.users u1 ON u1.id = e.approved_by
      LEFT JOIN public.users u2 ON u2.id = e.rejected_by
      WHERE e.id = ${executionId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapExecutionFromDb(result.rows[0])
  })
}

// ============================================================
// Scheduled Actions
// ============================================================

/**
 * Get scheduled actions with optional filters
 */
export async function getScheduledActions(
  tenantId: string,
  filters?: {
    status?: string
    entityType?: string
    entityId?: string
    limit?: number
    offset?: number
  }
): Promise<{ actions: ScheduledAction[]; total: number }> {
  return withTenant(tenantId, async () => {
    let whereClause = sql`WHERE 1=1`

    if (filters?.status) {
      whereClause = sql`${whereClause} AND status = ${filters.status}`
    }

    if (filters?.entityType) {
      whereClause = sql`${whereClause} AND entity_type = ${filters.entityType}`
    }

    if (filters?.entityId) {
      whereClause = sql`${whereClause} AND entity_id = ${filters.entityId}`
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM scheduled_actions
      ${whereClause}
    `
    const total = parseInt(countResult.rows[0].count as string, 10)

    // Get actions
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    const result = await sql`
      SELECT *
      FROM scheduled_actions
      ${whereClause}
      ORDER BY scheduled_for ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return {
      actions: result.rows.map(mapScheduledActionFromDb),
      total,
    }
  })
}

// ============================================================
// Mappers
// ============================================================

function mapRuleFromDb(row: Record<string, unknown>): WorkflowRule {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    isActive: row.is_active as boolean,
    priority: row.priority as number,
    triggerType: row.trigger_type as WorkflowRule['triggerType'],
    triggerConfig: row.trigger_config as WorkflowRule['triggerConfig'],
    conditions: (row.conditions as WorkflowRule['conditions']) || [],
    actions: row.actions as WorkflowRule['actions'],
    cooldownHours: row.cooldown_hours as number | null,
    maxExecutions: row.max_executions as number | null,
    requiresApproval: row.requires_approval as boolean,
    approverRole: row.approver_role as string | null,
    entityTypes: (row.entity_types as string[]) || [],
    createdBy: row.created_by
      ? { id: row.created_by as string, name: (row.created_by_name as string) || '' }
      : null,
    updatedBy: row.updated_by
      ? { id: row.updated_by as string, name: (row.updated_by_name as string) || '' }
      : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapExecutionFromDb(row: Record<string, unknown>): WorkflowExecution {
  return {
    id: row.id as string,
    ruleId: row.rule_id as string,
    ruleName: (row.rule_name as string) || '',
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    triggerData: row.trigger_data as Record<string, unknown>,
    conditionsEvaluated: (row.conditions_evaluated as WorkflowExecution['conditionsEvaluated']) || [],
    conditionsPassed: row.conditions_passed as boolean,
    actionsTaken: (row.actions_taken as WorkflowExecution['actionsTaken']) || [],
    result: row.result as WorkflowExecution['result'],
    errorMessage: row.error_message as string | null,
    requiresApproval: row.requires_approval as boolean,
    approvedBy: row.approved_by
      ? { id: row.approved_by as string, name: (row.approved_by_name as string) || '' }
      : null,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
    rejectedBy: row.rejected_by
      ? { id: row.rejected_by as string, name: (row.rejected_by_name as string) || '' }
      : null,
    rejectedAt: row.rejected_at ? new Date(row.rejected_at as string) : null,
    rejectionReason: row.rejection_reason as string | null,
    startedAt: new Date(row.started_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
  }
}

function mapScheduledActionFromDb(row: Record<string, unknown>): ScheduledAction {
  return {
    id: row.id as string,
    ruleId: row.rule_id as string | null,
    executionId: row.execution_id as string | null,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    actionType: row.action_type as string,
    actionConfig: row.action_config as Record<string, unknown>,
    scheduledFor: new Date(row.scheduled_for as string),
    executedAt: row.executed_at ? new Date(row.executed_at as string) : null,
    cancelIf: row.cancel_if as ScheduledAction['cancelIf'],
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string) : null,
    cancelReason: row.cancel_reason as string | null,
    status: row.status as ScheduledAction['status'],
    errorMessage: row.error_message as string | null,
    createdAt: new Date(row.created_at as string),
  }
}
