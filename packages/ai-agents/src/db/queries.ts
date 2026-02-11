/**
 * Database queries for AI Agent system
 * All queries expect to be run within a tenant context via withTenant()
 */

import { sql } from '@cgk/db'
import type {
  ActionLogFilters,
  AgentActionAutonomy,
  AgentActionLog,
  AgentActionLogWithAgent,
  AgentApprovalRequest,
  AgentAutonomySettings,
  AgentPersonality,
  AIAgent,
  AIAgentWithDetails,
  ApprovalRequestWithAgent,
  ApprovalStatus,
  CreateAgentInput,
  CreateApprovalRequestInput,
  LogActionInput,
  UpdateActionAutonomyInput,
  UpdateAgentInput,
  UpdateAutonomySettingsInput,
  UpdatePersonalityInput,
} from '../types.js'

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result
}

// ============================================================================
// Agent CRUD
// ============================================================================

/**
 * Create a new AI agent
 */
export async function createAgent(input: CreateAgentInput): Promise<AIAgent> {
  const result = await sql`
    INSERT INTO ai_agents (
      name, display_name, email, role, avatar_url,
      ai_model, ai_temperature, ai_max_tokens,
      capabilities, tool_access, is_primary, human_manager_id
    )
    VALUES (
      ${input.name},
      ${input.displayName},
      ${input.email || null},
      ${input.role},
      ${input.avatarUrl || null},
      ${input.aiModel || 'claude-sonnet-4-20250514'},
      ${input.aiTemperature ?? 0.7},
      ${input.aiMaxTokens ?? 4096},
      ${input.capabilities || ['slack', 'email']},
      ${input.toolAccess || []},
      ${input.isPrimary || false},
      ${input.humanManagerId || null}
    )
    RETURNING *
  `

  return toCamelCase(result.rows[0]) as AIAgent
}

/**
 * Get an agent by ID
 */
export async function getAgentById(agentId: string): Promise<AIAgent | null> {
  const result = await sql`
    SELECT * FROM ai_agents WHERE id = ${agentId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AIAgent) : null
}

/**
 * Get an agent by name
 */
export async function getAgentByName(name: string): Promise<AIAgent | null> {
  const result = await sql`
    SELECT * FROM ai_agents WHERE name = ${name}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AIAgent) : null
}

/**
 * Get the primary agent for the tenant
 */
export async function getPrimaryAgent(): Promise<AIAgent | null> {
  const result = await sql`
    SELECT * FROM ai_agents
    WHERE is_primary = true AND status = 'active'
    LIMIT 1
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AIAgent) : null
}

/**
 * List all agents with details
 */
export async function listAgents(): Promise<AIAgentWithDetails[]> {
  const result = await sql`
    SELECT
      a.*,
      p.id as p_id,
      p.trait_formality,
      p.trait_verbosity,
      p.trait_proactivity,
      p.trait_humor,
      p.trait_emoji_usage,
      p.trait_assertiveness,
      p.preferred_greeting,
      p.signature,
      p.go_to_emojis,
      p.always_confirm_actions,
      p.offer_alternatives,
      p.explain_reasoning,
      p.custom_greeting_templates,
      p.custom_error_templates,
      p.forbidden_topics,
      p.created_at as p_created_at,
      p.updated_at as p_updated_at,
      s.id as s_id,
      s.max_actions_per_hour,
      s.max_cost_per_day,
      s.require_human_for_high_value,
      s.adapt_to_feedback,
      s.track_success_patterns,
      s.adjust_to_user_preferences,
      s.created_at as s_created_at,
      s.updated_at as s_updated_at,
      (
        SELECT COUNT(*)::INTEGER
        FROM agent_action_log
        WHERE agent_id = a.id AND created_at > NOW() - INTERVAL '24 hours'
      ) as actions_today,
      0 as memory_count,
      NULL::NUMERIC as avg_confidence
    FROM ai_agents a
    LEFT JOIN agent_personality p ON p.agent_id = a.id
    LEFT JOIN agent_autonomy_settings s ON s.agent_id = a.id
    ORDER BY a.is_primary DESC, a.created_at ASC
  `

  return result.rows.map((row) => {
    const agent = toCamelCase(row) as AIAgentWithDetails & Record<string, unknown>

    // Extract nested personality
    if (agent.pId) {
      agent.personality = {
        id: agent.pId as string,
        agentId: agent.id as string,
        traitFormality: Number(agent.traitFormality),
        traitVerbosity: Number(agent.traitVerbosity),
        traitProactivity: Number(agent.traitProactivity),
        traitHumor: Number(agent.traitHumor),
        traitEmojiUsage: Number(agent.traitEmojiUsage),
        traitAssertiveness: Number(agent.traitAssertiveness),
        preferredGreeting: agent.preferredGreeting as string | null,
        signature: agent.signature as string | null,
        goToEmojis: agent.goToEmojis as string[],
        alwaysConfirmActions: agent.alwaysConfirmActions as boolean,
        offerAlternatives: agent.offerAlternatives as boolean,
        explainReasoning: agent.explainReasoning as boolean,
        customGreetingTemplates: agent.customGreetingTemplates as string[],
        customErrorTemplates: agent.customErrorTemplates as string[],
        forbiddenTopics: agent.forbiddenTopics as string[],
        createdAt: agent.pCreatedAt as Date,
        updatedAt: agent.pUpdatedAt as Date,
      }
    } else {
      agent.personality = null
    }

    // Extract nested autonomy settings
    if (agent.sId) {
      agent.autonomySettings = {
        id: agent.sId as string,
        agentId: agent.id as string,
        maxActionsPerHour: agent.maxActionsPerHour as number,
        maxCostPerDay: Number(agent.maxCostPerDay),
        requireHumanForHighValue: Number(agent.requireHumanForHighValue),
        adaptToFeedback: agent.adaptToFeedback as boolean,
        trackSuccessPatterns: agent.trackSuccessPatterns as boolean,
        adjustToUserPreferences: agent.adjustToUserPreferences as boolean,
        createdAt: agent.sCreatedAt as Date,
        updatedAt: agent.sUpdatedAt as Date,
      }
    } else {
      agent.autonomySettings = null
    }

    // Clean up temporary fields
    delete agent.pId
    delete agent.pCreatedAt
    delete agent.pUpdatedAt
    delete agent.sId
    delete agent.sCreatedAt
    delete agent.sUpdatedAt

    return agent as AIAgentWithDetails
  })
}

/**
 * Update an agent
 */
export async function updateAgent(
  agentId: string,
  input: UpdateAgentInput
): Promise<AIAgent | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.displayName !== undefined) {
    sets.push(`display_name = $${paramIndex++}`)
    values.push(input.displayName)
  }
  if (input.email !== undefined) {
    sets.push(`email = $${paramIndex++}`)
    values.push(input.email)
  }
  if (input.role !== undefined) {
    sets.push(`role = $${paramIndex++}`)
    values.push(input.role)
  }
  if (input.avatarUrl !== undefined) {
    sets.push(`avatar_url = $${paramIndex++}`)
    values.push(input.avatarUrl)
  }
  if (input.status !== undefined) {
    sets.push(`status = $${paramIndex++}`)
    values.push(input.status)
  }
  if (input.aiModel !== undefined) {
    sets.push(`ai_model = $${paramIndex++}`)
    values.push(input.aiModel)
  }
  if (input.aiTemperature !== undefined) {
    sets.push(`ai_temperature = $${paramIndex++}`)
    values.push(input.aiTemperature)
  }
  if (input.aiMaxTokens !== undefined) {
    sets.push(`ai_max_tokens = $${paramIndex++}`)
    values.push(input.aiMaxTokens)
  }
  if (input.capabilities !== undefined) {
    sets.push(`capabilities = $${paramIndex++}`)
    values.push(input.capabilities)
  }
  if (input.toolAccess !== undefined) {
    sets.push(`tool_access = $${paramIndex++}`)
    values.push(input.toolAccess)
  }
  if (input.isPrimary !== undefined) {
    sets.push(`is_primary = $${paramIndex++}`)
    values.push(input.isPrimary)
  }
  if (input.humanManagerId !== undefined) {
    sets.push(`human_manager_id = $${paramIndex++}`)
    values.push(input.humanManagerId)
  }
  if (input.managerAgentId !== undefined) {
    sets.push(`manager_agent_id = $${paramIndex++}`)
    values.push(input.managerAgentId)
  }
  if (input.connectedAccounts !== undefined) {
    sets.push(`connected_accounts = $${paramIndex++}`)
    values.push(JSON.stringify(input.connectedAccounts))
  }

  if (sets.length === 0) {
    return getAgentById(agentId)
  }

  values.push(agentId)
  const result = await sql.query(
    `UPDATE ai_agents SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  )

  return result.rows[0] ? (toCamelCase(result.rows[0]) as AIAgent) : null
}

/**
 * Delete (retire) an agent
 */
export async function retireAgent(agentId: string): Promise<boolean> {
  const result = await sql`
    UPDATE ai_agents SET status = 'retired' WHERE id = ${agentId}
  `
  return (result.rowCount ?? 0) > 0
}

// ============================================================================
// Personality
// ============================================================================

/**
 * Create default personality for an agent
 */
export async function createDefaultPersonality(agentId: string): Promise<AgentPersonality> {
  const result = await sql`
    INSERT INTO agent_personality (agent_id)
    VALUES (${agentId})
    ON CONFLICT (agent_id) DO NOTHING
    RETURNING *
  `

  // If already exists, fetch it
  if (result.rows.length === 0) {
    const existing = await sql`
      SELECT * FROM agent_personality WHERE agent_id = ${agentId}
    `
    return toCamelCase(existing.rows[0]) as AgentPersonality
  }

  return toCamelCase(result.rows[0]) as AgentPersonality
}

/**
 * Get personality for an agent
 */
export async function getAgentPersonality(agentId: string): Promise<AgentPersonality | null> {
  const result = await sql`
    SELECT * FROM agent_personality WHERE agent_id = ${agentId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentPersonality) : null
}

/**
 * Update agent personality
 */
export async function updateAgentPersonality(
  agentId: string,
  input: UpdatePersonalityInput
): Promise<AgentPersonality | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.traitFormality !== undefined) {
    sets.push(`trait_formality = $${paramIndex++}`)
    values.push(input.traitFormality)
  }
  if (input.traitVerbosity !== undefined) {
    sets.push(`trait_verbosity = $${paramIndex++}`)
    values.push(input.traitVerbosity)
  }
  if (input.traitProactivity !== undefined) {
    sets.push(`trait_proactivity = $${paramIndex++}`)
    values.push(input.traitProactivity)
  }
  if (input.traitHumor !== undefined) {
    sets.push(`trait_humor = $${paramIndex++}`)
    values.push(input.traitHumor)
  }
  if (input.traitEmojiUsage !== undefined) {
    sets.push(`trait_emoji_usage = $${paramIndex++}`)
    values.push(input.traitEmojiUsage)
  }
  if (input.traitAssertiveness !== undefined) {
    sets.push(`trait_assertiveness = $${paramIndex++}`)
    values.push(input.traitAssertiveness)
  }
  if (input.preferredGreeting !== undefined) {
    sets.push(`preferred_greeting = $${paramIndex++}`)
    values.push(input.preferredGreeting)
  }
  if (input.signature !== undefined) {
    sets.push(`signature = $${paramIndex++}`)
    values.push(input.signature)
  }
  if (input.goToEmojis !== undefined) {
    sets.push(`go_to_emojis = $${paramIndex++}`)
    values.push(input.goToEmojis)
  }
  if (input.alwaysConfirmActions !== undefined) {
    sets.push(`always_confirm_actions = $${paramIndex++}`)
    values.push(input.alwaysConfirmActions)
  }
  if (input.offerAlternatives !== undefined) {
    sets.push(`offer_alternatives = $${paramIndex++}`)
    values.push(input.offerAlternatives)
  }
  if (input.explainReasoning !== undefined) {
    sets.push(`explain_reasoning = $${paramIndex++}`)
    values.push(input.explainReasoning)
  }
  if (input.customGreetingTemplates !== undefined) {
    sets.push(`custom_greeting_templates = $${paramIndex++}`)
    values.push(JSON.stringify(input.customGreetingTemplates))
  }
  if (input.customErrorTemplates !== undefined) {
    sets.push(`custom_error_templates = $${paramIndex++}`)
    values.push(JSON.stringify(input.customErrorTemplates))
  }
  if (input.forbiddenTopics !== undefined) {
    sets.push(`forbidden_topics = $${paramIndex++}`)
    values.push(input.forbiddenTopics)
  }

  if (sets.length === 0) {
    return getAgentPersonality(agentId)
  }

  values.push(agentId)
  const result = await sql.query(
    `UPDATE agent_personality SET ${sets.join(', ')} WHERE agent_id = $${paramIndex} RETURNING *`,
    values
  )

  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentPersonality) : null
}

// ============================================================================
// Autonomy Settings
// ============================================================================

/**
 * Create default autonomy settings for an agent
 */
export async function createDefaultAutonomySettings(
  agentId: string
): Promise<AgentAutonomySettings> {
  const result = await sql`
    INSERT INTO agent_autonomy_settings (agent_id)
    VALUES (${agentId})
    ON CONFLICT (agent_id) DO NOTHING
    RETURNING *
  `

  if (result.rows.length === 0) {
    const existing = await sql`
      SELECT * FROM agent_autonomy_settings WHERE agent_id = ${agentId}
    `
    return toCamelCase(existing.rows[0]) as AgentAutonomySettings
  }

  return toCamelCase(result.rows[0]) as AgentAutonomySettings
}

/**
 * Get autonomy settings for an agent
 */
export async function getAutonomySettings(agentId: string): Promise<AgentAutonomySettings | null> {
  const result = await sql`
    SELECT * FROM agent_autonomy_settings WHERE agent_id = ${agentId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentAutonomySettings) : null
}

/**
 * Update autonomy settings
 */
export async function updateAutonomySettings(
  agentId: string,
  input: UpdateAutonomySettingsInput
): Promise<AgentAutonomySettings | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.maxActionsPerHour !== undefined) {
    sets.push(`max_actions_per_hour = $${paramIndex++}`)
    values.push(input.maxActionsPerHour)
  }
  if (input.maxCostPerDay !== undefined) {
    sets.push(`max_cost_per_day = $${paramIndex++}`)
    values.push(input.maxCostPerDay)
  }
  if (input.requireHumanForHighValue !== undefined) {
    sets.push(`require_human_for_high_value = $${paramIndex++}`)
    values.push(input.requireHumanForHighValue)
  }
  if (input.adaptToFeedback !== undefined) {
    sets.push(`adapt_to_feedback = $${paramIndex++}`)
    values.push(input.adaptToFeedback)
  }
  if (input.trackSuccessPatterns !== undefined) {
    sets.push(`track_success_patterns = $${paramIndex++}`)
    values.push(input.trackSuccessPatterns)
  }
  if (input.adjustToUserPreferences !== undefined) {
    sets.push(`adjust_to_user_preferences = $${paramIndex++}`)
    values.push(input.adjustToUserPreferences)
  }

  if (sets.length === 0) {
    return getAutonomySettings(agentId)
  }

  values.push(agentId)
  const result = await sql.query(
    `UPDATE agent_autonomy_settings SET ${sets.join(', ')} WHERE agent_id = $${paramIndex} RETURNING *`,
    values
  )

  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentAutonomySettings) : null
}

// ============================================================================
// Action Autonomy (per-action)
// ============================================================================

/**
 * Get all action autonomy settings for an agent
 */
export async function getActionAutonomyList(agentId: string): Promise<AgentActionAutonomy[]> {
  const result = await sql`
    SELECT * FROM agent_action_autonomy
    WHERE agent_id = ${agentId}
    ORDER BY action_type ASC
  `
  return result.rows.map((row) => toCamelCase(row) as AgentActionAutonomy)
}

/**
 * Get action autonomy for a specific action type
 */
export async function getActionAutonomy(
  agentId: string,
  actionType: string
): Promise<AgentActionAutonomy | null> {
  const result = await sql`
    SELECT * FROM agent_action_autonomy
    WHERE agent_id = ${agentId} AND action_type = ${actionType}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentActionAutonomy) : null
}

/**
 * Set action autonomy for a specific action type
 */
export async function setActionAutonomy(
  agentId: string,
  actionType: string,
  input: UpdateActionAutonomyInput
): Promise<AgentActionAutonomy> {
  const result = await sql`
    INSERT INTO agent_action_autonomy (
      agent_id, action_type, autonomy_level, enabled, requires_approval, max_per_day, cooldown_hours
    )
    VALUES (
      ${agentId},
      ${actionType},
      ${input.autonomyLevel || 'suggest_and_confirm'},
      ${input.enabled ?? true},
      ${input.requiresApproval ?? false},
      ${input.maxPerDay ?? null},
      ${input.cooldownHours ?? null}
    )
    ON CONFLICT (agent_id, action_type)
    DO UPDATE SET
      autonomy_level = EXCLUDED.autonomy_level,
      enabled = EXCLUDED.enabled,
      requires_approval = EXCLUDED.requires_approval,
      max_per_day = EXCLUDED.max_per_day,
      cooldown_hours = EXCLUDED.cooldown_hours
    RETURNING *
  `
  return toCamelCase(result.rows[0]) as AgentActionAutonomy
}

// ============================================================================
// Action Log
// ============================================================================

/**
 * Log an agent action
 */
export async function logAction(input: LogActionInput): Promise<AgentActionLog> {
  const result = await sql`
    INSERT INTO agent_action_log (
      agent_id, action_type, action_category, action_description,
      input_data, output_data, tools_used,
      creator_id, project_id, conversation_id,
      required_approval, approval_status,
      success, error_message,
      visible_to_creator, visible_in_dashboard
    )
    VALUES (
      ${input.agentId},
      ${input.actionType},
      ${input.actionCategory || null},
      ${input.actionDescription},
      ${input.inputData ? JSON.stringify(input.inputData) : null},
      ${input.outputData ? JSON.stringify(input.outputData) : null},
      ${input.toolsUsed || []},
      ${input.creatorId || null},
      ${input.projectId || null},
      ${input.conversationId || null},
      ${input.requiresApproval || false},
      ${input.requiresApproval ? 'pending' : null},
      ${input.success ?? true},
      ${input.errorMessage || null},
      ${input.visibleToCreator ?? false},
      ${input.visibleInDashboard ?? true}
    )
    RETURNING *
  `
  return toCamelCase(result.rows[0]) as AgentActionLog
}

/**
 * List action logs with filters
 */
export async function listActionLogs(
  filters: ActionLogFilters = {}
): Promise<AgentActionLogWithAgent[]> {
  const conditions: string[] = ['1=1']
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.agentId) {
    conditions.push(`l.agent_id = $${paramIndex++}`)
    values.push(filters.agentId)
  }
  if (filters.actionType) {
    conditions.push(`l.action_type = $${paramIndex++}`)
    values.push(filters.actionType)
  }
  if (filters.actionCategory) {
    conditions.push(`l.action_category = $${paramIndex++}`)
    values.push(filters.actionCategory)
  }
  if (filters.creatorId) {
    conditions.push(`l.creator_id = $${paramIndex++}`)
    values.push(filters.creatorId)
  }
  if (filters.projectId) {
    conditions.push(`l.project_id = $${paramIndex++}`)
    values.push(filters.projectId)
  }
  if (filters.approvalStatus) {
    conditions.push(`l.approval_status = $${paramIndex++}`)
    values.push(filters.approvalStatus)
  }
  if (filters.success !== undefined) {
    conditions.push(`l.success = $${paramIndex++}`)
    values.push(filters.success)
  }
  if (filters.startDate) {
    conditions.push(`l.created_at >= $${paramIndex++}`)
    values.push(filters.startDate)
  }
  if (filters.endDate) {
    conditions.push(`l.created_at <= $${paramIndex++}`)
    values.push(filters.endDate)
  }

  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const query = `
    SELECT
      l.*,
      a.id as agent_id,
      a.name as agent_name,
      a.display_name as agent_display_name,
      a.avatar_url as agent_avatar_url
    FROM agent_action_log l
    JOIN ai_agents a ON a.id = l.agent_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY l.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const result = await sql.query(query, values)

  return result.rows.map((row) => {
    const log = toCamelCase(row) as AgentActionLogWithAgent & Record<string, unknown>
    log.agent = {
      id: log.agentId as string,
      name: log.agentName as string,
      displayName: log.agentDisplayName as string,
      avatarUrl: log.agentAvatarUrl as string | null,
    }
    delete log.agentName
    delete log.agentDisplayName
    delete log.agentAvatarUrl
    return log as AgentActionLogWithAgent
  })
}

/**
 * Get action log by ID
 */
export async function getActionLog(actionId: string): Promise<AgentActionLog | null> {
  const result = await sql`
    SELECT * FROM agent_action_log WHERE id = ${actionId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentActionLog) : null
}

/**
 * Count actions today for rate limiting
 */
export async function countActionsToday(agentId: string, actionType?: string): Promise<number> {
  if (actionType) {
    const result = await sql`
      SELECT COUNT(*)::INTEGER as count FROM agent_action_log
      WHERE agent_id = ${agentId}
        AND action_type = ${actionType}
        AND created_at > NOW() - INTERVAL '24 hours'
    `
    return result.rows[0]?.count || 0
  }

  const result = await sql`
    SELECT COUNT(*)::INTEGER as count FROM agent_action_log
    WHERE agent_id = ${agentId}
      AND created_at > NOW() - INTERVAL '24 hours'
  `
  return result.rows[0]?.count || 0
}

/**
 * Update action log approval status
 */
export async function updateActionApproval(
  actionId: string,
  status: ApprovalStatus,
  approvedBy?: string
): Promise<AgentActionLog | null> {
  const result = await sql`
    UPDATE agent_action_log
    SET
      approval_status = ${status},
      approved_by = ${approvedBy || null},
      approved_at = ${status === 'approved' || status === 'rejected' ? new Date() : null}
    WHERE id = ${actionId}
    RETURNING *
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentActionLog) : null
}

// ============================================================================
// Approval Requests
// ============================================================================

/**
 * Create an approval request
 */
export async function createApprovalRequest(
  input: CreateApprovalRequestInput
): Promise<AgentApprovalRequest> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + (input.expiresInHours || 24))

  const result = await sql`
    INSERT INTO agent_approval_requests (
      agent_id, action_log_id, action_type, action_payload, reason,
      approver_type, approver_id, expires_at
    )
    VALUES (
      ${input.agentId},
      ${input.actionLogId || null},
      ${input.actionType},
      ${JSON.stringify(input.actionPayload)},
      ${input.reason || null},
      ${input.approverType || null},
      ${input.approverId || null},
      ${expiresAt.toISOString()}
    )
    RETURNING *
  `
  return toCamelCase(result.rows[0]) as AgentApprovalRequest
}

/**
 * List pending approval requests
 */
export async function listPendingApprovals(
  filters: { agentId?: string; approverId?: string } = {}
): Promise<ApprovalRequestWithAgent[]> {
  const conditions: string[] = ["r.status = 'pending'", 'r.expires_at > NOW()']
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.agentId) {
    conditions.push(`r.agent_id = $${paramIndex++}`)
    values.push(filters.agentId)
  }
  if (filters.approverId) {
    conditions.push(`r.approver_id = $${paramIndex++}`)
    values.push(filters.approverId)
  }

  const query = `
    SELECT
      r.*,
      a.id as agent_id,
      a.name as agent_name,
      a.display_name as agent_display_name,
      a.avatar_url as agent_avatar_url
    FROM agent_approval_requests r
    JOIN ai_agents a ON a.id = r.agent_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.requested_at ASC
  `

  const result = await sql.query(query, values)

  return result.rows.map((row) => {
    const request = toCamelCase(row) as ApprovalRequestWithAgent & Record<string, unknown>
    request.agent = {
      id: request.agentId as string,
      name: request.agentName as string,
      displayName: request.agentDisplayName as string,
      avatarUrl: request.agentAvatarUrl as string | null,
    }
    delete request.agentName
    delete request.agentDisplayName
    delete request.agentAvatarUrl
    return request as ApprovalRequestWithAgent
  })
}

/**
 * Get approval request by ID
 */
export async function getApprovalRequest(requestId: string): Promise<AgentApprovalRequest | null> {
  const result = await sql`
    SELECT * FROM agent_approval_requests WHERE id = ${requestId}
  `
  return result.rows[0] ? (toCamelCase(result.rows[0]) as AgentApprovalRequest) : null
}

/**
 * Respond to an approval request
 */
export async function respondToApproval(
  requestId: string,
  status: 'approved' | 'rejected',
  responseNote?: string
): Promise<AgentApprovalRequest | null> {
  const result = await sql`
    UPDATE agent_approval_requests
    SET
      status = ${status},
      responded_at = NOW(),
      response_note = ${responseNote || null}
    WHERE id = ${requestId}
    RETURNING *
  `

  if (result.rows[0]) {
    const request = toCamelCase(result.rows[0]) as AgentApprovalRequest

    // Also update the related action log if exists
    if (request.actionLogId) {
      await updateActionApproval(request.actionLogId, status)
    }

    return request
  }

  return null
}

/**
 * Expire old pending approvals
 */
export async function expireOldApprovals(): Promise<number> {
  const result = await sql`
    UPDATE agent_approval_requests
    SET status = 'timeout'
    WHERE status = 'pending' AND expires_at < NOW()
  `
  return result.rowCount ?? 0
}
