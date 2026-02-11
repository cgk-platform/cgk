/**
 * Approval workflow for AI agent actions
 */

import {
  createApprovalRequest as dbCreateRequest,
  expireOldApprovals,
  getApprovalRequest,
  listPendingApprovals,
  respondToApproval,
} from '../db/queries.js'
import type {
  AgentApprovalRequest,
  ApprovalRequestWithAgent,
  CreateApprovalRequestInput,
} from '../types.js'

/**
 * Create a new approval request
 */
export async function createApprovalRequest(
  input: CreateApprovalRequestInput
): Promise<AgentApprovalRequest> {
  return dbCreateRequest(input)
}

/**
 * Get an approval request by ID
 */
export async function getRequest(requestId: string): Promise<AgentApprovalRequest | null> {
  return getApprovalRequest(requestId)
}

/**
 * List all pending approval requests
 */
export async function listPending(
  filters: { agentId?: string; approverId?: string } = {}
): Promise<ApprovalRequestWithAgent[]> {
  return listPendingApprovals(filters)
}

/**
 * List pending approvals for a specific agent
 */
export async function listAgentPending(agentId: string): Promise<ApprovalRequestWithAgent[]> {
  return listPendingApprovals({ agentId })
}

/**
 * List pending approvals assigned to a specific user
 */
export async function listUserPending(userId: string): Promise<ApprovalRequestWithAgent[]> {
  return listPendingApprovals({ approverId: userId })
}

/**
 * Approve a request
 */
export async function approve(
  requestId: string,
  responseNote?: string
): Promise<AgentApprovalRequest | null> {
  return respondToApproval(requestId, 'approved', responseNote)
}

/**
 * Reject a request
 */
export async function reject(
  requestId: string,
  responseNote?: string
): Promise<AgentApprovalRequest | null> {
  return respondToApproval(requestId, 'rejected', responseNote)
}

/**
 * Cancel a pending request (agent-initiated)
 */
export async function cancel(requestId: string): Promise<AgentApprovalRequest | null> {
  const request = await getApprovalRequest(requestId)
  if (!request || request.status !== 'pending') {
    return null
  }

  return respondToApproval(requestId, 'rejected', 'Cancelled by agent')
}

/**
 * Expire all old pending approvals
 * This should be run periodically by a background job
 */
export async function expirePendingApprovals(): Promise<number> {
  return expireOldApprovals()
}

/**
 * Check if a request is still valid (not expired or already processed)
 */
export async function isRequestValid(requestId: string): Promise<boolean> {
  const request = await getApprovalRequest(requestId)
  if (!request) return false
  if (request.status !== 'pending') return false
  if (new Date(request.expiresAt) < new Date()) return false
  return true
}

/**
 * Get approval request stats
 */
export async function getApprovalStats(
  agentId?: string
): Promise<{
  pending: number
  approved: number
  rejected: number
  expired: number
  averageResponseTimeHours: number | null
}> {
  const pending = await listPendingApprovals(agentId ? { agentId } : {})

  // For a real implementation, we'd query the database for historical stats
  // For now, return basic stats
  return {
    pending: pending.length,
    approved: 0,
    rejected: 0,
    expired: 0,
    averageResponseTimeHours: null,
  }
}

/**
 * Format time remaining for an approval request
 */
export function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date()
  const diff = new Date(expiresAt).getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

/**
 * Determine urgency level based on time remaining
 */
export function getUrgencyLevel(expiresAt: Date): 'low' | 'medium' | 'high' | 'critical' {
  const now = new Date()
  const diff = new Date(expiresAt).getTime() - now.getTime()
  const hoursRemaining = diff / (1000 * 60 * 60)

  if (hoursRemaining <= 1) return 'critical'
  if (hoursRemaining <= 4) return 'high'
  if (hoursRemaining <= 12) return 'medium'
  return 'low'
}
