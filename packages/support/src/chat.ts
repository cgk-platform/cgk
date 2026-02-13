/**
 * Chat Service
 * Phase 2SP-CHANNELS: Live chat session and message management
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() for all database operations
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  BusinessHours,
  ChatMessage,
  ChatSession,
  ChatSessionFilters,
  ChatSessionStatus,
  ChatWidgetConfig,
  CreateChatSessionInput,
  SendMessageInput,
  UpdateWidgetConfigInput,
} from './channel-types'

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create a new chat session
 */
export async function createChatSession(
  tenantId: string,
  data: CreateChatSessionInput
): Promise<ChatSession> {
  return withTenant(tenantId, async () => {
    // Get current queue position
    const queueResult = await sql`
      SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position
      FROM chat_sessions
      WHERE status = 'waiting'
    `
    const queueRow = queueResult.rows[0] as Record<string, unknown> | undefined
    const queuePosition = queueRow?.next_position ?? 1

    const result = await sql`
      INSERT INTO chat_sessions (
        visitor_id,
        visitor_name,
        visitor_email,
        page_url,
        referrer_url,
        status,
        queue_position
      ) VALUES (
        ${data.visitorId},
        ${data.visitorName ?? null},
        ${data.visitorEmail ?? null},
        ${data.pageUrl ?? null},
        ${data.referrerUrl ?? null},
        'waiting',
        ${queuePosition as number}
      )
      RETURNING *
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) throw new Error('Failed to create chat session')
    return mapSessionRow(row)
  })
}

/**
 * Get a chat session by ID
 */
export async function getChatSession(
  tenantId: string,
  sessionId: string
): Promise<ChatSession | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT cs.*,
        sa.id as agent_id,
        sa.name as agent_name,
        sa.email as agent_email,
        sa.role as agent_role,
        sa.is_online as agent_is_online
      FROM chat_sessions cs
      LEFT JOIN support_agents sa ON sa.id = cs.assigned_agent_id
      WHERE cs.id = ${sessionId}
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) return null

    return mapSessionRowWithAgent(row)
  })
}

/**
 * Get all active chat sessions
 */
export async function getActiveSessions(tenantId: string): Promise<ChatSession[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT cs.*,
        sa.id as agent_id,
        sa.name as agent_name,
        sa.email as agent_email,
        sa.role as agent_role,
        sa.is_online as agent_is_online
      FROM chat_sessions cs
      LEFT JOIN support_agents sa ON sa.id = cs.assigned_agent_id
      WHERE cs.status = 'active'
      ORDER BY cs.started_at DESC
    `

    return result.rows.map((row) => mapSessionRowWithAgent(row as Record<string, unknown>))
  })
}

/**
 * Get queued (waiting) sessions
 */
export async function getQueuedSessions(tenantId: string): Promise<ChatSession[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM chat_sessions
      WHERE status = 'waiting'
      ORDER BY queue_position ASC, created_at ASC
    `

    return result.rows.map((row) => mapSessionRow(row as Record<string, unknown>))
  })
}

/**
 * Get chat sessions with filters
 */
export async function getChatSessions(
  tenantId: string,
  filters: ChatSessionFilters = {}
): Promise<{ sessions: ChatSession[]; total: number }> {
  return withTenant(tenantId, async () => {
    const limit = filters.limit ?? 50
    const offset = ((filters.page ?? 1) - 1) * limit

    // For simplicity, handle common filter combinations
    // In production, consider using a query builder library

    if (filters.status) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM chat_sessions WHERE status = ${filters.status}
      `
      const countRow = countResult.rows[0] as Record<string, unknown> | undefined
      const total = parseInt((countRow?.count as string) ?? '0', 10)

      const result = await sql`
        SELECT cs.*,
          sa.id as agent_id,
          sa.name as agent_name,
          sa.email as agent_email,
          sa.role as agent_role,
          sa.is_online as agent_is_online
        FROM chat_sessions cs
        LEFT JOIN support_agents sa ON sa.id = cs.assigned_agent_id
        WHERE cs.status = ${filters.status}
        ORDER BY cs.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      return {
        sessions: result.rows.map((row) => mapSessionRowWithAgent(row as Record<string, unknown>)),
        total,
      }
    }

    // Default: get all
    const countResult = await sql`SELECT COUNT(*) as count FROM chat_sessions`
    const countRow = countResult.rows[0] as Record<string, unknown> | undefined
    const total = parseInt((countRow?.count as string) ?? '0', 10)

    const result = await sql`
      SELECT cs.*,
        sa.id as agent_id,
        sa.name as agent_name,
        sa.email as agent_email,
        sa.role as agent_role,
        sa.is_online as agent_is_online
      FROM chat_sessions cs
      LEFT JOIN support_agents sa ON sa.id = cs.assigned_agent_id
      ORDER BY cs.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return {
      sessions: result.rows.map((row) => mapSessionRowWithAgent(row as Record<string, unknown>)),
      total,
    }
  })
}

/**
 * Assign an agent to a chat session
 */
export async function assignChatSession(
  tenantId: string,
  sessionId: string,
  agentId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    const now = new Date()

    // Get session to calculate wait time
    const sessionResult = await sql`
      SELECT started_at FROM chat_sessions WHERE id = ${sessionId}
    `
    const sessionRow = sessionResult.rows[0] as Record<string, unknown> | undefined
    const waitTimeSeconds = sessionRow
      ? Math.floor((now.getTime() - new Date(sessionRow.started_at as string).getTime()) / 1000)
      : null

    await sql`
      UPDATE chat_sessions
      SET
        assigned_agent_id = ${agentId},
        status = 'active',
        queue_position = NULL,
        wait_time_seconds = ${waitTimeSeconds}
      WHERE id = ${sessionId}
    `

    // Increment agent's ticket count
    await sql`
      UPDATE support_agents
      SET current_ticket_count = current_ticket_count + 1
      WHERE id = ${agentId}
    `

    // Recalculate queue positions for remaining waiting sessions
    await sql`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_position
        FROM chat_sessions
        WHERE status = 'waiting'
      )
      UPDATE chat_sessions
      SET queue_position = numbered.new_position
      FROM numbered
      WHERE chat_sessions.id = numbered.id
    `
  })
}

/**
 * End a chat session
 */
export async function endChatSession(
  tenantId: string,
  sessionId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    const now = new Date()

    // Get session to calculate duration
    const sessionResult = await sql`
      SELECT started_at, assigned_agent_id FROM chat_sessions WHERE id = ${sessionId}
    `
    const sessionRow = sessionResult.rows[0] as Record<string, unknown> | undefined

    const durationSeconds = sessionRow
      ? Math.floor((now.getTime() - new Date(sessionRow.started_at as string).getTime()) / 1000)
      : null

    await sql`
      UPDATE chat_sessions
      SET
        status = 'ended',
        ended_at = ${now.toISOString()},
        duration_seconds = ${durationSeconds}
      WHERE id = ${sessionId}
    `

    // Decrement agent's ticket count if assigned
    if (sessionRow?.assigned_agent_id) {
      await sql`
        UPDATE support_agents
        SET current_ticket_count = GREATEST(0, current_ticket_count - 1)
        WHERE id = ${sessionRow.assigned_agent_id as string}
      `
    }
  })
}

/**
 * Transfer a chat session to another agent
 */
export async function transferChatSession(
  tenantId: string,
  sessionId: string,
  toAgentId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    // Get current agent
    const sessionResult = await sql`
      SELECT assigned_agent_id FROM chat_sessions WHERE id = ${sessionId}
    `
    const sessionRow = sessionResult.rows[0] as Record<string, unknown> | undefined
    const fromAgentId = sessionRow?.assigned_agent_id as string | null

    await sql`
      UPDATE chat_sessions
      SET
        assigned_agent_id = ${toAgentId},
        status = 'active'
      WHERE id = ${sessionId}
    `

    // Update ticket counts
    if (fromAgentId) {
      await sql`
        UPDATE support_agents
        SET current_ticket_count = GREATEST(0, current_ticket_count - 1)
        WHERE id = ${fromAgentId}
      `
    }

    await sql`
      UPDATE support_agents
      SET current_ticket_count = current_ticket_count + 1
      WHERE id = ${toAgentId}
    `
  })
}

// ============================================
// MESSAGES
// ============================================

/**
 * Send a message in a chat session
 */
export async function sendMessage(
  tenantId: string,
  sessionId: string,
  data: SendMessageInput
): Promise<ChatMessage> {
  return withTenant(tenantId, async () => {
    const attachmentsStr = JSON.stringify(data.attachments ?? [])

    const result = await sql`
      INSERT INTO chat_messages (
        session_id,
        sender_id,
        sender_type,
        content,
        attachments
      ) VALUES (
        ${sessionId},
        ${data.senderId},
        ${data.senderType},
        ${data.content},
        ${attachmentsStr}::TEXT[]
      )
      RETURNING *
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) throw new Error('Failed to send message')
    return mapMessageRow(row)
  })
}

/**
 * Get messages for a chat session
 */
export async function getMessages(
  tenantId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM chat_messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `

    return result.rows.map((row) => mapMessageRow(row as Record<string, unknown>))
  })
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(
  tenantId: string,
  sessionId: string,
  readBy: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    // Mark messages not sent by the reader as read
    await sql`
      UPDATE chat_messages
      SET is_read = TRUE
      WHERE session_id = ${sessionId}
        AND sender_id != ${readBy}
        AND is_read = FALSE
    `
  })
}

/**
 * Get unread message count for a session
 */
export async function getUnreadCount(
  tenantId: string,
  sessionId: string,
  forUserId: string
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE session_id = ${sessionId}
        AND sender_id != ${forUserId}
        AND is_read = FALSE
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    return parseInt((row?.count as string) ?? '0', 10)
  })
}

// ============================================
// WIDGET CONFIGURATION
// ============================================

/**
 * Get chat widget configuration
 */
export async function getWidgetConfig(tenantId: string): Promise<ChatWidgetConfig> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM chat_widget_config WHERE id = 1
    `

    if (result.rows.length === 0) {
      // Initialize with defaults
      await sql`
        INSERT INTO chat_widget_config (id) VALUES (1)
        ON CONFLICT (id) DO NOTHING
      `
      const newResult = await sql`SELECT * FROM chat_widget_config WHERE id = 1`
      const row = newResult.rows[0] as Record<string, unknown> | undefined
      if (!row) throw new Error('Failed to get widget config')
      return mapWidgetConfigRow(row)
    }

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) throw new Error('Failed to get widget config')
    return mapWidgetConfigRow(row)
  })
}

/**
 * Update chat widget configuration
 */
export async function updateWidgetConfig(
  tenantId: string,
  data: UpdateWidgetConfigInput
): Promise<ChatWidgetConfig> {
  return withTenant(tenantId, async () => {
    // Update each field individually if provided
    if (data.primaryColor !== undefined) {
      await sql`UPDATE chat_widget_config SET primary_color = ${data.primaryColor} WHERE id = 1`
    }
    if (data.secondaryColor !== undefined) {
      await sql`UPDATE chat_widget_config SET secondary_color = ${data.secondaryColor} WHERE id = 1`
    }
    if (data.headerText !== undefined) {
      await sql`UPDATE chat_widget_config SET header_text = ${data.headerText} WHERE id = 1`
    }
    if (data.greetingMessage !== undefined) {
      await sql`UPDATE chat_widget_config SET greeting_message = ${data.greetingMessage} WHERE id = 1`
    }
    if (data.position !== undefined) {
      await sql`UPDATE chat_widget_config SET position = ${data.position} WHERE id = 1`
    }
    if (data.offsetX !== undefined) {
      await sql`UPDATE chat_widget_config SET offset_x = ${data.offsetX} WHERE id = 1`
    }
    if (data.offsetY !== undefined) {
      await sql`UPDATE chat_widget_config SET offset_y = ${data.offsetY} WHERE id = 1`
    }
    if (data.autoOpenDelaySeconds !== undefined) {
      await sql`UPDATE chat_widget_config SET auto_open_delay_seconds = ${data.autoOpenDelaySeconds} WHERE id = 1`
    }
    if (data.showAgentTyping !== undefined) {
      await sql`UPDATE chat_widget_config SET show_agent_typing = ${data.showAgentTyping} WHERE id = 1`
    }
    if (data.showReadReceipts !== undefined) {
      await sql`UPDATE chat_widget_config SET show_read_receipts = ${data.showReadReceipts} WHERE id = 1`
    }
    if (data.businessHoursEnabled !== undefined) {
      await sql`UPDATE chat_widget_config SET business_hours_enabled = ${data.businessHoursEnabled} WHERE id = 1`
    }
    if (data.businessHours !== undefined) {
      const hoursJson = JSON.stringify(data.businessHours)
      await sql`UPDATE chat_widget_config SET business_hours = ${hoursJson}::JSONB WHERE id = 1`
    }
    if (data.offlineMessage !== undefined) {
      await sql`UPDATE chat_widget_config SET offline_message = ${data.offlineMessage} WHERE id = 1`
    }
    if (data.fileUploadEnabled !== undefined) {
      await sql`UPDATE chat_widget_config SET file_upload_enabled = ${data.fileUploadEnabled} WHERE id = 1`
    }
    if (data.maxFileSizeMb !== undefined) {
      await sql`UPDATE chat_widget_config SET max_file_size_mb = ${data.maxFileSizeMb} WHERE id = 1`
    }
    if (data.allowedFileTypes !== undefined) {
      const typesStr = JSON.stringify(data.allowedFileTypes)
      await sql`UPDATE chat_widget_config SET allowed_file_types = ${typesStr}::TEXT[] WHERE id = 1`
    }

    // Update timestamp
    await sql`UPDATE chat_widget_config SET updated_at = NOW() WHERE id = 1`

    return getWidgetConfig(tenantId)
  })
}

/**
 * Check if currently within business hours
 */
export async function isWithinBusinessHours(tenantId: string): Promise<boolean> {
  const config = await getWidgetConfig(tenantId)

  if (!config.businessHoursEnabled || !config.businessHours) {
    return true // No business hours configured = always open
  }

  const now = new Date()
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const dayIndex = now.getDay()
  const dayName = dayNames[dayIndex]

  if (!dayName) {
    return false // Invalid day
  }

  const todayHours = config.businessHours[dayName]
  if (!todayHours) {
    return false // No hours for today = closed
  }

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  return currentTime >= todayHours.start && currentTime <= todayHours.end
}

/**
 * Get queue statistics
 */
export async function getChatQueueStats(tenantId: string): Promise<{
  waitingCount: number
  activeCount: number
  avgWaitTimeSeconds: number | null
}> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        AVG(wait_time_seconds) FILTER (WHERE wait_time_seconds IS NOT NULL) as avg_wait_time
      FROM chat_sessions
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    return {
      waitingCount: parseInt((row?.waiting_count as string) ?? '0', 10),
      activeCount: parseInt((row?.active_count as string) ?? '0', 10),
      avgWaitTimeSeconds: row?.avg_wait_time ? parseFloat(row.avg_wait_time as string) : null,
    }
  })
}

// ============================================
// ROW MAPPERS
// ============================================

function mapSessionRow(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string | null,
    visitorId: row.visitor_id as string,
    visitorName: row.visitor_name as string | null,
    visitorEmail: row.visitor_email as string | null,
    pageUrl: row.page_url as string | null,
    referrerUrl: row.referrer_url as string | null,
    status: row.status as ChatSessionStatus,
    assignedAgentId: row.assigned_agent_id as string | null,
    queuePosition: row.queue_position as number | null,
    startedAt: new Date(row.started_at as string),
    endedAt: row.ended_at ? new Date(row.ended_at as string) : null,
    waitTimeSeconds: row.wait_time_seconds as number | null,
    durationSeconds: row.duration_seconds as number | null,
    createdAt: new Date(row.created_at as string),
  }
}

function mapSessionRowWithAgent(row: Record<string, unknown>): ChatSession {
  const session = mapSessionRow(row)

  if (row.agent_id) {
    session.assignedAgent = {
      id: row.agent_id as string,
      userId: '', // Not needed for display
      name: row.agent_name as string,
      email: row.agent_email as string,
      role: row.agent_role as 'agent' | 'lead' | 'admin',
      isActive: true,
      isOnline: row.agent_is_online as boolean,
      maxTickets: 0,
      currentTicketCount: 0,
      skills: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  return session
}

function mapMessageRow(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    senderId: row.sender_id as string,
    senderType: row.sender_type as 'visitor' | 'agent' | 'bot',
    content: row.content as string,
    attachments: row.attachments as string[],
    isRead: row.is_read as boolean,
    createdAt: new Date(row.created_at as string),
  }
}

function mapWidgetConfigRow(row: Record<string, unknown>): ChatWidgetConfig {
  return {
    primaryColor: row.primary_color as string,
    secondaryColor: row.secondary_color as string,
    headerText: row.header_text as string,
    greetingMessage: row.greeting_message as string,
    position: row.position as 'bottom-right' | 'bottom-left',
    offsetX: row.offset_x as number,
    offsetY: row.offset_y as number,
    autoOpenDelaySeconds: row.auto_open_delay_seconds as number | null,
    showAgentTyping: row.show_agent_typing as boolean,
    showReadReceipts: row.show_read_receipts as boolean,
    businessHoursEnabled: row.business_hours_enabled as boolean,
    businessHours: row.business_hours as BusinessHours | null,
    offlineMessage: row.offline_message as string,
    fileUploadEnabled: row.file_upload_enabled as boolean,
    maxFileSizeMb: row.max_file_size_mb as number,
    allowedFileTypes: row.allowed_file_types as string[],
    updatedAt: new Date(row.updated_at as string),
  }
}
