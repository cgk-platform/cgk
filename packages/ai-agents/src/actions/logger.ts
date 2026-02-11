/**
 * Action logger for AI agents
 * Complete audit trail of all agent actions
 */

import {
  getActionLog,
  listActionLogs,
  logAction as dbLogAction,
  updateActionApproval,
} from '../db/queries.js'
import { checkAutonomy } from '../autonomy/check.js'
import type {
  ActionCategory,
  ActionLogFilters,
  AgentActionLog,
  AgentActionLogWithAgent,
  ApprovalStatus,
  LogActionInput,
} from '../types.js'

/**
 * Log an agent action with automatic approval status based on autonomy settings
 */
export async function logAction(input: LogActionInput): Promise<AgentActionLog> {
  // Check if this action type requires approval
  let requiresApproval = input.requiresApproval

  if (requiresApproval === undefined) {
    const autonomyResult = await checkAutonomy(input.agentId, input.actionType)
    requiresApproval = autonomyResult.requiresApproval
  }

  return dbLogAction({
    ...input,
    requiresApproval,
  })
}

/**
 * Log a successful action
 */
export async function logSuccess(params: {
  agentId: string
  actionType: string
  description: string
  category?: ActionCategory
  inputData?: Record<string, unknown>
  outputData?: Record<string, unknown>
  toolsUsed?: string[]
  creatorId?: string
  projectId?: string
  conversationId?: string
}): Promise<AgentActionLog> {
  return logAction({
    agentId: params.agentId,
    actionType: params.actionType,
    actionDescription: params.description,
    actionCategory: params.category,
    inputData: params.inputData,
    outputData: params.outputData,
    toolsUsed: params.toolsUsed,
    creatorId: params.creatorId,
    projectId: params.projectId,
    conversationId: params.conversationId,
    success: true,
  })
}

/**
 * Log a failed action
 */
export async function logFailure(params: {
  agentId: string
  actionType: string
  description: string
  error: string
  category?: ActionCategory
  inputData?: Record<string, unknown>
  toolsUsed?: string[]
  creatorId?: string
  projectId?: string
  conversationId?: string
}): Promise<AgentActionLog> {
  return logAction({
    agentId: params.agentId,
    actionType: params.actionType,
    actionDescription: params.description,
    actionCategory: params.category,
    inputData: params.inputData,
    toolsUsed: params.toolsUsed,
    creatorId: params.creatorId,
    projectId: params.projectId,
    conversationId: params.conversationId,
    success: false,
    errorMessage: params.error,
  })
}

/**
 * Get action log entry by ID
 */
export async function getAction(actionId: string): Promise<AgentActionLog | null> {
  return getActionLog(actionId)
}

/**
 * List action logs with optional filters
 */
export async function listActions(
  filters: ActionLogFilters = {}
): Promise<AgentActionLogWithAgent[]> {
  return listActionLogs(filters)
}

/**
 * Get actions for a specific agent
 */
export async function getAgentActions(
  agentId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<AgentActionLogWithAgent[]> {
  return listActionLogs({
    agentId,
    limit: options.limit,
    offset: options.offset,
  })
}

/**
 * Get actions for a specific creator
 */
export async function getCreatorActions(
  creatorId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<AgentActionLogWithAgent[]> {
  return listActionLogs({
    creatorId,
    limit: options.limit,
    offset: options.offset,
  })
}

/**
 * Get pending approval actions
 */
export async function getPendingActions(
  agentId?: string
): Promise<AgentActionLogWithAgent[]> {
  return listActionLogs({
    agentId,
    approvalStatus: 'pending',
  })
}

/**
 * Approve an action
 */
export async function approveAction(
  actionId: string,
  approvedBy: string
): Promise<AgentActionLog | null> {
  return updateActionApproval(actionId, 'approved', approvedBy)
}

/**
 * Reject an action
 */
export async function rejectAction(
  actionId: string,
  rejectedBy: string
): Promise<AgentActionLog | null> {
  return updateActionApproval(actionId, 'rejected', rejectedBy)
}

/**
 * Update action approval status
 */
export async function setActionApprovalStatus(
  actionId: string,
  status: ApprovalStatus,
  approvedBy?: string
): Promise<AgentActionLog | null> {
  return updateActionApproval(actionId, status, approvedBy)
}

/**
 * Get action statistics for an agent
 */
export async function getAgentActionStats(
  agentId: string,
  days: number = 7
): Promise<{
  total: number
  successful: number
  failed: number
  pending: number
  approved: number
  rejected: number
  byCategory: Record<string, number>
  byType: Record<string, number>
}> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const actions = await listActionLogs({
    agentId,
    startDate,
    limit: 10000, // Get all for stats
  })

  const stats = {
    total: actions.length,
    successful: 0,
    failed: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    byCategory: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  }

  for (const action of actions) {
    if (action.success) {
      stats.successful++
    } else {
      stats.failed++
    }

    if (action.approvalStatus === 'pending') {
      stats.pending++
    } else if (action.approvalStatus === 'approved') {
      stats.approved++
    } else if (action.approvalStatus === 'rejected') {
      stats.rejected++
    }

    if (action.actionCategory) {
      stats.byCategory[action.actionCategory] =
        (stats.byCategory[action.actionCategory] || 0) + 1
    }

    stats.byType[action.actionType] = (stats.byType[action.actionType] || 0) + 1
  }

  return stats
}
