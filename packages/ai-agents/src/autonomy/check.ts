/**
 * Autonomy checking - determine if an action can be performed automatically
 */

import {
  countActionsToday,
  createApprovalRequest,
  getActionAutonomy,
  getAutonomySettings,
} from '../db/queries.js'
import { DEFAULT_ACTION_AUTONOMY } from '../types.js'
import type { AutonomyCheckResult, CreateApprovalRequestInput } from '../types.js'

export interface AutonomyContext {
  /** Monetary amount involved in the action */
  amount?: number
  /** Reason for the action (used in approval requests) */
  reason?: string
  /** Who should approve if needed */
  approverId?: string
  /** Hours until approval expires */
  expiresInHours?: number
}

/**
 * Check if an agent can perform an action autonomously
 */
export async function checkAutonomy(
  agentId: string,
  actionType: string,
  context: AutonomyContext = {}
): Promise<AutonomyCheckResult> {
  // Get agent's autonomy settings
  const settings = await getAutonomySettings(agentId)
  if (!settings) {
    return {
      allowed: false,
      level: 'human_required',
      reason: 'Agent autonomy settings not configured',
      requiresApproval: true,
    }
  }

  // Get action-specific configuration
  let actionConfig = await getActionAutonomy(agentId, actionType)

  // If no specific config, use defaults
  if (!actionConfig) {
    const defaultLevel = DEFAULT_ACTION_AUTONOMY[actionType] || 'suggest_and_confirm'
    actionConfig = {
      id: '',
      agentId,
      actionType,
      autonomyLevel: defaultLevel,
      enabled: true,
      requiresApproval: defaultLevel !== 'autonomous',
      maxPerDay: null,
      cooldownHours: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  // Check if action is enabled
  if (!actionConfig.enabled) {
    return {
      allowed: false,
      level: 'human_required',
      reason: 'Action is disabled for this agent',
      requiresApproval: false,
    }
  }

  // Check daily rate limit
  if (actionConfig.maxPerDay !== null) {
    const actionsToday = await countActionsToday(agentId, actionType)
    if (actionsToday >= actionConfig.maxPerDay) {
      return {
        allowed: false,
        level: 'human_required',
        reason: `Daily limit of ${actionConfig.maxPerDay} reached for this action`,
        requiresApproval: false,
      }
    }
  }

  // Check global hourly rate limit
  const totalActionsToday = await countActionsToday(agentId)
  const hourlyRate = totalActionsToday / 24 // Approximate
  if (hourlyRate >= settings.maxActionsPerHour) {
    return {
      allowed: false,
      level: 'human_required',
      reason: `Approaching hourly action limit of ${settings.maxActionsPerHour}`,
      requiresApproval: true,
    }
  }

  // Check high-value threshold
  if (context.amount !== undefined && context.amount >= settings.requireHumanForHighValue) {
    return {
      allowed: false,
      level: 'human_required',
      reason: `Amount $${context.amount.toFixed(2)} exceeds threshold of $${settings.requireHumanForHighValue.toFixed(2)}`,
      requiresApproval: true,
    }
  }

  // Return based on autonomy level
  switch (actionConfig.autonomyLevel) {
    case 'autonomous':
      return {
        allowed: true,
        level: 'autonomous',
        requiresApproval: false,
      }

    case 'suggest_and_confirm':
      return {
        allowed: false,
        level: 'suggest_and_confirm',
        reason: 'Action requires confirmation before execution',
        requiresApproval: true,
      }

    case 'human_required':
      return {
        allowed: false,
        level: 'human_required',
        reason: 'Action requires human approval',
        requiresApproval: true,
      }

    default:
      return {
        allowed: false,
        level: 'human_required',
        reason: 'Unknown autonomy level',
        requiresApproval: true,
      }
  }
}

/**
 * Check autonomy and create approval request if needed
 */
export async function checkAutonomyWithApproval(
  agentId: string,
  actionType: string,
  actionPayload: Record<string, unknown>,
  context: AutonomyContext = {}
): Promise<AutonomyCheckResult> {
  const result = await checkAutonomy(agentId, actionType, context)

  if (result.requiresApproval) {
    const approvalInput: CreateApprovalRequestInput = {
      agentId,
      actionType,
      actionPayload,
      reason: context.reason,
      approverType: 'human',
      approverId: context.approverId,
      expiresInHours: context.expiresInHours,
    }

    const request = await createApprovalRequest(approvalInput)
    result.approvalId = request.id
  }

  return result
}

/**
 * Get all action types that require approval for an agent
 */
export async function getActionsRequiringApproval(_agentId: string): Promise<string[]> {
  // This would query all action autonomy settings
  // For now, return default human_required actions
  return Object.entries(DEFAULT_ACTION_AUTONOMY)
    .filter(([_, level]) => level !== 'autonomous')
    .map(([action, _]) => action)
}

/**
 * Check if an action would require approval based on current settings
 */
export async function wouldRequireApproval(
  agentId: string,
  actionType: string,
  context: AutonomyContext = {}
): Promise<boolean> {
  const result = await checkAutonomy(agentId, actionType, context)
  return result.requiresApproval
}
