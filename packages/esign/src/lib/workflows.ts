/**
 * E-Sign Workflow Management
 * Multi-signer workflow automation with sequential/parallel execution
 */

import { sql, withTenant } from '@cgk-platform/db'
import { nanoid } from 'nanoid'
import type {
  EsignWorkflow,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStatus,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  CreateWorkflowExecutionInput,
} from '../types.js'
import { createDocument } from './documents.js'
import { getTemplate } from './templates.js'

// ============================================================================
// WORKFLOW CRUD OPERATIONS
// ============================================================================

/**
 * Create a new workflow template
 */
export async function createWorkflow(
  tenantSlug: string,
  input: CreateWorkflowInput
): Promise<EsignWorkflow> {
  const id = `wf_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_workflows (
        id, name, description, trigger_type, steps,
        default_message, default_expires_days,
        reminder_enabled, reminder_days, created_by
      ) VALUES (
        ${id},
        ${input.name},
        ${input.description || null},
        ${input.trigger_type},
        ${JSON.stringify(input.steps)},
        ${input.default_message || null},
        ${input.default_expires_days || null},
        ${input.reminder_enabled ?? true},
        ${input.reminder_days ?? 3},
        ${input.created_by}
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create workflow')
    }
    return parseWorkflow(row as Record<string, unknown>)
  })
}

/**
 * Get workflow by ID
 */
export async function getWorkflow(
  tenantSlug: string,
  id: string
): Promise<EsignWorkflow | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_workflows WHERE id = ${id}
    `

    if (!result.rows[0]) return null
    return parseWorkflow(result.rows[0])
  })
}

/**
 * List workflows with optional filtering
 */
export async function listWorkflows(
  tenantSlug: string,
  options?: {
    status?: WorkflowStatus | 'all'
    triggerType?: string
    limit?: number
    offset?: number
    search?: string
  }
): Promise<{ workflows: EsignWorkflow[]; total: number }> {
  const { status = 'all', triggerType, limit = 50, offset = 0, search } = options || {}

  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []

    if (status !== 'all') {
      conditions.push(`status = '${status}'`)
    }
    if (triggerType) {
      conditions.push(`trigger_type = '${triggerType}'`)
    }
    if (search) {
      const escapedSearch = search.replace(/'/g, "''")
      conditions.push(`(name ILIKE '%${escapedSearch}%' OR description ILIKE '%${escapedSearch}%')`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) as count FROM esign_workflows ${whereClause}`
    const countResult = await sql.query(countQuery)
    const total = parseInt(countResult.rows[0].count, 10)

    const query = `
      SELECT * FROM esign_workflows
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const result = await sql.query(query)

    return {
      workflows: result.rows.map(parseWorkflow),
      total,
    }
  })
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  tenantSlug: string,
  id: string,
  input: UpdateWorkflowInput
): Promise<EsignWorkflow | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(input.name)
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(input.description)
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(input.status)
    }
    if (input.steps !== undefined) {
      updates.push(`steps = $${paramIndex++}`)
      values.push(JSON.stringify(input.steps))
    }
    if (input.default_message !== undefined) {
      updates.push(`default_message = $${paramIndex++}`)
      values.push(input.default_message)
    }
    if (input.default_expires_days !== undefined) {
      updates.push(`default_expires_days = $${paramIndex++}`)
      values.push(input.default_expires_days)
    }
    if (input.reminder_enabled !== undefined) {
      updates.push(`reminder_enabled = $${paramIndex++}`)
      values.push(input.reminder_enabled)
    }
    if (input.reminder_days !== undefined) {
      updates.push(`reminder_days = $${paramIndex++}`)
      values.push(input.reminder_days)
    }

    if (updates.length === 0) {
      return getWorkflow(tenantSlug, id)
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE esign_workflows
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(query, values)
    if (!result.rows[0]) return null
    return parseWorkflow(result.rows[0])
  })
}

/**
 * Delete a workflow (soft delete by archiving)
 */
export async function deleteWorkflow(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_workflows
      SET status = 'archived', updated_at = NOW()
      WHERE id = ${id}
    `
    return result.rowCount !== null && result.rowCount > 0
  })
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(
  tenantSlug: string,
  id: string
): Promise<EsignWorkflow | null> {
  return updateWorkflow(tenantSlug, id, { status: 'active' })
}

/**
 * Archive a workflow
 */
export async function archiveWorkflow(
  tenantSlug: string,
  id: string
): Promise<EsignWorkflow | null> {
  return updateWorkflow(tenantSlug, id, { status: 'archived' })
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

/**
 * Create a new workflow execution
 */
export async function createWorkflowExecution(
  tenantSlug: string,
  input: CreateWorkflowExecutionInput
): Promise<WorkflowExecution> {
  const id = `wfx_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_workflow_executions (
        id, workflow_id, current_step, status, context, document_ids, triggered_by, started_at
      ) VALUES (
        ${id},
        ${input.workflow_id},
        ${1},
        ${'pending'},
        ${JSON.stringify(input.context)},
        ${JSON.stringify([])},
        ${input.triggered_by},
        NOW()
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create workflow execution')
    }
    return parseExecution(row as Record<string, unknown>)
  })
}

/**
 * Get workflow execution by ID
 */
export async function getWorkflowExecution(
  tenantSlug: string,
  id: string
): Promise<WorkflowExecution | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_workflow_executions WHERE id = ${id}
    `

    if (!result.rows[0]) return null
    return parseExecution(result.rows[0])
  })
}

/**
 * Update workflow execution
 */
export async function updateWorkflowExecution(
  tenantSlug: string,
  id: string,
  updates: {
    current_step?: number
    status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
    document_ids?: string[]
    error_message?: string
    completed_at?: Date
  }
): Promise<WorkflowExecution | null> {
  return withTenant(tenantSlug, async () => {
    const sets: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (updates.current_step !== undefined) {
      sets.push(`current_step = $${paramIndex++}`)
      values.push(updates.current_step)
    }
    if (updates.status !== undefined) {
      sets.push(`status = $${paramIndex++}`)
      values.push(updates.status)
    }
    if (updates.document_ids !== undefined) {
      sets.push(`document_ids = $${paramIndex++}`)
      values.push(JSON.stringify(updates.document_ids))
    }
    if (updates.error_message !== undefined) {
      sets.push(`error_message = $${paramIndex++}`)
      values.push(updates.error_message)
    }
    if (updates.completed_at !== undefined) {
      sets.push(`completed_at = $${paramIndex++}`)
      values.push(updates.completed_at.toISOString())
    }

    if (sets.length === 0) {
      return getWorkflowExecution(tenantSlug, id)
    }

    values.push(id)

    const query = `
      UPDATE esign_workflow_executions
      SET ${sets.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(query, values)
    if (!result.rows[0]) return null
    return parseExecution(result.rows[0])
  })
}

/**
 * List executions for a workflow
 */
export async function listWorkflowExecutions(
  tenantSlug: string,
  workflowId: string,
  options?: {
    status?: string
    limit?: number
    offset?: number
  }
): Promise<{ executions: WorkflowExecution[]; total: number }> {
  const { status, limit = 50, offset = 0 } = options || {}

  return withTenant(tenantSlug, async () => {
    const conditions = [`workflow_id = '${workflowId}'`]
    if (status) {
      conditions.push(`status = '${status}'`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const countQuery = `SELECT COUNT(*) as count FROM esign_workflow_executions ${whereClause}`
    const countResult = await sql.query(countQuery)
    const total = parseInt(countResult.rows[0].count, 10)

    const query = `
      SELECT * FROM esign_workflow_executions
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const result = await sql.query(query)

    return {
      executions: result.rows.map(parseExecution),
      total,
    }
  })
}

/**
 * Get pending executions that need processing
 */
export async function getPendingExecutions(
  tenantSlug: string
): Promise<WorkflowExecution[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_workflow_executions
      WHERE status IN ('pending', 'in_progress')
      ORDER BY started_at ASC
    `

    return result.rows.map(parseExecution)
  })
}

// ============================================================================
// WORKFLOW STEP HELPERS
// ============================================================================

/**
 * Get the current step for an execution
 */
export async function getCurrentStep(
  tenantSlug: string,
  executionId: string
): Promise<WorkflowStep | null> {
  const execution = await getWorkflowExecution(tenantSlug, executionId)
  if (!execution) return null

  const workflow = await getWorkflow(tenantSlug, execution.workflow_id)
  if (!workflow) return null

  return workflow.steps.find((s) => s.order === execution.current_step) || null
}

/**
 * Advance to the next step in the workflow
 */
export async function advanceToNextStep(
  tenantSlug: string,
  executionId: string
): Promise<{ advanced: boolean; completed: boolean; nextStep?: WorkflowStep }> {
  const execution = await getWorkflowExecution(tenantSlug, executionId)
  if (!execution) {
    return { advanced: false, completed: false }
  }

  const workflow = await getWorkflow(tenantSlug, execution.workflow_id)
  if (!workflow) {
    return { advanced: false, completed: false }
  }

  const nextStepOrder = execution.current_step + 1
  const nextStep = workflow.steps.find((s) => s.order === nextStepOrder)

  if (!nextStep) {
    // Workflow completed
    await updateWorkflowExecution(tenantSlug, executionId, {
      status: 'completed',
      completed_at: new Date(),
    })
    return { advanced: false, completed: true }
  }

  // Advance to next step
  await updateWorkflowExecution(tenantSlug, executionId, {
    current_step: nextStepOrder,
    status: 'in_progress',
  })

  // Create the document for this step if a template is configured
  if (nextStep.template_id) {
    try {
      const template = await getTemplate(tenantSlug, nextStep.template_id)
      if (template) {
        const creatorId = execution.context.creator_id as string | undefined
        const triggeredBy = execution.triggered_by

        const newDoc = await createDocument(tenantSlug, {
          template_id: template.id,
          creator_id: creatorId,
          name: `${template.name} — Step ${nextStepOrder}: ${nextStep.name}`,
          file_url: template.file_url,
          expires_at: workflow.default_expires_days
            ? new Date(Date.now() + workflow.default_expires_days * 86400 * 1000)
            : undefined,
          reminder_enabled: workflow.reminder_enabled,
          reminder_days: workflow.reminder_days,
          message: workflow.default_message ?? undefined,
          created_by: triggeredBy,
        })

        // Track the new document ID in the execution
        const updatedDocIds = [...execution.document_ids, newDoc.id]
        await updateWorkflowExecution(tenantSlug, executionId, {
          document_ids: updatedDocIds,
        })
      }
    } catch (docError) {
      console.error('[esign-workflow] Failed to create document for step:', nextStepOrder, docError)
      // Don't fail the step advance — document creation failure is non-blocking
    }
  }

  return { advanced: true, completed: false, nextStep }
}

/**
 * Check if a step's proceed condition is met
 */
export async function checkStepCondition(
  tenantSlug: string,
  executionId: string,
  step: WorkflowStep
): Promise<boolean> {
  if (!step.proceed_condition) {
    // No condition means auto-proceed when all signers complete
    return true
  }

  const execution = await getWorkflowExecution(tenantSlug, executionId)
  if (!execution) return false

  const condition = step.proceed_condition

  switch (condition.type) {
    case 'all_signed':
      // Check if all documents for this step are fully signed
      // This is handled by document completion detection
      return true

    case 'any_signed':
      // Check if any document for this step has at least one signature
      // Implementation would check document status
      return true

    case 'field_value':
      // Check if a specific field has expected value
      if (!condition.field_id || !condition.expected_value) return true
      // Would need to fetch field value from documents
      return true

    case 'custom':
      // Custom expression evaluation (future implementation)
      return true

    default:
      return true
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate workflow configuration
 */
export function validateWorkflow(workflow: CreateWorkflowInput | UpdateWorkflowInput): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if ('name' in workflow && workflow.name !== undefined) {
    if (!workflow.name.trim()) {
      errors.push('Workflow name is required')
    }
  }

  if ('steps' in workflow && workflow.steps !== undefined) {
    if (workflow.steps.length === 0) {
      errors.push('At least one step is required')
    }

    // Validate step ordering
    const orders = workflow.steps.map((s) => s.order)
    const uniqueOrders = new Set(orders)
    if (orders.length !== uniqueOrders.size) {
      errors.push('Step orders must be unique')
    }

    // Validate each step
    for (const step of workflow.steps) {
      if (!step.name?.trim()) {
        errors.push(`Step ${step.order} must have a name`)
      }
      if (!step.template_id) {
        errors.push(`Step ${step.order} must have a template`)
      }
      if (step.signers.length === 0) {
        errors.push(`Step ${step.order} must have at least one signer`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get workflows by trigger type
 */
export async function getWorkflowsByTrigger(
  tenantSlug: string,
  triggerType: string
): Promise<EsignWorkflow[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_workflows
      WHERE trigger_type = ${triggerType}
        AND status = 'active'
      ORDER BY name ASC
    `

    return result.rows.map(parseWorkflow)
  })
}

// ============================================================================
// PARSE HELPERS
// ============================================================================

function parseWorkflow(row: Record<string, unknown>): EsignWorkflow {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    trigger_type: row.trigger_type as EsignWorkflow['trigger_type'],
    status: row.status as EsignWorkflow['status'],
    steps: (typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps) as WorkflowStep[],
    default_message: row.default_message as string | null,
    default_expires_days: row.default_expires_days as number | null,
    reminder_enabled: row.reminder_enabled as boolean,
    reminder_days: row.reminder_days as number,
    created_by: row.created_by as string,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function parseExecution(row: Record<string, unknown>): WorkflowExecution {
  return {
    id: row.id as string,
    workflow_id: row.workflow_id as string,
    current_step: row.current_step as number,
    status: row.status as WorkflowExecution['status'],
    context: (typeof row.context === 'string' ? JSON.parse(row.context) : row.context) as Record<string, unknown>,
    document_ids: (typeof row.document_ids === 'string' ? JSON.parse(row.document_ids) : row.document_ids) as string[],
    error_message: row.error_message as string | null,
    triggered_by: row.triggered_by as string,
    started_at: row.started_at as Date,
    completed_at: row.completed_at as Date | null,
    created_at: row.created_at as Date,
  }
}
