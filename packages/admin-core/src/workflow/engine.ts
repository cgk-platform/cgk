/**
 * Workflow Engine
 * PHASE-2H-WORKFLOWS
 *
 * Main workflow engine that:
 * - Loads and manages workflow rules
 * - Handles trigger events (status_change, time_elapsed, scheduled, manual)
 * - Evaluates conditions and executes actions
 * - Manages approval workflows
 * - Tracks execution state and cooldowns
 */

import { sql, withTenant } from '@cgk/db'

import { executeActions } from './actions'
import { computeFields, evaluateConditions } from './evaluator'
import type {
  Action,
  ActionType,
  Condition,
  EventTriggerParams,
  ExecutionContext,
  ManualTriggerParams,
  ScheduledActionStatus,
  StatusChangeParams,
  TimeElapsedEntity,
  WorkflowExecution,
  WorkflowRule,
} from './types'

// ============================================================
// Workflow Engine Class
// ============================================================

export class WorkflowEngine {
  private static instances: Map<string, WorkflowEngine> = new Map()

  private tenantId: string
  private rules: WorkflowRule[] = []
  private rulesLoaded = false

  private constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  /**
   * Get or create engine instance for tenant (singleton per tenant)
   */
  static getInstance(tenantId: string): WorkflowEngine {
    let instance = WorkflowEngine.instances.get(tenantId)
    if (!instance) {
      instance = new WorkflowEngine(tenantId)
      WorkflowEngine.instances.set(tenantId, instance)
    }
    return instance
  }

  /**
   * Clear cached instance (useful for testing)
   */
  static clearInstance(tenantId: string): void {
    WorkflowEngine.instances.delete(tenantId)
  }

  // ============================================================
  // Rule Management
  // ============================================================

  /**
   * Load all workflow rules from database
   */
  async loadRules(): Promise<void> {
    this.rules = await withTenant(this.tenantId, async () => {
      const result = await sql`
        SELECT
          r.*,
          u1.name as created_by_name,
          u2.name as updated_by_name
        FROM workflow_rules r
        LEFT JOIN public.users u1 ON u1.id = r.created_by
        LEFT JOIN public.users u2 ON u2.id = r.updated_by
        ORDER BY r.priority DESC, r.created_at ASC
      `

      return result.rows.map((row) => this.mapRuleFromDb(row))
    })

    this.rulesLoaded = true
  }

  /**
   * Get all loaded rules
   */
  getRules(): WorkflowRule[] {
    return this.rules
  }

  /**
   * Get only active rules
   */
  getActiveRules(): WorkflowRule[] {
    return this.rules.filter((r) => r.isActive)
  }

  /**
   * Get rules that apply to an entity type
   */
  getRulesForEntityType(entityType: string): WorkflowRule[] {
    return this.getActiveRules().filter(
      (r) => r.entityTypes.length === 0 || r.entityTypes.includes(entityType)
    )
  }

  /**
   * Reload rules from database
   */
  async reloadRules(): Promise<void> {
    this.rulesLoaded = false
    await this.loadRules()
  }

  // ============================================================
  // Trigger Handlers
  // ============================================================

  /**
   * Handle status change trigger
   */
  async handleStatusChange(params: StatusChangeParams): Promise<WorkflowExecution[]> {
    await this.ensureRulesLoaded()

    const executions: WorkflowExecution[] = []

    // Find matching rules
    const rules = this.getRulesForEntityType(params.entityType).filter((rule) => {
      if (rule.triggerType !== 'status_change') return false

      const config = rule.triggerConfig
      if (config.type !== 'status_change') return false

      // Check from/to status filters
      if (config.from && config.from.length > 0) {
        if (!config.from.includes(params.oldStatus)) return false
      }

      if (config.to && config.to.length > 0) {
        if (!config.to.includes(params.newStatus)) return false
      }

      return true
    })

    // Execute matching rules
    for (const rule of rules) {
      const execution = await this.executeRule(rule, {
        entityType: params.entityType,
        entityId: params.entityId,
        entity: params.entity,
        triggerData: {
          type: 'status_change',
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
          ...params.context,
        },
      })

      if (execution) {
        executions.push(execution)
      }
    }

    return executions
  }

  /**
   * Handle event trigger
   */
  async handleEvent(params: EventTriggerParams): Promise<WorkflowExecution[]> {
    await this.ensureRulesLoaded()

    const executions: WorkflowExecution[] = []

    // Find matching rules
    const rules = this.getRulesForEntityType(params.entityType).filter((rule) => {
      if (rule.triggerType !== 'event') return false

      const config = rule.triggerConfig
      if (config.type !== 'event') return false

      return config.eventType === params.eventType
    })

    // Execute matching rules
    for (const rule of rules) {
      const execution = await this.executeRule(rule, {
        entityType: params.entityType,
        entityId: params.entityId,
        entity: params.entity,
        triggerData: {
          type: 'event',
          eventType: params.eventType,
          ...params.data,
        },
      })

      if (execution) {
        executions.push(execution)
      }
    }

    return executions
  }

  /**
   * Check time-elapsed triggers for a batch of entities
   */
  async checkTimeElapsedTriggers(entities: TimeElapsedEntity[]): Promise<WorkflowExecution[]> {
    await this.ensureRulesLoaded()

    const executions: WorkflowExecution[] = []

    // Get time_elapsed rules
    const timeElapsedRules = this.getActiveRules().filter(
      (r) => r.triggerType === 'time_elapsed'
    )

    for (const entity of entities) {
      const matchingRules = timeElapsedRules.filter((rule) => {
        // Check entity type
        if (rule.entityTypes.length > 0 && !rule.entityTypes.includes(entity.entityType)) {
          return false
        }

        const config = rule.triggerConfig
        if (config.type !== 'time_elapsed') return false

        // Check status matches
        if (config.status !== entity.status) return false

        // Calculate time elapsed
        const elapsedMs = Date.now() - entity.statusChangedAt.getTime()
        const elapsedHours = elapsedMs / (1000 * 60 * 60)

        // Check if elapsed time threshold met
        const thresholdHours = (config.hours || 0) + (config.days || 0) * 24
        return elapsedHours >= thresholdHours
      })

      for (const rule of matchingRules) {
        const execution = await this.executeRule(rule, {
          entityType: entity.entityType,
          entityId: entity.entityId,
          entity: entity.entity,
          triggerData: {
            type: 'time_elapsed',
            status: entity.status,
            statusChangedAt: entity.statusChangedAt.toISOString(),
            elapsedHours: Math.floor(
              (Date.now() - entity.statusChangedAt.getTime()) / (1000 * 60 * 60)
            ),
          },
        })

        if (execution) {
          executions.push(execution)
        }
      }
    }

    return executions
  }

  /**
   * Trigger a rule manually
   */
  async triggerManually(params: ManualTriggerParams): Promise<WorkflowExecution | null> {
    await this.ensureRulesLoaded()

    const rule = this.rules.find((r) => r.id === params.ruleId)
    if (!rule) {
      throw new Error(`Rule not found: ${params.ruleId}`)
    }

    if (!rule.isActive && !params.bypassChecks) {
      throw new Error('Cannot manually trigger inactive rule')
    }

    return this.executeRule(
      rule,
      {
        entityType: params.entityType,
        entityId: params.entityId,
        entity: params.entity,
        triggerData: {
          type: 'manual',
          triggeredAt: new Date().toISOString(),
        },
      },
      params.bypassChecks
    )
  }

  // ============================================================
  // Rule Execution
  // ============================================================

  /**
   * Execute a workflow rule
   */
  private async executeRule(
    rule: WorkflowRule,
    params: {
      entityType: string
      entityId: string
      entity: Record<string, unknown>
      triggerData: Record<string, unknown>
      previousEntity?: Record<string, unknown>
    },
    bypassChecks = false
  ): Promise<WorkflowExecution | null> {
    // Check cooldown and execution limits
    if (!bypassChecks) {
      const canExecute = await this.checkExecutionLimits(rule, params.entityType, params.entityId)
      if (!canExecute) {
        return null
      }
    }

    // Compute fields for evaluation
    const computed = computeFields(params.entity)

    // Get state data for additional computed values
    const stateData = await this.getEntityState(rule.id, params.entityType, params.entityId)
    computed.remindersSent = stateData?.executionCount || 0

    // Evaluate conditions
    const evaluationContext = {
      entity: params.entity,
      previousEntity: params.previousEntity,
      computed,
    }

    const { passed: conditionsPassed, results: conditionsEvaluated } = evaluateConditions(
      rule.conditions,
      evaluationContext
    )

    // Create execution record
    const execution = await this.createExecution({
      ruleId: rule.id,
      ruleName: rule.name,
      entityType: params.entityType,
      entityId: params.entityId,
      triggerData: params.triggerData,
      conditionsEvaluated,
      conditionsPassed,
      requiresApproval: rule.requiresApproval,
    })

    // If conditions didn't pass, mark as skipped
    if (!conditionsPassed) {
      await this.updateExecution(execution.id, {
        result: 'skipped',
        completedAt: new Date(),
      })
      execution.result = 'skipped'
      execution.completedAt = new Date()
      return execution
    }

    // If approval required, wait for approval
    if (rule.requiresApproval) {
      await this.updateExecution(execution.id, {
        result: 'pending_approval',
      })
      execution.result = 'pending_approval'
      return execution
    }

    // Execute actions
    const executionContext: ExecutionContext = {
      tenantId: this.tenantId,
      ruleId: rule.id,
      entityType: params.entityType,
      entityId: params.entityId,
      entity: params.entity,
      previousEntity: params.previousEntity,
      triggerData: params.triggerData,
      computed,
    }

    const actionResults = await executeActions(rule.actions, executionContext)

    // Determine overall result
    const allSucceeded = actionResults.every((r) => r.success)
    const anySucceeded = actionResults.some((r) => r.success)
    const result = allSucceeded ? 'success' : anySucceeded ? 'partial' : 'failed'

    // Update execution record
    await this.updateExecution(execution.id, {
      actionsTaken: actionResults,
      result,
      completedAt: new Date(),
    })

    // Update entity workflow state
    await this.updateEntityState(rule.id, params.entityType, params.entityId, execution.id)

    execution.actionsTaken = actionResults
    execution.result = result
    execution.completedAt = new Date()

    return execution
  }

  // ============================================================
  // Approval Workflow
  // ============================================================

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<WorkflowExecution[]> {
    return withTenant(this.tenantId, async () => {
      const result = await sql`
        SELECT
          e.*,
          r.name as rule_name
        FROM workflow_executions e
        JOIN workflow_rules r ON r.id = e.rule_id
        WHERE e.result = 'pending_approval'
        ORDER BY e.started_at DESC
      `

      return result.rows.map((row) => this.mapExecutionFromDb(row))
    })
  }

  /**
   * Approve an execution and continue with actions
   */
  async approveExecution(executionId: string, approverId: string): Promise<void> {
    const execution = await this.getExecution(executionId)
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    if (execution.result !== 'pending_approval') {
      throw new Error('Execution is not pending approval')
    }

    // Update approval status
    await withTenant(this.tenantId, async () => {
      await sql`
        UPDATE workflow_executions
        SET approved_by = ${approverId}, approved_at = NOW()
        WHERE id = ${executionId}
      `
    })

    // Get the rule and entity to continue execution
    const rule = this.rules.find((r) => r.id === execution.ruleId)
    if (!rule) {
      throw new Error(`Rule not found: ${execution.ruleId}`)
    }

    // Fetch entity (simplified - would need proper entity fetching)
    const entity = await this.fetchEntity(execution.entityType, execution.entityId)
    const computed = computeFields(entity)

    const executionContext: ExecutionContext = {
      tenantId: this.tenantId,
      ruleId: rule.id,
      entityType: execution.entityType,
      entityId: execution.entityId,
      entity,
      triggerData: execution.triggerData,
      computed,
    }

    // Execute actions
    const actionResults = await executeActions(rule.actions, executionContext)
    const allSucceeded = actionResults.every((r) => r.success)
    const anySucceeded = actionResults.some((r) => r.success)
    const result = allSucceeded ? 'success' : anySucceeded ? 'partial' : 'failed'

    // Update execution
    await this.updateExecution(executionId, {
      actionsTaken: actionResults,
      result,
      completedAt: new Date(),
    })

    // Update entity state
    await this.updateEntityState(rule.id, execution.entityType, execution.entityId, executionId)
  }

  /**
   * Reject an execution
   */
  async rejectExecution(executionId: string, rejecterId: string, reason: string): Promise<void> {
    await withTenant(this.tenantId, async () => {
      await sql`
        UPDATE workflow_executions
        SET
          rejected_by = ${rejecterId},
          rejected_at = NOW(),
          rejection_reason = ${reason},
          result = 'skipped',
          completed_at = NOW()
        WHERE id = ${executionId}
      `
    })
  }

  // ============================================================
  // Scheduled Actions
  // ============================================================

  /**
   * Process pending scheduled actions
   */
  async processScheduledActions(): Promise<void> {
    const pendingActions = await withTenant(this.tenantId, async () => {
      const result = await sql`
        SELECT *
        FROM scheduled_actions
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT 100
      `
      return result.rows
    })

    for (const action of pendingActions) {
      await this.processScheduledAction(action)
    }
  }

  private async processScheduledAction(
    action: Record<string, unknown>
  ): Promise<void> {
    const actionId = action.id as string
    const entityType = action.entity_type as string
    const entityId = action.entity_id as string
    const cancelIf = action.cancel_if as Condition[] | null

    try {
      // Fetch current entity
      const entity = await this.fetchEntity(entityType, entityId)
      const computed = computeFields(entity)

      // Check cancellation conditions
      if (cancelIf && cancelIf.length > 0) {
        const { passed } = evaluateConditions(cancelIf, { entity, computed })
        if (passed) {
          // Cancel the action
          await this.updateScheduledActionStatus(
            actionId,
            'cancelled',
            'Cancellation conditions met'
          )
          return
        }
      }

      // Execute the action
      const executionContext: ExecutionContext = {
        tenantId: this.tenantId,
        ruleId: action.rule_id as string,
        entityType,
        entityId,
        entity,
        triggerData: { type: 'scheduled_followup' },
        computed,
      }

      const actionDef: Action = {
        type: action.action_type as ActionType,
        config: action.action_config as Record<string, unknown>,
      }

      const result = await executeActions([actionDef], executionContext)

      if (result[0]?.success) {
        await this.updateScheduledActionStatus(actionId, 'executed')
      } else {
        await this.updateScheduledActionStatus(actionId, 'failed', result[0]?.error)
      }
    } catch (error) {
      await this.updateScheduledActionStatus(
        actionId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Cancel a scheduled action
   */
  async cancelScheduledAction(actionId: string, reason: string): Promise<void> {
    await this.updateScheduledActionStatus(actionId, 'cancelled', reason)
  }

  private async updateScheduledActionStatus(
    actionId: string,
    status: ScheduledActionStatus,
    errorOrReason?: string
  ): Promise<void> {
    await withTenant(this.tenantId, async () => {
      if (status === 'executed') {
        await sql`
          UPDATE scheduled_actions
          SET status = ${status}, executed_at = NOW()
          WHERE id = ${actionId}
        `
      } else if (status === 'cancelled') {
        await sql`
          UPDATE scheduled_actions
          SET status = ${status}, cancelled_at = NOW(), cancel_reason = ${errorOrReason || null}
          WHERE id = ${actionId}
        `
      } else if (status === 'failed') {
        await sql`
          UPDATE scheduled_actions
          SET status = ${status}, error_message = ${errorOrReason || null}
          WHERE id = ${actionId}
        `
      }
    })
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private async ensureRulesLoaded(): Promise<void> {
    if (!this.rulesLoaded) {
      await this.loadRules()
    }
  }

  private async checkExecutionLimits(
    rule: WorkflowRule,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    const state = await this.getEntityState(rule.id, entityType, entityId)

    if (!state) {
      return true // No previous executions
    }

    // Check max executions
    if (rule.maxExecutions && state.executionCount >= rule.maxExecutions) {
      return false
    }

    // Check cooldown
    if (rule.cooldownHours && state.lastExecutionAt) {
      const cooldownMs = rule.cooldownHours * 60 * 60 * 1000
      const timeSinceLastExecution = Date.now() - new Date(state.lastExecutionAt).getTime()
      if (timeSinceLastExecution < cooldownMs) {
        return false
      }
    }

    return true
  }

  private async getEntityState(
    ruleId: string,
    entityType: string,
    entityId: string
  ): Promise<{ executionCount: number; lastExecutionAt: Date | null } | null> {
    return withTenant(this.tenantId, async () => {
      const result = await sql`
        SELECT execution_count, last_execution_at
        FROM entity_workflow_state
        WHERE rule_id = ${ruleId}
          AND entity_type = ${entityType}
          AND entity_id = ${entityId}
      `

      const row = result.rows[0]
      if (!row) {
        return null
      }

      return {
        executionCount: row.execution_count as number,
        lastExecutionAt: row.last_execution_at as Date | null,
      }
    })
  }

  private async updateEntityState(
    ruleId: string,
    entityType: string,
    entityId: string,
    executionId: string
  ): Promise<void> {
    await withTenant(this.tenantId, async () => {
      await sql`
        INSERT INTO entity_workflow_state (
          entity_type, entity_id, rule_id,
          execution_count, last_execution_at, last_execution_id
        ) VALUES (
          ${entityType}, ${entityId}, ${ruleId},
          1, NOW(), ${executionId}
        )
        ON CONFLICT (entity_type, entity_id, rule_id)
        DO UPDATE SET
          execution_count = entity_workflow_state.execution_count + 1,
          last_execution_at = NOW(),
          last_execution_id = ${executionId}
      `
    })
  }

  private async createExecution(params: {
    ruleId: string
    ruleName: string
    entityType: string
    entityId: string
    triggerData: Record<string, unknown>
    conditionsEvaluated: unknown[]
    conditionsPassed: boolean
    requiresApproval: boolean
  }): Promise<WorkflowExecution> {
    return withTenant(this.tenantId, async () => {
      const result = await sql`
        INSERT INTO workflow_executions (
          rule_id, entity_type, entity_id,
          trigger_data, conditions_evaluated, conditions_passed,
          result, requires_approval
        ) VALUES (
          ${params.ruleId}, ${params.entityType}, ${params.entityId},
          ${JSON.stringify(params.triggerData)},
          ${JSON.stringify(params.conditionsEvaluated)},
          ${params.conditionsPassed},
          'pending_approval',
          ${params.requiresApproval}
        )
        RETURNING *
      `

      const row = result.rows[0]
      if (!row) {
        throw new Error('Failed to create execution record')
      }
      return {
        ...this.mapExecutionFromDb(row as Record<string, unknown>),
        ruleName: params.ruleName,
      }
    })
  }

  private async updateExecution(
    executionId: string,
    updates: {
      actionsTaken?: unknown[]
      result?: string
      completedAt?: Date
    }
  ): Promise<void> {
    await withTenant(this.tenantId, async () => {
      if (updates.actionsTaken) {
        await sql`
          UPDATE workflow_executions
          SET actions_taken = ${JSON.stringify(updates.actionsTaken)}
          WHERE id = ${executionId}
        `
      }

      if (updates.result) {
        await sql`
          UPDATE workflow_executions
          SET result = ${updates.result}
          WHERE id = ${executionId}
        `
      }

      if (updates.completedAt) {
        await sql`
          UPDATE workflow_executions
          SET completed_at = ${updates.completedAt.toISOString()}
          WHERE id = ${executionId}
        `
      }
    })
  }

  private async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return withTenant(this.tenantId, async () => {
      const result = await sql`
        SELECT e.*, r.name as rule_name
        FROM workflow_executions e
        JOIN workflow_rules r ON r.id = e.rule_id
        WHERE e.id = ${executionId}
      `

      const row = result.rows[0]
      if (!row) {
        return null
      }

      return this.mapExecutionFromDb(row as Record<string, unknown>)
    })
  }

  private async fetchEntity(
    entityType: string,
    entityId: string
  ): Promise<Record<string, unknown>> {
    return withTenant(this.tenantId, async () => {
      const result = await this.fetchEntityFromTable(entityType, entityId)
      return (result.rows[0] as Record<string, unknown>) || { id: entityId }
    })
  }

  /**
   * Fetch entity from table - uses explicit queries per entity type
   */
  private async fetchEntityFromTable(entityType: string, entityId: string) {
    switch (entityType) {
      case 'project':
        return sql`SELECT * FROM projects WHERE id = ${entityId}`
      case 'task':
        return sql`SELECT * FROM tasks WHERE id = ${entityId}`
      case 'order':
        return sql`SELECT * FROM orders WHERE id = ${entityId}`
      case 'creator':
        return sql`SELECT * FROM creators WHERE id = ${entityId}`
      case 'customer':
        return sql`SELECT * FROM customers WHERE id = ${entityId}`
      default:
        // Return empty result for unknown entity types
        return { rows: [] }
    }
  }

  private mapRuleFromDb(row: Record<string, unknown>): WorkflowRule {
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
        ? { id: row.created_by as string, name: row.created_by_name as string }
        : null,
      updatedBy: row.updated_by
        ? { id: row.updated_by as string, name: row.updated_by_name as string }
        : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }
  }

  private mapExecutionFromDb(row: Record<string, unknown>): WorkflowExecution {
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
        ? { id: row.approved_by as string, name: '' }
        : null,
      approvedAt: row.approved_at ? new Date(row.approved_at as string) : null,
      rejectedBy: row.rejected_by
        ? { id: row.rejected_by as string, name: '' }
        : null,
      rejectedAt: row.rejected_at ? new Date(row.rejected_at as string) : null,
      rejectionReason: row.rejection_reason as string | null,
      startedAt: new Date(row.started_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    }
  }
}
