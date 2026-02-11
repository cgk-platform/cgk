/**
 * Handoff Context - Build context for conversation handoffs
 */

import { sql } from '@cgk/db'
import { getAgentById } from '../db/queries.js'
import { getHandoffById } from '../db/handoffs-queries.js'
import type { AgentHandoff, HandoffContext } from '../types/teams.js'

/**
 * Extract key points from a conversation
 */
export async function extractKeyPoints(conversationId: string): Promise<string[]> {
  // In a production system, this would use AI to analyze the conversation
  // For now, we'll return a placeholder or try to extract from stored messages

  // Try to get messages from the conversation
  const messages = await getConversationMessages(conversationId, 10)

  if (messages.length === 0) {
    return ['No conversation history available']
  }

  // Simple extraction: get user messages that look like questions or requests
  const keyPoints: string[] = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      // Look for questions or action items
      if (
        msg.content.includes('?') ||
        msg.content.toLowerCase().includes('please') ||
        msg.content.toLowerCase().includes('need') ||
        msg.content.toLowerCase().includes('want')
      ) {
        // Truncate long messages
        const point =
          msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content
        keyPoints.push(point)
      }
    }
  }

  // If no key points found, summarize the topics
  if (keyPoints.length === 0 && messages.length > 0) {
    keyPoints.push(`Conversation with ${messages.length} messages`)
  }

  return keyPoints.slice(0, 5) // Max 5 key points
}

/**
 * Get conversation messages (simplified - would integrate with actual message store)
 */
async function getConversationMessages(
  conversationId: string,
  limit = 20
): Promise<Array<{ role: 'user' | 'agent'; content: string; timestamp: Date }>> {
  // Try to get from agent_conversation_log if it exists
  try {
    const result = await sql`
      SELECT role, content, created_at as timestamp
      FROM agent_conversation_log
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows
      .map((row) => ({
        role: row.role as 'user' | 'agent',
        content: row.content as string,
        timestamp: row.timestamp as Date,
      }))
      .reverse()
  } catch {
    // Table might not exist yet, return empty
    return []
  }
}

/**
 * Build full handoff context for the receiving agent
 */
export async function buildHandoffContext(handoff: AgentHandoff): Promise<HandoffContext> {
  const fromAgent = await getAgentById(handoff.fromAgentId)

  // Get conversation history
  const conversationHistory = await getConversationMessages(handoff.conversationId, 20)

  return {
    handoffId: handoff.id,
    fromAgentName: fromAgent?.displayName || 'Unknown Agent',
    reason: handoff.reason,
    keyPoints: handoff.keyPoints,
    contextSummary: handoff.contextSummary,
    conversationHistory,
  }
}

/**
 * Build handoff context by ID
 */
export async function getHandoffContext(handoffId: string): Promise<HandoffContext | null> {
  const handoff = await getHandoffById(handoffId)
  if (!handoff) return null

  return buildHandoffContext(handoff)
}

/**
 * Generate a prompt section for handoff context
 */
export function buildHandoffPromptSection(context: HandoffContext): string {
  const lines: string[] = [
    '## Handoff Context',
    '',
    `You are receiving this conversation from ${context.fromAgentName}.`,
    `Reason for handoff: ${context.reason}`,
    '',
  ]

  if (context.keyPoints.length > 0) {
    lines.push('### Key Points from Previous Conversation:')
    for (const point of context.keyPoints) {
      lines.push(`- ${point}`)
    }
    lines.push('')
  }

  if (context.contextSummary) {
    lines.push('### Context Summary:')
    lines.push(context.contextSummary)
    lines.push('')
  }

  if (context.conversationHistory && context.conversationHistory.length > 0) {
    lines.push('### Recent Conversation History:')
    for (const msg of context.conversationHistory.slice(-5)) {
      const role = msg.role === 'user' ? 'User' : 'Agent'
      const content =
        msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content
      lines.push(`${role}: ${content}`)
    }
    lines.push('')
  }

  lines.push(
    'Please acknowledge the handoff and continue helping the user with their request.'
  )

  return lines.join('\n')
}

/**
 * Summarize a conversation for handoff
 */
export async function summarizeForHandoff(conversationId: string): Promise<string> {
  const messages = await getConversationMessages(conversationId, 20)

  if (messages.length === 0) {
    return 'No conversation history available.'
  }

  // Build a simple summary
  const userMessages = messages.filter((m) => m.role === 'user')
  const agentMessages = messages.filter((m) => m.role === 'agent')

  const lines: string[] = [
    `Conversation with ${messages.length} total messages (${userMessages.length} from user, ${agentMessages.length} from agent).`,
  ]

  // Get first user message as the initial topic
  const firstUserMessage = userMessages[0]
  if (firstUserMessage) {
    const firstMessage = firstUserMessage.content
    const truncated =
      firstMessage.length > 100 ? firstMessage.substring(0, 100) + '...' : firstMessage
    lines.push(`Initial request: "${truncated}"`)
  }

  // Get last user message as current state
  if (userMessages.length > 1) {
    const lastUserMessage = userMessages[userMessages.length - 1]
    if (lastUserMessage) {
      const lastMessage = lastUserMessage.content
      const truncated =
        lastMessage.length > 100 ? lastMessage.substring(0, 100) + '...' : lastMessage
      lines.push(`Most recent message: "${truncated}"`)
    }
  }

  return lines.join(' ')
}

/**
 * Get suggested handoff reason based on conversation
 */
export async function suggestHandoffReason(
  _conversationId: string,
  targetAgentId: string
): Promise<string> {
  const targetAgent = await getAgentById(targetAgentId)
  if (!targetAgent) {
    return 'Transferring to another agent'
  }

  // Get the agent's specializations to suggest a relevant reason
  const { getAgentTeamMemberships } = await import('../db/teams-queries.js')
  const memberships = await getAgentTeamMemberships(targetAgentId)

  const specializations = memberships.flatMap((m) => m.specializations)

  if (specializations.length > 0) {
    return `Transferring to ${targetAgent.displayName} who specializes in ${specializations[0]}`
  }

  return `Transferring to ${targetAgent.displayName}`
}
