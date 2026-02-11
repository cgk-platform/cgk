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
    // Use explicit query branches since @vercel/postgres doesn't support dynamic SQL composition
    if (filters?.isActive !== undefined && filters?.triggerType && filters?.entityType) {
      const result = await sql`
        SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        WHERE r.is_active = ${filters.isActive}
          AND r.trigger_type = ${filters.triggerType}
          AND (r.entity_types = '{}' OR ${filters.entityType} = ANY(r.entity_types))
        ORDER BY r.priority DESC, r.created_at ASC
      `
      return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
    }

    if (filters?.isActive !== undefined && filters?.triggerType) {
      const result = await sql`
        SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        WHERE r.is_active = ${filters.isActive} AND r.trigger_type = ${filters.triggerType}
        ORDER BY r.priority DESC, r.created_at ASC
      `
      return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
    }

    if (filters?.isActive !== undefined && filters?.entityType) {
      const result = await sql`
        SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        WHERE r.is_active = ${filters.isActive}
          AND (r.entity_types = '{}' OR ${filters.entityType} = ANY(r.entity_types))
        ORDER BY r.priority DESC, r.created_at ASC
      `
      return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
    }

    if (filters?.triggerType && filters?.entityType) {
      const result = await sql`
        SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        WHERE r.trigger_type = ${filters.triggerType}
          AND (r.entity_types = '{}' OR ${filters.entityType} = ANY(r.entity_types))
        ORDER BY r.priority DESC, r.created_at ASC
      `
      return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
    }

    if (filters?.isActive !== undefined) {
      const result = await sql`
        SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        WHERE r.is_active = ${filters.isActive}
        ORDER BY r.priority DESC, r.created_at ASC
      `
      return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
    }

    if (filters?.triggerType) {
      const result = await sql`
        SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        WHERE r.trigger_type = ${filters.triggerType}
        ORDER BY r.priority DESC, r.created_at ASC
      `
      return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
    }

    if (filters?.entityType) {
      const result = await sql`
        SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        WHERE r.entity_types = '{}' OR ${filters.entityType} = ANY(r.entity_types)
        ORDER BY r.priority DESC, r.created_at ASC
      `
      return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
    }

    // No filters - return all
    const result = await sql`
      SELECT r.*, u1.name as created_by_name, u2.name as updated_by_name
      FROM workflow_rules r
      LEFT JOIN public.users u1 ON u1.id = r.created_by
      LEFT JOIN public.users u2 ON u2.id = r.updated_by
      ORDER BY r.priority DESC, r.created_at ASC
    `
    return result.rows.map((row) => mapRuleFromDb(row as Record<string, unknown>))
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

    return mapRuleFromDb(result.rows[0] as Record<string, unknown>)
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
        ${`{${(input.entityTypes || []).map(t => `"${t}"`).join(',')}}`}::text[],
        ${userId}
      )
      RETURNING *
    `

    return mapRuleFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Update a workflow rule
 * Note: Uses fetch-then-update pattern since @vercel/postgres doesn't support dynamic SET clauses
 */
export async function updateWorkflowRule(
  tenantId: string,
  ruleId: string,
  input: UpdateWorkflowRuleInput,
  userId: string
): Promise<WorkflowRule | null> {
  return withTenant(tenantId, async () => {
    // Fetch current rule to merge with updates
    const current = await sql`SELECT * FROM workflow_rules WHERE id = ${ruleId}`
    if (current.rows.length === 0) {
      return null
    }

    const row = current.rows[0] as Record<string, unknown>

    // Merge with input (input takes precedence), casting row values to proper types
    const name = (input.name ?? row.name) as string
    const description = (input.description !== undefined ? input.description : row.description) as string | null
    const isActive = (input.isActive ?? row.is_active) as boolean
    const priority = (input.priority ?? row.priority) as number
    const triggerType = (input.triggerType ?? row.trigger_type) as string
    const triggerConfig = input.triggerConfig !== undefined
      ? JSON.stringify(input.triggerConfig)
      : (typeof row.trigger_config === 'string' ? row.trigger_config : JSON.stringify(row.trigger_config))
    const conditions = input.conditions !== undefined
      ? JSON.stringify(input.conditions)
      : (typeof row.conditions === 'string' ? row.conditions : JSON.stringify(row.conditions))
    const actions = input.actions !== undefined
      ? JSON.stringify(input.actions)
      : (typeof row.actions === 'string' ? row.actions : JSON.stringify(row.actions))
    const cooldownHours = (input.cooldownHours !== undefined ? input.cooldownHours : row.cooldown_hours) as number | null
    const maxExecutions = (input.maxExecutions !== undefined ? input.maxExecutions : row.max_executions) as number | null
    const requiresApproval = (input.requiresApproval ?? row.requires_approval) as boolean
    const approverRole = (input.approverRole !== undefined ? input.approverRole : row.approver_role) as string | null
    const entityTypesArr = (input.entityTypes ?? row.entity_types) as string[]
    const entityTypesStr = `{${entityTypesArr.map(t => `"${t}"`).join(',')}}`

    const result = await sql`
      UPDATE workflow_rules SET
        name = ${name},
        description = ${description},
        is_active = ${isActive},
        priority = ${priority},
        trigger_type = ${triggerType},
        trigger_config = ${triggerConfig}::jsonb,
        conditions = ${conditions}::jsonb,
        actions = ${actions}::jsonb,
        cooldown_hours = ${cooldownHours},
        max_executions = ${maxExecutions},
        requires_approval = ${requiresApproval},
        approver_role = ${approverRole},
        entity_types = ${entityTypesStr}::text[],
        updated_by = ${userId},
        updated_at = NOW()
      WHERE id = ${ruleId}
      RETURNING *
    `

    const updatedRow = result.rows[0]
    if (!updatedRow) {
      return null
    }

    return mapRuleFromDb(updatedRow as Record<string, unknown>)
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
  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  return withTenant(tenantId, async () => {
    // Handle filter combinations with explicit queries
    if (filters?.ruleId && filters?.entityType && filters?.entityId && filters?.result) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflow_executions e
        WHERE e.rule_id = ${filters.ruleId}
          AND e.entity_type = ${filters.entityType}
          AND e.entity_id = ${filters.entityId}
          AND e.result = ${filters.result}
      `
      const result = await sql`
        SELECT e.*, r.name as rule_name
        FROM workflow_executions e
        JOIN workflow_rules r ON r.id = e.rule_id
        WHERE e.rule_id = ${filters.ruleId}
          AND e.entity_type = ${filters.entityType}
          AND e.entity_id = ${filters.entityId}
          AND e.result = ${filters.result}
        ORDER BY e.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return {
        executions: result.rows.map((row) => mapExecutionFromDb(row as Record<string, unknown>)),
        total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
      }
    }

    if (filters?.ruleId) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflow_executions e WHERE e.rule_id = ${filters.ruleId}
      `
      const result = await sql`
        SELECT e.*, r.name as rule_name
        FROM workflow_executions e
        JOIN workflow_rules r ON r.id = e.rule_id
        WHERE e.rule_id = ${filters.ruleId}
        ORDER BY e.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return {
        executions: result.rows.map((row) => mapExecutionFromDb(row as Record<string, unknown>)),
        total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
      }
    }

    if (filters?.entityType && filters?.entityId) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflow_executions e
        WHERE e.entity_type = ${filters.entityType} AND e.entity_id = ${filters.entityId}
      `
      const result = await sql`
        SELECT e.*, r.name as rule_name
        FROM workflow_executions e
        JOIN workflow_rules r ON r.id = e.rule_id
        WHERE e.entity_type = ${filters.entityType} AND e.entity_id = ${filters.entityId}
        ORDER BY e.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return {
        executions: result.rows.map((row) => mapExecutionFromDb(row as Record<string, unknown>)),
        total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
      }
    }

    if (filters?.result) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflow_executions e WHERE e.result = ${filters.result}
      `
      const result = await sql`
        SELECT e.*, r.name as rule_name
        FROM workflow_executions e
        JOIN workflow_rules r ON r.id = e.rule_id
        WHERE e.result = ${filters.result}
        ORDER BY e.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return {
        executions: result.rows.map((row) => mapExecutionFromDb(row as Record<string, unknown>)),
        total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
      }
    }

    // No filters - return all
    const countResult = await sql`SELECT COUNT(*) as count FROM workflow_executions`
    const result = await sql`
      SELECT e.*, r.name as rule_name
      FROM workflow_executions e
      JOIN workflow_rules r ON r.id = e.rule_id
      ORDER BY e.started_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return {
      executions: result.rows.map((row) => mapExecutionFromDb(row as Record<string, unknown>)),
      total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
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

    return mapExecutionFromDb(result.rows[0] as Record<string, unknown>)
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
  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  return withTenant(tenantId, async () => {
    // Handle filter combinations with explicit queries
    if (filters?.status && filters?.entityType && filters?.entityId) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM scheduled_actions
        WHERE status = ${filters.status}
          AND entity_type = ${filters.entityType}
          AND entity_id = ${filters.entityId}
      `
      const result = await sql`
        SELECT * FROM scheduled_actions
        WHERE status = ${filters.status}
          AND entity_type = ${filters.entityType}
          AND entity_id = ${filters.entityId}
        ORDER BY scheduled_for ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      return {
        actions: result.rows.map((row) => mapScheduledActionFromDb(row as Record<string, unknown>)),
        total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
      }
    }

    if (filters?.status) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM scheduled_actions WHERE status = ${filters.status}
      `
      const result = await sql`
        SELECT * FROM scheduled_actions
        WHERE status = ${filters.status}
        ORDER BY scheduled_for ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      return {
        actions: result.rows.map((row) => mapScheduledActionFromDb(row as Record<string, unknown>)),
        total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
      }
    }

    if (filters?.entityType && filters?.entityId) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM scheduled_actions
        WHERE entity_type = ${filters.entityType} AND entity_id = ${filters.entityId}
      `
      const result = await sql`
        SELECT * FROM scheduled_actions
        WHERE entity_type = ${filters.entityType} AND entity_id = ${filters.entityId}
        ORDER BY scheduled_for ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      return {
        actions: result.rows.map((row) => mapScheduledActionFromDb(row as Record<string, unknown>)),
        total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
      }
    }

    // No filters - return all
    const countResult = await sql`SELECT COUNT(*) as count FROM scheduled_actions`
    const result = await sql`
      SELECT * FROM scheduled_actions
      ORDER BY scheduled_for ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    return {
      actions: result.rows.map((row) => mapScheduledActionFromDb(row as Record<string, unknown>)),
      total: parseInt(String(countResult.rows[0]?.count || '0'), 10),
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
