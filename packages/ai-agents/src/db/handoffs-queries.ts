/**
 * Database queries for Agent Handoffs
 * All queries expect to be run within a tenant context via withTenant()
 */

import { sql } from '@cgk/db'
import type {
  AgentHandoff,
  AgentHandoffWithAgents,
  AgentMessageType,
  AgentSlackMessage,
  HandoffStatus,
  InitiateHandoffInput,
  SendAgentMessageInput,
} from '../types/teams.js'

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result as T
}

// ============================================================================
// Handoffs CRUD
// ============================================================================

/**
 * Create a handoff
 */
export async function createHandoff(
  input: InitiateHandoffInput,
  keyPoints: string[] = []
): Promise<AgentHandoff> {
  const result = await sql`
    INSERT INTO agent_handoffs (
      from_agent_id, to_agent_id,
      conversation_id, channel, channel_id,
      reason, context_summary, key_points
    )
    VALUES (
      ${input.fromAgentId},
      ${input.toAgentId},
      ${input.conversationId},
      ${input.channel},
      ${input.channelId || null},
      ${input.reason},
      ${input.contextSummary || null},
      ${JSON.stringify(keyPoints)}
    )
    RETURNING *
  `

  return toCamelCase<AgentHandoff>(result.rows[0] as Record<string, unknown>)
}

/**
 * Get a handoff by ID
 */
export async function getHandoffById(handoffId: string): Promise<AgentHandoff | null> {
  const result = await sql`
    SELECT * FROM agent_handoffs WHERE id = ${handoffId}
  `
  return result.rows[0] ? toCamelCase<AgentHandoff>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Get a handoff with agent details
 */
export async function getHandoffWithAgents(
  handoffId: string
): Promise<AgentHandoffWithAgents | null> {
  const result = await sql`
    SELECT
      h.*,
      fa.name as from_agent_name,
      fa.display_name as from_agent_display_name,
      fa.avatar_url as from_agent_avatar_url,
      ta.name as to_agent_name,
      ta.display_name as to_agent_display_name,
      ta.avatar_url as to_agent_avatar_url
    FROM agent_handoffs h
    JOIN ai_agents fa ON fa.id = h.from_agent_id
    JOIN ai_agents ta ON ta.id = h.to_agent_id
    WHERE h.id = ${handoffId}
  `

  if (!result.rows[0]) return null

  const row = result.rows[0] as Record<string, unknown>
  const handoff = toCamelCase<AgentHandoffWithAgents & Record<string, unknown>>(row)
  handoff.fromAgent = {
    id: handoff.fromAgentId as string,
    name: handoff.fromAgentName as string,
    displayName: handoff.fromAgentDisplayName as string,
    avatarUrl: handoff.fromAgentAvatarUrl as string | null,
  }
  handoff.toAgent = {
    id: handoff.toAgentId as string,
    name: handoff.toAgentName as string,
    displayName: handoff.toAgentDisplayName as string,
    avatarUrl: handoff.toAgentAvatarUrl as string | null,
  }
  delete handoff.fromAgentName
  delete handoff.fromAgentDisplayName
  delete handoff.fromAgentAvatarUrl
  delete handoff.toAgentName
  delete handoff.toAgentDisplayName
  delete handoff.toAgentAvatarUrl

  return handoff as AgentHandoffWithAgents
}

/**
 * List handoffs with filters
 */
export async function listHandoffs(filters: {
  fromAgentId?: string
  toAgentId?: string
  status?: HandoffStatus
  limit?: number
  offset?: number
}): Promise<AgentHandoffWithAgents[]> {
  const conditions: string[] = ['1=1']
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.fromAgentId) {
    conditions.push(`h.from_agent_id = $${paramIndex++}`)
    values.push(filters.fromAgentId)
  }
  if (filters.toAgentId) {
    conditions.push(`h.to_agent_id = $${paramIndex++}`)
    values.push(filters.toAgentId)
  }
  if (filters.status) {
    conditions.push(`h.status = $${paramIndex++}`)
    values.push(filters.status)
  }

  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const query = `
    SELECT
      h.*,
      fa.name as from_agent_name,
      fa.display_name as from_agent_display_name,
      fa.avatar_url as from_agent_avatar_url,
      ta.name as to_agent_name,
      ta.display_name as to_agent_display_name,
      ta.avatar_url as to_agent_avatar_url
    FROM agent_handoffs h
    JOIN ai_agents fa ON fa.id = h.from_agent_id
    JOIN ai_agents ta ON ta.id = h.to_agent_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY h.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await sql.query(query, values)

  return result.rows.map((row) => {
    const handoff = toCamelCase<AgentHandoffWithAgents & Record<string, unknown>>(row as Record<string, unknown>)
    handoff.fromAgent = {
      id: handoff.fromAgentId as string,
      name: handoff.fromAgentName as string,
      displayName: handoff.fromAgentDisplayName as string,
      avatarUrl: handoff.fromAgentAvatarUrl as string | null,
    }
    handoff.toAgent = {
      id: handoff.toAgentId as string,
      name: handoff.toAgentName as string,
      displayName: handoff.toAgentDisplayName as string,
      avatarUrl: handoff.toAgentAvatarUrl as string | null,
    }
    delete handoff.fromAgentName
    delete handoff.fromAgentDisplayName
    delete handoff.fromAgentAvatarUrl
    delete handoff.toAgentName
    delete handoff.toAgentDisplayName
    delete handoff.toAgentAvatarUrl
    return handoff as AgentHandoffWithAgents
  })
}

/**
 * List pending handoffs for an agent
 */
export async function listPendingHandoffs(agentId: string): Promise<AgentHandoffWithAgents[]> {
  return listHandoffs({ toAgentId: agentId, status: 'pending' })
}

/**
 * Accept a handoff
 */
export async function acceptHandoff(handoffId: string): Promise<AgentHandoff | null> {
  const result = await sql`
    UPDATE agent_handoffs
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = ${handoffId} AND status = 'pending'
    RETURNING *
  `
  return result.rows[0] ? toCamelCase<AgentHandoff>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Decline a handoff
 */
export async function declineHandoff(handoffId: string): Promise<AgentHandoff | null> {
  const result = await sql`
    UPDATE agent_handoffs
    SET status = 'declined'
    WHERE id = ${handoffId} AND status = 'pending'
    RETURNING *
  `
  return result.rows[0] ? toCamelCase<AgentHandoff>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Complete a handoff
 */
export async function completeHandoff(handoffId: string): Promise<AgentHandoff | null> {
  const result = await sql`
    UPDATE agent_handoffs
    SET status = 'completed', completed_at = NOW()
    WHERE id = ${handoffId} AND status = 'accepted'
    RETURNING *
  `
  return result.rows[0] ? toCamelCase<AgentHandoff>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Update handoff key points
 */
export async function updateHandoffKeyPoints(
  handoffId: string,
  keyPoints: string[]
): Promise<AgentHandoff | null> {
  const result = await sql`
    UPDATE agent_handoffs
    SET key_points = ${JSON.stringify(keyPoints)}
    WHERE id = ${handoffId}
    RETURNING *
  `
  return result.rows[0] ? toCamelCase<AgentHandoff>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Get handoff by conversation ID
 */
export async function getHandoffByConversation(
  conversationId: string
): Promise<AgentHandoff | null> {
  const result = await sql`
    SELECT * FROM agent_handoffs
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return result.rows[0] ? toCamelCase<AgentHandoff>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Archive old completed handoffs
 */
export async function archiveOldHandoffs(daysOld = 30): Promise<number> {
  // For now, just delete old completed handoffs
  // In a real system, you might move them to an archive table
  const result = await sql`
    DELETE FROM agent_handoffs
    WHERE status = 'completed'
      AND completed_at < NOW() - INTERVAL '1 day' * ${daysOld}
  `
  return result.rowCount ?? 0
}

// ============================================================================
// Agent-to-Agent Messages
// ============================================================================

/**
 * Create an agent message
 */
export async function createAgentMessage(
  input: SendAgentMessageInput,
  slackMessageTs: string
): Promise<AgentSlackMessage> {
  const result = await sql`
    INSERT INTO agent_slack_messages (
      slack_message_ts, slack_channel_id,
      from_agent_id, to_agent_id,
      message_type, content, context,
      handoff_conversation_id
    )
    VALUES (
      ${slackMessageTs},
      ${input.slackChannelId},
      ${input.fromAgentId},
      ${input.toAgentId || null},
      ${input.messageType},
      ${input.content},
      ${JSON.stringify(input.context || {})},
      ${input.handoffConversationId || null}
    )
    RETURNING *
  `

  return toCamelCase<AgentSlackMessage>(result.rows[0] as Record<string, unknown>)
}

/**
 * Get agent message by Slack message timestamp
 */
export async function getAgentMessageByTs(
  slackMessageTs: string,
  slackChannelId: string
): Promise<AgentSlackMessage | null> {
  const result = await sql`
    SELECT * FROM agent_slack_messages
    WHERE slack_message_ts = ${slackMessageTs}
      AND slack_channel_id = ${slackChannelId}
  `
  return result.rows[0] ? toCamelCase<AgentSlackMessage>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * List messages between agents
 */
export async function listAgentMessages(filters: {
  fromAgentId?: string
  toAgentId?: string
  messageType?: AgentMessageType
  slackChannelId?: string
  limit?: number
}): Promise<AgentSlackMessage[]> {
  const conditions: string[] = ['1=1']
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.fromAgentId) {
    conditions.push(`from_agent_id = $${paramIndex++}`)
    values.push(filters.fromAgentId)
  }
  if (filters.toAgentId) {
    conditions.push(`to_agent_id = $${paramIndex++}`)
    values.push(filters.toAgentId)
  }
  if (filters.messageType) {
    conditions.push(`message_type = $${paramIndex++}`)
    values.push(filters.messageType)
  }
  if (filters.slackChannelId) {
    conditions.push(`slack_channel_id = $${paramIndex++}`)
    values.push(filters.slackChannelId)
  }

  const limit = filters.limit || 50

  const query = `
    SELECT * FROM agent_slack_messages
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const result = await sql.query(query, values)
  return result.rows.map((row) => toCamelCase<AgentSlackMessage>(row as Record<string, unknown>))
}

/**
 * Mark handoff message as accepted
 */
export async function markHandoffMessageAccepted(
  slackMessageTs: string,
  slackChannelId: string
): Promise<void> {
  await sql`
    UPDATE agent_slack_messages
    SET handoff_accepted = true
    WHERE slack_message_ts = ${slackMessageTs}
      AND slack_channel_id = ${slackChannelId}
      AND message_type = 'handoff'
  `
}

/**
 * Get handoff stats
 */
export async function getHandoffStats(): Promise<{
  total: number
  pending: number
  accepted: number
  declined: number
  completed: number
  avgTimeToAccept: number | null
}> {
  const result = await sql`
    SELECT
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending,
      COUNT(*) FILTER (WHERE status = 'accepted')::INTEGER as accepted,
      COUNT(*) FILTER (WHERE status = 'declined')::INTEGER as declined,
      COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed,
      AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))) FILTER (WHERE accepted_at IS NOT NULL) as avg_time_to_accept
    FROM agent_handoffs
  `

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) {
    return { total: 0, pending: 0, accepted: 0, declined: 0, completed: 0, avgTimeToAccept: null }
  }
  return {
    total: (row.total as number) || 0,
    pending: (row.pending as number) || 0,
    accepted: (row.accepted as number) || 0,
    declined: (row.declined as number) || 0,
    completed: (row.completed as number) || 0,
    avgTimeToAccept: row.avg_time_to_accept ? Number(row.avg_time_to_accept) : null,
  }
}
