/**
 * Action Executor for Workflow Engine
 * PHASE-2H-WORKFLOWS
 *
 * Executes workflow actions with:
 * - Template variable interpolation
 * - HTML escaping for email content
 * - Error handling with detailed results
 */

import { sql, withTenant } from '@cgk/db'

import type {
  Action,
  ActionResult,
  ExecutionContext,
  ScheduleFollowupConfig,
} from './types'

// ============================================================
// Action Executor
// ============================================================

/**
 * Execute a single action
 */
export async function executeAction(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'send_message':
        return await executeSendMessage(action, context)

      case 'send_notification':
        return await executeSendNotification(action, context)

      case 'slack_notify':
        return await executeSlackNotify(action, context)

      case 'suggest_action':
        return await executeSuggestAction(action, context)

      case 'schedule_followup':
        return await executeScheduleFollowup(action, context)

      case 'update_status':
        return await executeUpdateStatus(action, context)

      case 'update_field':
        return await executeUpdateField(action, context)

      case 'create_task':
        return await executeCreateTask(action, context)

      case 'assign_to':
        return await executeAssignTo(action, context)

      case 'webhook':
        return await executeWebhook(action, context)

      case 'generate_report':
        return await executeGenerateReport(action, context)

      default:
        return {
          action,
          success: false,
          error: `Unknown action type: ${action.type}`,
        }
    }
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute multiple actions in sequence
 */
export async function executeActions(
  actions: Action[],
  context: ExecutionContext
): Promise<ActionResult[]> {
  const results: ActionResult[] = []

  for (const action of actions) {
    const result = await executeAction(action, context)
    results.push(result)

    // Stop on critical failure (optional: could make this configurable)
    if (!result.success && action.type === 'update_status') {
      break
    }
  }

  return results
}

// ============================================================
// Action Implementations
// ============================================================

async function executeSendMessage(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    channel?: string
    template?: string
    subject?: string
    to?: string
  }

  const channel = config.channel || 'email'
  const template = config.template || ''
  const subject = config.subject || ''

  // Interpolate template
  const body = interpolateTemplate(template, context)
  const interpolatedSubject = interpolateTemplate(subject, context)

  // Determine recipient
  let toEmail: string | undefined
  if (config.to === 'contact') {
    toEmail = context.entity.email as string | undefined
  } else if (config.to === 'assignee') {
    toEmail = context.entity.assigneeEmail as string | undefined
  } else if (config.to && config.to.includes('@')) {
    toEmail = config.to
  }

  if (!toEmail) {
    return {
      action,
      success: false,
      error: 'No recipient email address found',
    }
  }

  // Queue the message via communications package
  await withTenant(context.tenantId, async () => {
    await sql`
      INSERT INTO email_queue (
        to_address,
        subject,
        body_text,
        body_html,
        template_id,
        variables,
        source,
        source_id,
        priority
      ) VALUES (
        ${toEmail},
        ${interpolatedSubject},
        ${body},
        ${escapeHtml(body)},
        NULL,
        ${JSON.stringify(context.entity)},
        'workflow',
        ${context.ruleId},
        'normal'
      )
    `
  })

  return {
    action,
    success: true,
    result: { channel, to: toEmail, subject: interpolatedSubject },
  }
}

async function executeSendNotification(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    to?: string
    title?: string
    message?: string
    priority?: string
  }

  const title = interpolateTemplate(config.title || '', context)
  const message = interpolateTemplate(config.message || '', context)

  // Determine recipient user ID
  let toUserId: string | undefined
  if (config.to === 'assignee') {
    toUserId = context.entity.assignedTo as string | undefined
  } else if (config.to === 'owner') {
    toUserId = context.entity.ownerId as string | undefined
  } else {
    toUserId = config.to
  }

  if (!toUserId) {
    return {
      action,
      success: false,
      error: 'No recipient user found',
    }
  }

  // Insert notification (assuming a notifications table exists or will be created)
  await withTenant(context.tenantId, async () => {
    await sql`
      INSERT INTO notifications (
        user_id,
        title,
        message,
        priority,
        source,
        source_id,
        entity_type,
        entity_id
      ) VALUES (
        ${toUserId},
        ${title},
        ${message},
        ${config.priority || 'normal'},
        'workflow',
        ${context.ruleId},
        ${context.entityType},
        ${context.entityId}
      )
    `
  })

  return {
    action,
    success: true,
    result: { to: toUserId, title },
  }
}

async function executeSlackNotify(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    channel?: string
    message?: string
    mention?: string
  }

  const message = interpolateTemplate(config.message || '', context)
  const channel = config.channel || '#general'

  // TODO: Integrate with actual Slack API
  // For now, log the intent and return success
  console.log(`[Workflow] Slack notification to ${channel}: ${message}`)

  // Store in a slack_notifications table for future processing
  await withTenant(context.tenantId, async () => {
    await sql`
      INSERT INTO workflow_slack_notifications (
        channel,
        message,
        mention,
        rule_id,
        entity_type,
        entity_id,
        status
      ) VALUES (
        ${channel},
        ${message},
        ${config.mention || null},
        ${context.ruleId},
        ${context.entityType},
        ${context.entityId},
        'pending'
      )
      ON CONFLICT DO NOTHING
    `
  }).catch(() => {
    // Table might not exist yet - that's okay
  })

  return {
    action,
    success: true,
    result: { channel, message: message.substring(0, 100) },
  }
}

async function executeSuggestAction(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    channel?: string
    message?: string
    options?: string[]
  }

  const message = interpolateTemplate(config.message || '', context)

  // Store suggestion for approval queue
  await withTenant(context.tenantId, async () => {
    await sql`
      INSERT INTO workflow_suggestions (
        rule_id,
        entity_type,
        entity_id,
        channel,
        message,
        options,
        status
      ) VALUES (
        ${context.ruleId},
        ${context.entityType},
        ${context.entityId},
        ${config.channel || '#ops'},
        ${message},
        ${JSON.stringify(config.options || [])},
        'pending'
      )
      ON CONFLICT DO NOTHING
    `
  }).catch(() => {
    // Table might not exist yet
  })

  return {
    action,
    success: true,
    result: { message: message.substring(0, 100), options: config.options },
  }
}

async function executeScheduleFollowup(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as ScheduleFollowupConfig

  const delayMs = ((config.delayHours || 0) * 60 * 60 + (config.delayDays || 0) * 24 * 60 * 60) * 1000
  const scheduledFor = new Date(Date.now() + delayMs)

  await withTenant(context.tenantId, async () => {
    await sql`
      INSERT INTO scheduled_actions (
        rule_id,
        entity_type,
        entity_id,
        action_type,
        action_config,
        scheduled_for,
        cancel_if,
        status
      ) VALUES (
        ${context.ruleId},
        ${context.entityType},
        ${context.entityId},
        ${config.action.type},
        ${JSON.stringify(config.action.config)},
        ${scheduledFor.toISOString()},
        ${config.cancelIf ? JSON.stringify(config.cancelIf) : null},
        'pending'
      )
    `
  })

  return {
    action,
    success: true,
    result: { scheduledFor: scheduledFor.toISOString() },
  }
}

async function executeUpdateStatus(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as { newStatus?: string }
  const newStatus = config.newStatus

  if (!newStatus) {
    return {
      action,
      success: false,
      error: 'No status specified',
    }
  }

  // Update entity status based on entity type
  await withTenant(context.tenantId, async () => {
    const table = getEntityTable(context.entityType)
    if (table) {
      await sql`
        UPDATE ${sql(table)}
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${context.entityId}
      `
    }
  })

  return {
    action,
    success: true,
    result: { newStatus },
  }
}

async function executeUpdateField(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as { field?: string; value?: unknown }

  if (!config.field) {
    return {
      action,
      success: false,
      error: 'No field specified',
    }
  }

  // Interpolate value if it's a string
  let value = config.value
  if (typeof value === 'string') {
    value = interpolateTemplate(value, context)
  }

  await withTenant(context.tenantId, async () => {
    const table = getEntityTable(context.entityType)
    if (table) {
      // Use JSONB set for nested fields, otherwise direct update
      if (config.field!.includes('.')) {
        const path = config.field!.split('.')
        await sql`
          UPDATE ${sql(table)}
          SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), ${path}, ${JSON.stringify(value)}::jsonb),
              updated_at = NOW()
          WHERE id = ${context.entityId}
        `
      } else {
        await sql`
          UPDATE ${sql(table)}
          SET ${sql(config.field!)} = ${value}, updated_at = NOW()
          WHERE id = ${context.entityId}
        `
      }
    }
  })

  return {
    action,
    success: true,
    result: { field: config.field, value },
  }
}

async function executeCreateTask(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    title?: string
    description?: string
    priority?: string
    assignTo?: string
    dueInDays?: number
  }

  const title = interpolateTemplate(config.title || '', context)
  const description = interpolateTemplate(config.description || '', context)

  // Determine assignee
  let assigneeId: string | undefined
  if (config.assignTo === 'owner') {
    assigneeId = context.entity.ownerId as string | undefined
  } else if (config.assignTo === 'coordinator') {
    assigneeId = context.entity.coordinatorId as string | undefined
  } else {
    assigneeId = config.assignTo
  }

  // Calculate due date
  const dueDate = config.dueInDays
    ? new Date(Date.now() + config.dueInDays * 24 * 60 * 60 * 1000)
    : null

  let taskId: string | undefined

  await withTenant(context.tenantId, async () => {
    const result = await sql`
      INSERT INTO tasks (
        title,
        description,
        priority,
        assigned_to,
        due_date,
        source_type,
        source_ref,
        project_id,
        created_by
      ) VALUES (
        ${title},
        ${description},
        ${config.priority || 'medium'},
        ${assigneeId || null},
        ${dueDate?.toISOString() || null},
        'workflow',
        ${context.ruleId},
        ${context.entityType === 'project' ? context.entityId : null},
        ${context.user?.id || null}
      )
      RETURNING id
    `
    taskId = result.rows[0]?.id as string
  })

  return {
    action,
    success: true,
    result: { taskId, title },
  }
}

async function executeAssignTo(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    userId?: string
    role?: string
  }

  let assigneeId = config.userId

  // Handle role-based assignment
  if (config.role === 'owner') {
    assigneeId = context.entity.ownerId as string | undefined
  } else if (config.role === 'coordinator') {
    assigneeId = context.entity.coordinatorId as string | undefined
  } else if (config.role === 'round_robin') {
    // TODO: Implement round robin logic
    assigneeId = undefined
  }

  if (!assigneeId) {
    return {
      action,
      success: false,
      error: 'No assignee found',
    }
  }

  await withTenant(context.tenantId, async () => {
    const table = getEntityTable(context.entityType)
    if (table) {
      await sql`
        UPDATE ${sql(table)}
        SET assigned_to = ${assigneeId}, assigned_at = NOW(), updated_at = NOW()
        WHERE id = ${context.entityId}
      `
    }
  })

  return {
    action,
    success: true,
    result: { assignedTo: assigneeId },
  }
}

async function executeWebhook(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    url?: string
    method?: string
    headers?: Record<string, string>
    includeEntity?: boolean
  }

  if (!config.url) {
    return {
      action,
      success: false,
      error: 'No webhook URL specified',
    }
  }

  const body = config.includeEntity
    ? JSON.stringify({
        entityType: context.entityType,
        entityId: context.entityId,
        entity: context.entity,
        triggerData: context.triggerData,
        ruleId: context.ruleId,
      })
    : JSON.stringify({
        entityType: context.entityType,
        entityId: context.entityId,
        ruleId: context.ruleId,
      })

  try {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body,
    })

    if (!response.ok) {
      return {
        action,
        success: false,
        error: `Webhook returned ${response.status}`,
      }
    }

    return {
      action,
      success: true,
      result: { status: response.status },
    }
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Webhook failed',
    }
  }
}

async function executeGenerateReport(
  action: Action,
  context: ExecutionContext
): Promise<ActionResult> {
  const config = action.config as {
    reportType?: string
    recipients?: string[]
    format?: string
  }

  // TODO: Implement actual report generation
  // For now, just log the intent
  console.log(
    `[Workflow] Generate report: ${config.reportType} to ${config.recipients?.join(', ')}`
  )

  return {
    action,
    success: true,
    result: {
      reportType: config.reportType,
      recipients: config.recipients,
      format: config.format || 'pdf',
    },
  }
}

// ============================================================
// Template Interpolation
// ============================================================

/**
 * Interpolate template variables
 *
 * Supported variables:
 * - {firstName}, {lastName}, {name} - Contact name parts
 * - {email}, {phone} - Contact info
 * - {entityTitle}, {entityStatus} - Entity info
 * - {dueDate}, {daysSince}, {hoursInStatus} - Computed values
 * - {adminUrl} - Link to admin page
 * - Any entity field: {fieldName}
 */
export function interpolateTemplate(template: string, context: ExecutionContext): string {
  if (!template) return ''

  return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
    const value = getTemplateValue(path, context)
    return value !== undefined && value !== null ? String(value) : match
  })
}

function getTemplateValue(path: string, context: ExecutionContext): unknown {
  const entity = context.entity
  const computed = context.computed

  // Special variables
  switch (path) {
    case 'firstName':
      return getFirstName(entity.name as string | undefined)
    case 'lastName':
      return getLastName(entity.name as string | undefined)
    case 'name':
      return entity.name || entity.title || entity.displayName
    case 'email':
      return entity.email
    case 'phone':
      return entity.phone
    case 'entityTitle':
      return entity.title || entity.name
    case 'entityStatus':
      return entity.status
    case 'dueDate':
      return formatDate(entity.dueDate || entity.due_date)
    case 'daysSince':
      return computed.daysSinceLastUpdate
    case 'hoursInStatus':
      return computed.hoursInStatus
    case 'adminUrl':
      return buildAdminUrl(context)
    case 'projectTitle':
      return entity.projectTitle || entity.title
    default:
      // Try to get from entity using dot notation
      return getNestedValue(entity, path)
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

function getFirstName(name: string | undefined): string {
  if (!name) return ''
  return name.split(' ')[0] || ''
}

function getLastName(name: string | undefined): string {
  if (!name) return ''
  const parts = name.split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function formatDate(date: unknown): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date as string | number)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function buildAdminUrl(context: ExecutionContext): string {
  // TODO: Get base URL from config
  const baseUrl = process.env.ADMIN_BASE_URL || 'https://admin.example.com'
  return `${baseUrl}/${context.entityType}s/${context.entityId}`
}

// ============================================================
// Utilities
// ============================================================

/**
 * Escape HTML for email bodies
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>')
}

/**
 * Get database table name for entity type
 */
function getEntityTable(entityType: string): string | null {
  const tables: Record<string, string> = {
    project: 'projects',
    task: 'tasks',
    order: 'orders',
    creator: 'creators',
    customer: 'customers',
    thread: 'inbox_threads',
    contact: 'inbox_contacts',
  }

  return tables[entityType] || null
}
