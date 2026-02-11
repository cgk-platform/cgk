/**
 * Initiate Handoff - Start a conversation handoff between agents
 */

import { getAgentById } from '../db/queries.js'
import {
  createHandoff,
  createAgentMessage,
  getHandoffByConversation,
  listPendingHandoffs,
} from '../db/handoffs-queries.js'
import { logAction } from '../actions/logger.js'
import { extractKeyPoints } from './context.js'
import type {
  AgentHandoff,
  AgentHandoffWithAgents,
  InitiateHandoffInput,
} from '../types/teams.js'

/**
 * Initiate a handoff from one agent to another
 */
export async function initiateHandoff(
  input: InitiateHandoffInput
): Promise<AgentHandoff> {
  // Verify from agent exists
  const fromAgent = await getAgentById(input.fromAgentId)
  if (!fromAgent) {
    throw new Error(`From agent ${input.fromAgentId} not found`)
  }

  // Verify to agent exists
  const toAgent = await getAgentById(input.toAgentId)
  if (!toAgent) {
    throw new Error(`To agent ${input.toAgentId} not found`)
  }

  // Check if there's already a pending handoff for this conversation
  const existing = await getHandoffByConversation(input.conversationId)
  if (existing && existing.status === 'pending') {
    throw new Error('A handoff is already pending for this conversation')
  }

  // Build context from conversation
  const keyPoints = await extractKeyPoints(input.conversationId)

  // Create handoff record
  const handoff = await createHandoff(input, keyPoints)

  // Log action
  await logAction({
    agentId: input.fromAgentId,
    actionType: 'initiate_handoff',
    actionCategory: 'system',
    actionDescription: `Initiated handoff to ${toAgent.displayName}`,
    inputData: { reason: input.reason, toAgentId: input.toAgentId },
    outputData: { handoffId: handoff.id },
  })

  return handoff
}

/**
 * Initiate handoff and send notification
 */
export async function initiateAndNotifyHandoff(
  input: InitiateHandoffInput & { slackChannelId: string }
): Promise<{
  handoff: AgentHandoff
  notificationSent: boolean
}> {
  const handoff = await initiateHandoff(input)

  // Create agent-to-agent message
  const fromAgent = await getAgentById(input.fromAgentId)

  try {
    // Generate a mock Slack message timestamp (in production, this would come from Slack API)
    const slackMessageTs = `${Date.now() / 1000}.${Math.floor(Math.random() * 1000000)}`

    await createAgentMessage(
      {
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        slackChannelId: input.slackChannelId,
        messageType: 'handoff',
        content: `Handoff from ${fromAgent!.displayName}: ${input.reason}`,
        context: {
          handoffId: handoff.id,
          conversationId: input.conversationId,
          keyPoints: handoff.keyPoints,
        },
        handoffConversationId: input.conversationId,
      },
      slackMessageTs
    )

    return {
      handoff,
      notificationSent: true,
    }
  } catch (error) {
    console.error('Failed to send handoff notification:', error)
    return {
      handoff,
      notificationSent: false,
    }
  }
}

/**
 * Get pending handoffs for an agent
 */
export async function getPendingHandoffs(
  agentId: string
): Promise<AgentHandoffWithAgents[]> {
  return listPendingHandoffs(agentId)
}

/**
 * Check if an agent can handoff to another
 */
export async function canHandoffTo(
  fromAgentId: string,
  toAgentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Verify both agents exist and are active
  const fromAgent = await getAgentById(fromAgentId)
  if (!fromAgent || fromAgent.status !== 'active') {
    return { allowed: false, reason: 'From agent is not active' }
  }

  const toAgent = await getAgentById(toAgentId)
  if (!toAgent || toAgent.status !== 'active') {
    return { allowed: false, reason: 'To agent is not active' }
  }

  // Cannot handoff to self
  if (fromAgentId === toAgentId) {
    return { allowed: false, reason: 'Cannot handoff to self' }
  }

  return { allowed: true }
}

/**
 * Suggest agents for handoff based on topic
 */
export async function suggestHandoffAgents(
  currentAgentId: string,
  topic?: string
): Promise<Array<{ agentId: string; agentName: string; reason: string }>> {
  const { listAgentsWithSpecializations } = await import('../teams/routing.js')
  const agents = await listAgentsWithSpecializations()

  const suggestions: Array<{ agentId: string; agentName: string; reason: string; score: number }> =
    []

  for (const agent of agents) {
    if (agent.id === currentAgentId) continue
    if (agent.status !== 'active') continue

    // Check if agent has relevant specialization
    if (topic) {
      const topicLower = topic.toLowerCase()
      for (const membership of agent.teamMemberships) {
        for (const spec of membership.specializations) {
          if (
            spec.toLowerCase().includes(topicLower) ||
            topicLower.includes(spec.toLowerCase())
          ) {
            suggestions.push({
              agentId: agent.id,
              agentName: agent.displayName,
              reason: `Specializes in ${spec}`,
              score: 0.9,
            })
          }
        }
      }
    }

    // Add all other agents as lower-priority suggestions
    if (!suggestions.some((s) => s.agentId === agent.id)) {
      suggestions.push({
        agentId: agent.id,
        agentName: agent.displayName,
        reason: agent.isPrimary ? 'Primary agent' : 'Available agent',
        score: agent.isPrimary ? 0.5 : 0.3,
      })
    }
  }

  // Sort by score and return top 3
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ agentId, agentName, reason }) => ({ agentId, agentName, reason }))
}

/**
 * Cancel a pending handoff
 */
export async function cancelHandoff(handoffId: string): Promise<void> {
  const { sql } = await import('@cgk/db')

  await sql`
    UPDATE agent_handoffs
    SET status = 'declined'
    WHERE id = ${handoffId} AND status = 'pending'
  `
}
