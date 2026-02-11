/**
 * Support Ticket Service
 * Phase 2SP-TICKETS
 */

import { sql, withTenant } from '@cgk/db'

import {
  decrementAgentTicketCount,
  getAvailableAgents,
  incrementAgentTicketCount,
} from './agents'
import { processSentiment } from './sentiment'
import { calculateSLADeadline, recalculateSLADeadline } from './sla'
import type {
  CommentInput,
  CreateTicketInput,
  PaginatedComments,
  PaginatedTickets,
  SupportAgent,
  SupportTicket,
  TicketAuditAction,
  TicketAuditEntry,
  TicketChannel,
  TicketComment,
  TicketFilters,
  TicketMetrics,
  TicketPriority,
  TicketStatus,
  UpdateTicketInput,
} from './types'

// Status workflow validation
const VALID_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['pending', 'resolved'],
  pending: ['open', 'resolved'],
  resolved: ['closed', 'open'], // Can reopen from resolved
  closed: ['open'], // Can reopen from closed
}

/**
 * Create a new support ticket
 */
export async function createTicket(
  tenantId: string,
  input: CreateTicketInput,
  actorId?: string,
  actorName?: string,
  runSentimentAnalysis: boolean = true
): Promise<SupportTicket> {
  return withTenant(tenantId, async () => {
    // Generate ticket number
    const numberResult = await sql`SELECT generate_ticket_number() as ticket_number`
    const numRow = numberResult.rows[0] as Record<string, unknown> | undefined
    if (!numRow) throw new Error('Failed to generate ticket number')
    const ticketNumber = numRow.ticket_number as string

    // Calculate SLA deadline
    const now = new Date()
    const priority = input.priority || 'normal'
    const slaDeadline = await calculateSLADeadline(tenantId, priority, now)

    // Create ticket
    const result = await sql`
      INSERT INTO support_tickets (
        ticket_number,
        subject,
        description,
        priority,
        channel,
        customer_email,
        customer_name,
        customer_id,
        tags,
        conversation_id,
        sla_deadline
      ) VALUES (
        ${ticketNumber},
        ${input.subject},
        ${input.description},
        ${priority},
        ${input.channel || 'form'},
        ${input.customerEmail},
        ${input.customerName || null},
        ${input.customerId || null},
        ${JSON.stringify(input.tags || [])}::TEXT[],
        ${input.conversationId || null},
        ${slaDeadline.toISOString()}
      )
      RETURNING
        id,
        ticket_number as "ticketNumber",
        subject,
        description,
        status,
        priority,
        channel,
        customer_id as "customerId",
        customer_email as "customerEmail",
        customer_name as "customerName",
        assigned_to as "assignedTo",
        tags,
        sla_deadline as "slaDeadline",
        sla_breached as "slaBreached",
        first_response_at as "firstResponseAt",
        resolved_at as "resolvedAt",
        resolution_notes as "resolutionNotes",
        sentiment_score as "sentimentScore",
        conversation_id as "conversationId",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    const ticketRow = result.rows[0] as Record<string, unknown>
    if (!ticketRow) throw new Error('Failed to create ticket')
    const ticket = mapTicket(ticketRow)

    // Log creation
    await logTicketAction(tenantId, ticket.id, actorId || null, actorName || 'System', 'created', null, {
      subject: input.subject,
      priority,
      channel: input.channel || 'form',
    })

    // Run sentiment analysis on description (async, don't wait)
    if (runSentimentAnalysis) {
      processSentiment(tenantId, ticket.id, input.description, priority, true).catch((err) =>
        console.error('Sentiment analysis failed:', err)
      )
    }

    return ticket
  })
}

/**
 * Get a ticket by ID
 */
export async function getTicket(
  tenantId: string,
  ticketId: string
): Promise<SupportTicket | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        t.id,
        t.ticket_number as "ticketNumber",
        t.subject,
        t.description,
        t.status,
        t.priority,
        t.channel,
        t.customer_id as "customerId",
        t.customer_email as "customerEmail",
        t.customer_name as "customerName",
        t.assigned_to as "assignedTo",
        t.tags,
        t.sla_deadline as "slaDeadline",
        t.sla_breached as "slaBreached",
        t.first_response_at as "firstResponseAt",
        t.resolved_at as "resolvedAt",
        t.resolution_notes as "resolutionNotes",
        t.sentiment_score as "sentimentScore",
        t.conversation_id as "conversationId",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        a.id as "agentId",
        a.name as "agentName",
        a.email as "agentEmail",
        a.role as "agentRole",
        a.is_online as "agentIsOnline"
      FROM support_tickets t
      LEFT JOIN support_agents a ON a.id = t.assigned_to
      WHERE t.id = ${ticketId}
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0] as Record<string, unknown>
    const ticket = mapTicket(row)

    // Add agent info if assigned
    if (row.agentId) {
      ticket.assignedAgent = {
        id: row.agentId as string,
        userId: '', // Not fetched for performance
        name: row.agentName as string,
        email: row.agentEmail as string,
        role: row.agentRole as SupportAgent['role'],
        isActive: true,
        isOnline: row.agentIsOnline as boolean,
        maxTickets: 0,
        currentTicketCount: 0,
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    return ticket
  })
}

/**
 * Get a ticket by ticket number
 */
export async function getTicketByNumber(
  tenantId: string,
  ticketNumber: string
): Promise<SupportTicket | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT id FROM support_tickets WHERE ticket_number = ${ticketNumber}
    `

    if (result.rows.length === 0) return null
    const idRow = result.rows[0] as Record<string, unknown>
    return getTicket(tenantId, idRow.id as string)
  })
}

/**
 * Get tickets with filters
 */
export async function getTickets(
  tenantId: string,
  filters: TicketFilters = {}
): Promise<PaginatedTickets> {
  const {
    status,
    priority,
    channel,
    assignedTo,
    unassigned,
    slaBreached,
    search,
    customerEmail,
    tags,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sort = 'created_at',
    dir = 'desc',
  } = filters

  const offset = (page - 1) * limit

  return withTenant(tenantId, async () => {
    // Build WHERE conditions
    const conditions: string[] = []

    if (status) {
      conditions.push(`t.status = '${status}'`)
    }
    if (priority) {
      conditions.push(`t.priority = '${priority}'`)
    }
    if (channel) {
      conditions.push(`t.channel = '${channel}'`)
    }
    if (assignedTo) {
      conditions.push(`t.assigned_to = '${assignedTo}'`)
    }
    if (unassigned) {
      conditions.push(`t.assigned_to IS NULL`)
    }
    if (slaBreached !== undefined) {
      conditions.push(`t.sla_breached = ${slaBreached}`)
    }
    if (search) {
      const searchEscaped = search.replace(/'/g, "''")
      conditions.push(
        `(t.subject ILIKE '%${searchEscaped}%' OR t.ticket_number ILIKE '%${searchEscaped}%' OR t.customer_email ILIKE '%${searchEscaped}%')`
      )
    }
    if (customerEmail) {
      conditions.push(`t.customer_email = '${customerEmail}'`)
    }
    if (tags && tags.length > 0) {
      const tagsArray = tags.map((t) => `'${t}'`).join(',')
      conditions.push(`t.tags && ARRAY[${tagsArray}]::TEXT[]`)
    }
    if (dateFrom) {
      conditions.push(`t.created_at >= '${dateFrom.toISOString()}'`)
    }
    if (dateTo) {
      conditions.push(`t.created_at <= '${dateTo.toISOString()}'`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Validate sort column
    const validSortColumns = [
      'created_at',
      'updated_at',
      'sla_deadline',
      'priority',
      'status',
      'ticket_number',
    ]
    const sortColumn = validSortColumns.includes(sort) ? `t.${sort}` : 't.created_at'
    const sortDir = dir === 'asc' ? 'ASC' : 'DESC'

    // Get total count
    const countResult = await sql.query(`
      SELECT COUNT(*) as count FROM support_tickets t ${whereClause}
    `)
    const total = parseInt(countResult.rows[0].count as string, 10)

    // Get paginated results
    const result = await sql.query(`
      SELECT
        t.id,
        t.ticket_number as "ticketNumber",
        t.subject,
        t.description,
        t.status,
        t.priority,
        t.channel,
        t.customer_id as "customerId",
        t.customer_email as "customerEmail",
        t.customer_name as "customerName",
        t.assigned_to as "assignedTo",
        t.tags,
        t.sla_deadline as "slaDeadline",
        t.sla_breached as "slaBreached",
        t.first_response_at as "firstResponseAt",
        t.resolved_at as "resolvedAt",
        t.resolution_notes as "resolutionNotes",
        t.sentiment_score as "sentimentScore",
        t.conversation_id as "conversationId",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        a.name as "agentName"
      FROM support_tickets t
      LEFT JOIN support_agents a ON a.id = t.assigned_to
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `)

    return {
      items: result.rows.map((row) => {
        const ticket = mapTicket(row)
        if (row.agentName) {
          ticket.assignedAgent = {
            id: row.assignedTo as string,
            userId: '',
            name: row.agentName as string,
            email: '',
            role: 'agent',
            isActive: true,
            isOnline: false,
            maxTickets: 0,
            currentTicketCount: 0,
            skills: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
        return ticket
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })
}

/**
 * Update a ticket
 */
export async function updateTicket(
  tenantId: string,
  ticketId: string,
  input: UpdateTicketInput,
  actorId?: string,
  actorName?: string
): Promise<SupportTicket | null> {
  return withTenant(tenantId, async () => {
    // Get current ticket for comparison
    const current = await getTicket(tenantId, ticketId)
    if (!current) return null

    const updates: string[] = []
    const auditActions: Array<{
      action: TicketAuditAction
      oldValue: unknown
      newValue: unknown
    }> = []

    // Handle subject update
    if (input.subject !== undefined && input.subject !== current.subject) {
      updates.push(`subject = '${input.subject.replace(/'/g, "''")}'`)
    }

    // Handle description update
    if (input.description !== undefined && input.description !== current.description) {
      updates.push(`description = '${input.description.replace(/'/g, "''")}'`)
    }

    // Handle status update with workflow validation
    if (input.status !== undefined && input.status !== current.status) {
      const validTransitions = VALID_STATUS_TRANSITIONS[current.status]
      if (!validTransitions.includes(input.status)) {
        throw new Error(
          `Invalid status transition: ${current.status} -> ${input.status}. Valid transitions: ${validTransitions.join(', ')}`
        )
      }

      updates.push(`status = '${input.status}'`)

      // Handle resolved timestamp
      if (input.status === 'resolved') {
        updates.push(`resolved_at = NOW()`)
      } else if (input.status === 'open' && current.status !== 'open') {
        // Reopening - clear resolved timestamp
        updates.push(`resolved_at = NULL`)
      }

      auditActions.push({
        action: input.status === 'resolved' ? 'resolved' :
          input.status === 'closed' ? 'closed' :
          input.status === 'open' && (current.status === 'resolved' || current.status === 'closed') ? 'reopened' :
          'status_changed',
        oldValue: current.status,
        newValue: input.status,
      })
    }

    // Handle priority update
    if (input.priority !== undefined && input.priority !== current.priority) {
      updates.push(`priority = '${input.priority}'`)
      auditActions.push({
        action: 'priority_changed',
        oldValue: current.priority,
        newValue: input.priority,
      })
    }

    // Handle tags update
    if (input.tags !== undefined) {
      const tagsArray = input.tags.map((t) => `'${t}'`).join(',')
      updates.push(`tags = ARRAY[${tagsArray}]::TEXT[]`)
      auditActions.push({
        action: 'tags_changed',
        oldValue: current.tags,
        newValue: input.tags,
      })
    }

    // Handle resolution notes
    if (input.resolutionNotes !== undefined) {
      updates.push(`resolution_notes = '${input.resolutionNotes.replace(/'/g, "''")}'`)
    }

    if (updates.length === 0) {
      return current
    }

    // Perform update
    await sql.query(`
      UPDATE support_tickets
      SET ${updates.join(', ')}
      WHERE id = '${ticketId}'
    `)

    // Recalculate SLA if priority changed
    if (input.priority !== undefined && input.priority !== current.priority) {
      await recalculateSLADeadline(tenantId, ticketId, input.priority)
    }

    // Log audit actions
    for (const audit of auditActions) {
      await logTicketAction(
        tenantId,
        ticketId,
        actorId || null,
        actorName || 'System',
        audit.action,
        { value: audit.oldValue },
        { value: audit.newValue }
      )
    }

    return getTicket(tenantId, ticketId)
  })
}

/**
 * Assign a ticket to an agent
 */
export async function assignTicket(
  tenantId: string,
  ticketId: string,
  agentId: string,
  actorId?: string,
  actorName?: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    // Get current assignment
    const ticketResult = await sql`
      SELECT assigned_to FROM support_tickets WHERE id = ${ticketId}
    `

    const ticketRow = ticketResult.rows[0] as Record<string, unknown> | undefined
    if (!ticketRow) {
      throw new Error(`Ticket ${ticketId} not found`)
    }

    const previousAgentId = ticketRow.assigned_to as string | null

    // Update assignment
    await sql`
      UPDATE support_tickets
      SET assigned_to = ${agentId}
      WHERE id = ${ticketId}
    `

    // Update agent ticket counts
    if (previousAgentId) {
      await decrementAgentTicketCount(tenantId, previousAgentId)
    }
    await incrementAgentTicketCount(tenantId, agentId)

    // Log action
    await logTicketAction(
      tenantId,
      ticketId,
      actorId || null,
      actorName || 'System',
      'assigned',
      previousAgentId ? { agentId: previousAgentId } : null,
      { agentId }
    )
  })
}

/**
 * Unassign a ticket
 */
export async function unassignTicket(
  tenantId: string,
  ticketId: string,
  actorId?: string,
  actorName?: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    // Get current assignment
    const ticketResult = await sql`
      SELECT assigned_to FROM support_tickets WHERE id = ${ticketId}
    `

    const unassignRow = ticketResult.rows[0] as Record<string, unknown> | undefined
    if (!unassignRow) {
      throw new Error(`Ticket ${ticketId} not found`)
    }

    const previousAgentId = unassignRow.assigned_to as string | null

    if (!previousAgentId) {
      return // Already unassigned
    }

    // Remove assignment
    await sql`
      UPDATE support_tickets
      SET assigned_to = NULL
      WHERE id = ${ticketId}
    `

    // Update agent ticket count
    await decrementAgentTicketCount(tenantId, previousAgentId)

    // Log action
    await logTicketAction(
      tenantId,
      ticketId,
      actorId || null,
      actorName || 'System',
      'unassigned',
      { agentId: previousAgentId },
      null
    )
  })
}

/**
 * Auto-assign a ticket to the least busy available agent
 */
export async function autoAssignTicket(
  tenantId: string,
  ticketId: string
): Promise<string | null> {
  // Get available agents sorted by current ticket count (ascending)
  const agents = await getAvailableAgents(tenantId)

  if (agents.length === 0) {
    return null
  }

  // Assign to the least busy agent
  const agent = agents[0]
  if (!agent) return null
  await assignTicket(tenantId, ticketId, agent.id, undefined, 'Auto-Assignment')

  return agent.id
}

/**
 * Add a comment to a ticket
 */
export async function addComment(
  tenantId: string,
  ticketId: string,
  input: CommentInput
): Promise<TicketComment> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO ticket_comments (
        ticket_id,
        author_id,
        author_name,
        author_type,
        content,
        is_internal,
        attachments
      ) VALUES (
        ${ticketId},
        ${input.authorId || null},
        ${input.authorName},
        ${input.authorType},
        ${input.content},
        ${input.isInternal || false},
        ${JSON.stringify(input.attachments || [])}::TEXT[]
      )
      RETURNING
        id,
        ticket_id as "ticketId",
        author_id as "authorId",
        author_name as "authorName",
        author_type as "authorType",
        content,
        is_internal as "isInternal",
        attachments,
        created_at as "createdAt"
    `

    const commentRow = result.rows[0] as Record<string, unknown>
    if (!commentRow) throw new Error('Failed to add comment')
    const comment = mapComment(commentRow)

    // Mark first response if this is an agent response and no first response yet
    if (input.authorType === 'agent') {
      await sql`
        UPDATE support_tickets
        SET first_response_at = COALESCE(first_response_at, NOW())
        WHERE id = ${ticketId}
      `
    }

    // Log action
    await logTicketAction(
      tenantId,
      ticketId,
      input.authorId || null,
      input.authorName,
      'commented',
      null,
      { isInternal: input.isInternal || false }
    )

    return comment
  })
}

/**
 * Get comments for a ticket
 */
export async function getComments(
  tenantId: string,
  ticketId: string,
  includeInternal: boolean = true,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedComments> {
  const offset = (page - 1) * limit

  return withTenant(tenantId, async () => {
    const internalFilter = includeInternal ? '' : 'AND is_internal = FALSE'

    // Get total count
    const countResult = await sql.query(`
      SELECT COUNT(*) as count
      FROM ticket_comments
      WHERE ticket_id = '${ticketId}' ${internalFilter}
    `)
    const total = parseInt(countResult.rows[0].count as string, 10)

    // Get comments
    const result = await sql.query(`
      SELECT
        id,
        ticket_id as "ticketId",
        author_id as "authorId",
        author_name as "authorName",
        author_type as "authorType",
        content,
        is_internal as "isInternal",
        attachments,
        created_at as "createdAt"
      FROM ticket_comments
      WHERE ticket_id = '${ticketId}' ${internalFilter}
      ORDER BY created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return {
      items: result.rows.map(mapComment),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })
}

/**
 * Get ticket audit log
 */
export async function getTicketAuditLog(
  tenantId: string,
  ticketId: string
): Promise<TicketAuditEntry[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        ticket_id as "ticketId",
        actor_id as "actorId",
        actor_name as "actorName",
        action,
        old_value as "oldValue",
        new_value as "newValue",
        created_at as "createdAt"
      FROM ticket_audit_log
      WHERE ticket_id = ${ticketId}
      ORDER BY created_at DESC
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      ticketId: row.ticketId as string,
      actorId: (row.actorId as string) || null,
      actorName: (row.actorName as string) || null,
      action: row.action as TicketAuditAction,
      oldValue: (row.oldValue as Record<string, unknown>) || null,
      newValue: (row.newValue as Record<string, unknown>) || null,
      createdAt: new Date(row.createdAt as string),
    }))
  })
}

/**
 * Get ticket metrics for dashboard
 */
export async function getTicketMetrics(tenantId: string): Promise<TicketMetrics> {
  return withTenant(tenantId, async () => {
    // Get status counts
    const statusResult = await sql`
      SELECT
        status,
        COUNT(*) as count
      FROM support_tickets
      GROUP BY status
    `

    const statusCounts: Record<TicketStatus, number> = {
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
    }
    for (const row of statusResult.rows) {
      statusCounts[row.status as TicketStatus] = parseInt(row.count as string, 10)
    }

    // Get SLA breached count
    const slaResult = await sql`
      SELECT COUNT(*) as count
      FROM support_tickets
      WHERE sla_breached = TRUE
        AND status IN ('open', 'pending')
    `
    const slaRow = slaResult.rows[0] as Record<string, unknown> | undefined
    const slaBreachedCount = slaRow ? parseInt(slaRow.count as string, 10) : 0

    // Get average resolution time
    const resolutionResult = await sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_minutes
      FROM support_tickets
      WHERE resolved_at IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
    `
    const resolutionRow = resolutionResult.rows[0] as Record<string, unknown> | undefined
    const avgResolutionTimeMinutes = resolutionRow?.avg_minutes
      ? Math.round(parseFloat(resolutionRow.avg_minutes as string))
      : null

    // Get average first response time
    const responseResult = await sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_minutes
      FROM support_tickets
      WHERE first_response_at IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
    `
    const responseRow = responseResult.rows[0] as Record<string, unknown> | undefined
    const avgFirstResponseTimeMinutes = responseRow?.avg_minutes
      ? Math.round(parseFloat(responseRow.avg_minutes as string))
      : null

    // Get tickets by channel
    const channelResult = await sql`
      SELECT channel, COUNT(*) as count
      FROM support_tickets
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY channel
    `
    const ticketsByChannel: Record<TicketChannel, number> = {
      email: 0,
      chat: 0,
      phone: 0,
      form: 0,
      sms: 0,
    }
    for (const row of channelResult.rows) {
      ticketsByChannel[row.channel as TicketChannel] = parseInt(row.count as string, 10)
    }

    // Get tickets by priority
    const priorityResult = await sql`
      SELECT priority, COUNT(*) as count
      FROM support_tickets
      WHERE status IN ('open', 'pending')
      GROUP BY priority
    `
    const ticketsByPriority: Record<TicketPriority, number> = {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    }
    for (const row of priorityResult.rows) {
      ticketsByPriority[row.priority as TicketPriority] = parseInt(row.count as string, 10)
    }

    return {
      totalOpen: statusCounts.open,
      totalPending: statusCounts.pending,
      totalResolved: statusCounts.resolved,
      totalClosed: statusCounts.closed,
      slaBreachedCount,
      avgResolutionTimeMinutes,
      avgFirstResponseTimeMinutes,
      ticketsByChannel,
      ticketsByPriority,
    }
  })
}

/**
 * Log a ticket action to the audit log
 */
async function logTicketAction(
  tenantId: string,
  ticketId: string,
  actorId: string | null,
  actorName: string,
  action: TicketAuditAction,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Promise<void> {
  return withTenant(tenantId, async () => {
    await sql`
      INSERT INTO ticket_audit_log (
        ticket_id,
        actor_id,
        actor_name,
        action,
        old_value,
        new_value
      ) VALUES (
        ${ticketId},
        ${actorId},
        ${actorName},
        ${action},
        ${oldValue ? JSON.stringify(oldValue) : null}::JSONB,
        ${newValue ? JSON.stringify(newValue) : null}::JSONB
      )
    `
  })
}

/**
 * Map database row to SupportTicket
 */
function mapTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: row.id as string,
    ticketNumber: row.ticketNumber as string,
    subject: row.subject as string,
    description: row.description as string,
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    channel: row.channel as TicketChannel,
    customerId: (row.customerId as string) || null,
    customerEmail: row.customerEmail as string,
    customerName: (row.customerName as string) || null,
    assignedTo: (row.assignedTo as string) || null,
    tags: (row.tags as string[]) || [],
    slaDeadline: row.slaDeadline ? new Date(row.slaDeadline as string) : null,
    slaBreached: row.slaBreached as boolean,
    firstResponseAt: row.firstResponseAt ? new Date(row.firstResponseAt as string) : null,
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt as string) : null,
    resolutionNotes: (row.resolutionNotes as string) || null,
    sentimentScore: row.sentimentScore ? parseFloat(row.sentimentScore as string) : null,
    conversationId: (row.conversationId as string) || null,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  }
}

/**
 * Map database row to TicketComment
 */
function mapComment(row: Record<string, unknown>): TicketComment {
  return {
    id: row.id as string,
    ticketId: row.ticketId as string,
    authorId: (row.authorId as string) || null,
    authorName: row.authorName as string,
    authorType: row.authorType as TicketComment['authorType'],
    content: row.content as string,
    isInternal: row.isInternal as boolean,
    attachments: (row.attachments as string[]) || [],
    createdAt: new Date(row.createdAt as string),
  }
}
