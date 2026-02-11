/**
 * Accept/Decline Handoffs - Handle handoff responses
 */

import { getAgentById } from '../db/queries.js'
import {
  acceptHandoff as dbAcceptHandoff,
  completeHandoff as dbCompleteHandoff,
  declineHandoff as dbDeclineHandoff,
  getHandoffById,
  getHandoffWithAgents,
  markHandoffMessageAccepted,
} from '../db/handoffs-queries.js'
import { logAction } from '../actions/logger.js'
import { buildHandoffContext } from './context.js'
import type { AgentHandoff, HandoffContext } from '../types/teams.js'

/**
 * Accept a handoff
 */
export async function acceptHandoff(
  handoffId: string,
  agentId: string
): Promise<{ handoff: AgentHandoff; context: HandoffContext }> {
  // Get handoff
  const handoff = await getHandoffById(handoffId)
  if (!handoff) {
    throw new Error(`Handoff ${handoffId} not found`)
  }

  // Verify the agent is the intended recipient
  if (handoff.toAgentId !== agentId) {
    throw new Error('Only the receiving agent can accept this handoff')
  }

  // Verify handoff is still pending
  if (handoff.status !== 'pending') {
    throw new Error(`Handoff is already ${handoff.status}`)
  }

  // Accept the handoff
  const acceptedHandoff = await dbAcceptHandoff(handoffId)
  if (!acceptedHandoff) {
    throw new Error('Failed to accept handoff')
  }

  // Build context for the receiving agent
  const context = await buildHandoffContext(handoff)

  // Log action
  const fromAgent = await getAgentById(handoff.fromAgentId)
  await logAction({
    agentId,
    actionType: 'accept_handoff',
    actionCategory: 'system',
    actionDescription: `Accepted handoff from ${fromAgent?.displayName}`,
    inputData: { handoffId },
  })

  return {
    handoff: acceptedHandoff,
    context,
  }
}

/**
 * Decline a handoff
 */
export async function declineHandoff(
  handoffId: string,
  agentId: string,
  reason?: string
): Promise<AgentHandoff> {
  // Get handoff
  const handoff = await getHandoffById(handoffId)
  if (!handoff) {
    throw new Error(`Handoff ${handoffId} not found`)
  }

  // Verify the agent is the intended recipient
  if (handoff.toAgentId !== agentId) {
    throw new Error('Only the receiving agent can decline this handoff')
  }

  // Verify handoff is still pending
  if (handoff.status !== 'pending') {
    throw new Error(`Handoff is already ${handoff.status}`)
  }

  // Decline the handoff
  const declinedHandoff = await dbDeclineHandoff(handoffId)
  if (!declinedHandoff) {
    throw new Error('Failed to decline handoff')
  }

  // Log action
  const fromAgent = await getAgentById(handoff.fromAgentId)
  await logAction({
    agentId,
    actionType: 'decline_handoff',
    actionCategory: 'system',
    actionDescription: `Declined handoff from ${fromAgent?.displayName}`,
    inputData: { handoffId, reason },
  })

  return declinedHandoff
}

/**
 * Complete a handoff (mark as done)
 */
export async function completeHandoff(
  handoffId: string,
  agentId: string
): Promise<AgentHandoff> {
  // Get handoff
  const handoff = await getHandoffById(handoffId)
  if (!handoff) {
    throw new Error(`Handoff ${handoffId} not found`)
  }

  // Verify the agent is the recipient who accepted
  if (handoff.toAgentId !== agentId) {
    throw new Error('Only the receiving agent can complete this handoff')
  }

  // Verify handoff was accepted
  if (handoff.status !== 'accepted') {
    throw new Error(`Handoff must be accepted before completing (current status: ${handoff.status})`)
  }

  // Complete the handoff
  const completedHandoff = await dbCompleteHandoff(handoffId)
  if (!completedHandoff) {
    throw new Error('Failed to complete handoff')
  }

  // Log action
  await logAction({
    agentId,
    actionType: 'complete_handoff',
    actionCategory: 'system',
    actionDescription: 'Completed handoff conversation',
    inputData: { handoffId },
  })

  return completedHandoff
}

/**
 * Get handoff details with agent info
 */
export async function getHandoffDetails(handoffId: string) {
  return getHandoffWithAgents(handoffId)
}

/**
 * Check if an agent has pending handoffs
 */
export async function hasPendingHandoffs(agentId: string): Promise<boolean> {
  const { listPendingHandoffs } = await import('../db/handoffs-queries.js')
  const pending = await listPendingHandoffs(agentId)
  return pending.length > 0
}

/**
 * Get the count of pending handoffs for an agent
 */
export async function getPendingHandoffCount(agentId: string): Promise<number> {
  const { listPendingHandoffs } = await import('../db/handoffs-queries.js')
  const pending = await listPendingHandoffs(agentId)
  return pending.length
}

/**
 * Auto-accept handoff if conditions are met
 */
export async function autoAcceptIfEligible(
  handoffId: string,
  agentId: string
): Promise<{ accepted: boolean; reason: string }> {
  const handoff = await getHandoffById(handoffId)
  if (!handoff) {
    return { accepted: false, reason: 'Handoff not found' }
  }

  if (handoff.toAgentId !== agentId) {
    return { accepted: false, reason: 'Not the intended recipient' }
  }

  if (handoff.status !== 'pending') {
    return { accepted: false, reason: `Handoff already ${handoff.status}` }
  }

  // Check if agent is available (could add more sophisticated availability checks)
  const agent = await getAgentById(agentId)
  if (!agent || agent.status !== 'active') {
    return { accepted: false, reason: 'Agent not available' }
  }

  // Auto-accept
  await acceptHandoff(handoffId, agentId)
  return { accepted: true, reason: 'Auto-accepted based on availability' }
}

/**
 * Handle Slack message action for handoff accept
 */
export async function handleSlackHandoffAccept(
  slackMessageTs: string,
  slackChannelId: string,
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the agent message
    const { getAgentMessageByTs } = await import('../db/handoffs-queries.js')
    const message = await getAgentMessageByTs(slackMessageTs, slackChannelId)

    if (!message) {
      return { success: false, error: 'Message not found' }
    }

    if (message.messageType !== 'handoff') {
      return { success: false, error: 'Not a handoff message' }
    }

    const handoffId = (message.context as { handoffId?: string }).handoffId
    if (!handoffId) {
      return { success: false, error: 'No handoff ID in message' }
    }

    // Accept the handoff
    await acceptHandoff(handoffId, agentId)

    // Mark message as accepted
    await markHandoffMessageAccepted(slackMessageTs, slackChannelId)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
