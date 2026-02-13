/**
 * Database queries for BRI Admin pages
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries must use withTenant()
 */

import { sql, withTenant } from '@cgk-platform/db'

/**
 * Convert a JavaScript array to PostgreSQL array literal format
 */
function toPostgresArray(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null
  // Escape any quotes in values and wrap in curly braces
  const escaped = arr.map(v => v.replace(/"/g, '\\"'))
  return `{${escaped.join(',')}}`
}
import type {
  ActionAutonomy,
  AutonomySettings,
  BriAction,
  BriConversation,
  BriSettings,
  BriStats,
  CreativeIdea,
  CreativeIdeaLink,
  FollowupSettings,
  IntegrationStatus,
  NotificationSettings,
  SlackUserLink,
  TeamDefaults,
  TeamMember,
  TeamMemberMemory,
  UserMemory,
  VoiceConfig,
} from './types'

// Settings

export async function getBriSettings(tenantSlug: string): Promise<BriSettings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        is_enabled as "isEnabled",
        respond_to_all_dms as "respondToAllDms",
        require_approval_for_actions as "requireApprovalForActions",
        messages_per_user_per_hour as "messagesPerUserPerHour",
        daily_standup_channel as "dailyStandupChannel",
        creator_ops_channel as "creatorOpsChannel",
        escalation_channel as "escalationChannel",
        ai_model as "aiModel",
        ai_temperature as "aiTemperature",
        ai_max_tokens as "aiMaxTokens",
        response_style as "responseStyle",
        enable_sms_outreach as "enableSmsOutreach",
        enable_email_outreach as "enableEmailOutreach"
      FROM bri_settings
      LIMIT 1
    `
    return result.rows[0] as BriSettings | undefined ?? null
  })
}

export async function saveBriSettings(
  tenantSlug: string,
  settings: Partial<BriSettings>
): Promise<BriSettings> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO bri_settings (
        id,
        is_enabled,
        respond_to_all_dms,
        require_approval_for_actions,
        messages_per_user_per_hour,
        daily_standup_channel,
        creator_ops_channel,
        escalation_channel,
        ai_model,
        ai_temperature,
        ai_max_tokens,
        response_style,
        enable_sms_outreach,
        enable_email_outreach
      ) VALUES (
        COALESCE(${settings.id ?? null}, gen_random_uuid()::TEXT),
        COALESCE(${settings.isEnabled ?? null}, true),
        COALESCE(${settings.respondToAllDms ?? null}, true),
        COALESCE(${settings.requireApprovalForActions ?? null}, false),
        COALESCE(${settings.messagesPerUserPerHour ?? null}, 10),
        ${settings.dailyStandupChannel ?? null},
        ${settings.creatorOpsChannel ?? null},
        ${settings.escalationChannel ?? null},
        COALESCE(${settings.aiModel ?? null}, 'claude-sonnet-4-20250514'),
        COALESCE(${settings.aiTemperature ?? null}, 0.7),
        COALESCE(${settings.aiMaxTokens ?? null}, 4096),
        COALESCE(${settings.responseStyle ?? null}, 'balanced'),
        COALESCE(${settings.enableSmsOutreach ?? null}, false),
        COALESCE(${settings.enableEmailOutreach ?? null}, false)
      )
      ON CONFLICT (id) DO UPDATE SET
        is_enabled = COALESCE(EXCLUDED.is_enabled, bri_settings.is_enabled),
        respond_to_all_dms = COALESCE(EXCLUDED.respond_to_all_dms, bri_settings.respond_to_all_dms),
        require_approval_for_actions = COALESCE(EXCLUDED.require_approval_for_actions, bri_settings.require_approval_for_actions),
        messages_per_user_per_hour = COALESCE(EXCLUDED.messages_per_user_per_hour, bri_settings.messages_per_user_per_hour),
        daily_standup_channel = EXCLUDED.daily_standup_channel,
        creator_ops_channel = EXCLUDED.creator_ops_channel,
        escalation_channel = EXCLUDED.escalation_channel,
        ai_model = COALESCE(EXCLUDED.ai_model, bri_settings.ai_model),
        ai_temperature = COALESCE(EXCLUDED.ai_temperature, bri_settings.ai_temperature),
        ai_max_tokens = COALESCE(EXCLUDED.ai_max_tokens, bri_settings.ai_max_tokens),
        response_style = COALESCE(EXCLUDED.response_style, bri_settings.response_style),
        enable_sms_outreach = COALESCE(EXCLUDED.enable_sms_outreach, bri_settings.enable_sms_outreach),
        enable_email_outreach = COALESCE(EXCLUDED.enable_email_outreach, bri_settings.enable_email_outreach),
        updated_at = NOW()
      RETURNING
        id,
        is_enabled as "isEnabled",
        respond_to_all_dms as "respondToAllDms",
        require_approval_for_actions as "requireApprovalForActions",
        messages_per_user_per_hour as "messagesPerUserPerHour",
        daily_standup_channel as "dailyStandupChannel",
        creator_ops_channel as "creatorOpsChannel",
        escalation_channel as "escalationChannel",
        ai_model as "aiModel",
        ai_temperature as "aiTemperature",
        ai_max_tokens as "aiMaxTokens",
        response_style as "responseStyle",
        enable_sms_outreach as "enableSmsOutreach",
        enable_email_outreach as "enableEmailOutreach"
    `
    return result.rows[0] as BriSettings
  })
}

// Stats

export async function getBriStats(tenantSlug: string): Promise<BriStats> {
  return withTenant(tenantSlug, async () => {
    // Get conversation stats
    const convStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours' AND is_active = true) as active_24h
      FROM bri_conversations
    `

    // Get message count (sum of message array lengths)
    const msgStats = await sql`
      SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) as total_messages
      FROM bri_conversations
      WHERE updated_at > NOW() - INTERVAL '24 hours'
    `

    // Get tool usage stats
    const toolStats = await sql`
      SELECT tool, COUNT(*) as count
      FROM (
        SELECT unnest(tools_used) as tool
        FROM agent_action_log
        WHERE created_at > NOW() - INTERVAL '7 days'
      ) t
      GROUP BY tool
      ORDER BY count DESC
      LIMIT 10
    `

    const toolUsage = toolStats.rows.map(row => ({
      tool: row.tool as string,
      count: Number(row.count),
    }))

    return {
      totalConversations: Number(convStats.rows[0]?.total ?? 0),
      activeConversations24h: Number(convStats.rows[0]?.active_24h ?? 0),
      messages24h: Number(msgStats.rows[0]?.total_messages ?? 0),
      mostUsedTool: toolUsage[0]?.tool ?? null,
      toolUsage,
    }
  })
}

// Conversations

export async function getConversations(tenantSlug: string): Promise<BriConversation[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        channel_id as "channelId",
        thread_ts as "threadTs",
        user_id as "userId",
        messages,
        tools_used as "toolsUsed",
        is_active as "isActive",
        summary,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM bri_conversations
      ORDER BY updated_at DESC
      LIMIT 100
    `
    return result.rows as BriConversation[]
  })
}

// Actions

export async function getActions(
  tenantSlug: string,
  options?: { pendingOnly?: boolean; limit?: number }
): Promise<BriAction[]> {
  return withTenant(tenantSlug, async () => {
    const limit = options?.limit ?? 100

    if (options?.pendingOnly) {
      const result = await sql`
        SELECT
          id,
          agent_id as "agentId",
          action_type as "actionType",
          action_category as "actionCategory",
          action_description as "actionDescription",
          input_data as "inputData",
          output_data as "outputData",
          tools_used as "toolsUsed",
          creator_id as "creatorId",
          project_id as "projectId",
          conversation_id as "conversationId",
          required_approval as "requiredApproval",
          approval_status as "approvalStatus",
          approved_by as "approvedBy",
          approved_at as "approvedAt",
          success,
          error_message as "errorMessage",
          created_at as "createdAt"
        FROM agent_action_log
        WHERE approval_status = 'pending'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      return result.rows as BriAction[]
    }

    const result = await sql`
      SELECT
        id,
        agent_id as "agentId",
        action_type as "actionType",
        action_category as "actionCategory",
        action_description as "actionDescription",
        input_data as "inputData",
        output_data as "outputData",
        tools_used as "toolsUsed",
        creator_id as "creatorId",
        project_id as "projectId",
        conversation_id as "conversationId",
        required_approval as "requiredApproval",
        approval_status as "approvalStatus",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        success,
        error_message as "errorMessage",
        created_at as "createdAt"
      FROM agent_action_log
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result.rows as BriAction[]
  })
}

export async function getActionStats(tenantSlug: string): Promise<{
  total7d: number
  successful: number
  failed: number
  pending: number
  successRate: number
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE success = true AND (approval_status IS NULL OR approval_status = 'approved')) as successful,
        COUNT(*) FILTER (WHERE success = false OR approval_status = 'rejected') as failed,
        COUNT(*) FILTER (WHERE approval_status = 'pending') as pending
      FROM agent_action_log
      WHERE created_at > NOW() - INTERVAL '7 days'
    `

    const total = Number(result.rows[0]?.total ?? 0)
    const successful = Number(result.rows[0]?.successful ?? 0)
    const failed = Number(result.rows[0]?.failed ?? 0)
    const pending = Number(result.rows[0]?.pending ?? 0)

    return {
      total7d: total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    }
  })
}

export async function approveAction(
  tenantSlug: string,
  actionId: string,
  approvedBy: string
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE agent_action_log
      SET
        approval_status = 'approved',
        approved_by = ${approvedBy},
        approved_at = NOW()
      WHERE id = ${actionId}
    `
  })
}

export async function rejectAction(
  tenantSlug: string,
  actionId: string,
  rejectedBy: string
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE agent_action_log
      SET
        approval_status = 'rejected',
        approved_by = ${rejectedBy},
        approved_at = NOW()
      WHERE id = ${actionId}
    `
  })
}

// Creative Ideas

export async function getCreativeIdeas(
  tenantSlug: string,
  filters?: {
    type?: string
    status?: string
    platform?: string
    tag?: string
    search?: string
  }
): Promise<CreativeIdea[]> {
  return withTenant(tenantSlug, async () => {
    // Build dynamic query based on filters
    let query = `
      SELECT
        id,
        title,
        type,
        status,
        description,
        content,
        products,
        platforms,
        formats,
        tags,
        times_used as "timesUsed",
        performance_score as "performanceScore",
        best_example as "bestExample",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creative_ideas
      WHERE 1=1
    `

    const params: unknown[] = []

    if (filters?.type) {
      params.push(filters.type)
      query += ` AND type = $${params.length}::creative_idea_type`
    }

    if (filters?.status) {
      params.push(filters.status)
      query += ` AND status = $${params.length}::creative_idea_status`
    }

    if (filters?.platform) {
      params.push(filters.platform)
      query += ` AND $${params.length} = ANY(platforms)`
    }

    if (filters?.tag) {
      params.push(filters.tag)
      query += ` AND $${params.length} = ANY(tags)`
    }

    if (filters?.search) {
      params.push(`%${filters.search}%`)
      query += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`
    }

    query += ` ORDER BY created_at DESC LIMIT 100`

    // Use raw SQL with params for dynamic filtering
    const result = await sql.query(query, params)
    return result.rows as CreativeIdea[]
  })
}

export async function getCreativeIdea(
  tenantSlug: string,
  id: string
): Promise<{ idea: CreativeIdea; links: CreativeIdeaLink[] } | null> {
  return withTenant(tenantSlug, async () => {
    const ideaResult = await sql`
      SELECT
        id,
        title,
        type,
        status,
        description,
        content,
        products,
        platforms,
        formats,
        tags,
        times_used as "timesUsed",
        performance_score as "performanceScore",
        best_example as "bestExample",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creative_ideas
      WHERE id = ${id}
    `

    if (ideaResult.rows.length === 0) return null

    const linksResult = await sql`
      SELECT
        id,
        idea_id as "ideaId",
        project_id as "projectId",
        usage_type as "usageType",
        performance_notes as "performanceNotes",
        created_at as "createdAt"
      FROM creative_idea_links
      WHERE idea_id = ${id}
    `

    return {
      idea: ideaResult.rows[0] as CreativeIdea,
      links: linksResult.rows as CreativeIdeaLink[],
    }
  })
}

export async function createCreativeIdea(
  tenantSlug: string,
  idea: Omit<CreativeIdea, 'id' | 'timesUsed' | 'createdAt' | 'updatedAt'>
): Promise<CreativeIdea> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creative_ideas (
        title, type, status, description, content,
        products, platforms, formats, tags,
        performance_score, best_example, notes
      ) VALUES (
        ${idea.title},
        ${idea.type}::creative_idea_type,
        ${idea.status}::creative_idea_status,
        ${idea.description},
        ${idea.content},
        ${toPostgresArray(idea.products)}::TEXT[],
        ${toPostgresArray(idea.platforms)}::TEXT[],
        ${toPostgresArray(idea.formats)}::TEXT[],
        ${toPostgresArray(idea.tags)}::TEXT[],
        ${idea.performanceScore},
        ${idea.bestExample},
        ${idea.notes}
      )
      RETURNING
        id,
        title,
        type,
        status,
        description,
        content,
        products,
        platforms,
        formats,
        tags,
        times_used as "timesUsed",
        performance_score as "performanceScore",
        best_example as "bestExample",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    return result.rows[0] as CreativeIdea
  })
}

export async function updateCreativeIdea(
  tenantSlug: string,
  id: string,
  idea: Partial<CreativeIdea>
): Promise<CreativeIdea> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE creative_ideas SET
        title = COALESCE(${idea.title ?? null}, title),
        type = COALESCE(${idea.type ?? null}::creative_idea_type, type),
        status = COALESCE(${idea.status ?? null}::creative_idea_status, status),
        description = COALESCE(${idea.description ?? null}, description),
        content = COALESCE(${idea.content ?? null}, content),
        products = COALESCE(${toPostgresArray(idea.products)}::TEXT[], products),
        platforms = COALESCE(${toPostgresArray(idea.platforms)}::TEXT[], platforms),
        formats = COALESCE(${toPostgresArray(idea.formats)}::TEXT[], formats),
        tags = COALESCE(${toPostgresArray(idea.tags)}::TEXT[], tags),
        performance_score = COALESCE(${idea.performanceScore ?? null}, performance_score),
        best_example = COALESCE(${idea.bestExample ?? null}, best_example),
        notes = COALESCE(${idea.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        title,
        type,
        status,
        description,
        content,
        products,
        platforms,
        formats,
        tags,
        times_used as "timesUsed",
        performance_score as "performanceScore",
        best_example as "bestExample",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    return result.rows[0] as CreativeIdea
  })
}

// Autonomy

export async function getAutonomySettings(tenantSlug: string): Promise<{
  settings: AutonomySettings
  actions: ActionAutonomy[]
} | null> {
  return withTenant(tenantSlug, async () => {
    // Get the primary agent's autonomy settings
    const settingsResult = await sql`
      SELECT
        aas.max_actions_per_hour as "maxActionsPerHour",
        aas.max_cost_per_day as "maxCostPerDay",
        aas.require_human_for_high_value as "highValueThreshold",
        aas.adapt_to_feedback as "adaptToFeedback",
        aas.track_success_patterns as "trackSuccessPatterns",
        aas.adjust_to_user_preferences as "adjustToUserPreferences"
      FROM agent_autonomy_settings aas
      JOIN ai_agents a ON a.id = aas.agent_id
      WHERE a.is_primary = true
      LIMIT 1
    `

    const row = settingsResult.rows[0]
    if (!row) {
      return null
    }

    // Get per-action settings
    const actionsResult = await sql`
      SELECT
        aaa.action_type as "actionType",
        aaa.enabled,
        aaa.requires_approval as "requiresApproval",
        aaa.max_per_day as "maxPerDay",
        aaa.cooldown_hours as "cooldownHours"
      FROM agent_action_autonomy aaa
      JOIN ai_agents a ON a.id = aaa.agent_id
      WHERE a.is_primary = true
    `

    // Determine level based on settings
    let level: 'conservative' | 'balanced' | 'proactive' = 'balanced'
    const maxActions = Number(row.maxActionsPerHour)
    if (maxActions <= 50) level = 'conservative'
    else if (maxActions >= 150) level = 'proactive'

    return {
      settings: {
        level,
        adaptToFeedback: row.adaptToFeedback as boolean,
        trackSuccessPatterns: row.trackSuccessPatterns as boolean,
        adjustToUserPreferences: row.adjustToUserPreferences as boolean,
        maxActionsPerHour: maxActions,
        maxCostPerDay: Number(row.maxCostPerDay),
        requireHumanForHighValue: Number(row.highValueThreshold) > 0,
        highValueThreshold: Number(row.highValueThreshold),
      },
      actions: actionsResult.rows as ActionAutonomy[],
    }
  })
}

export async function saveAutonomySettings(
  tenantSlug: string,
  settings: AutonomySettings,
  actions: ActionAutonomy[]
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    // Get primary agent ID
    const agentResult = await sql`
      SELECT id FROM ai_agents WHERE is_primary = true LIMIT 1
    `

    const agentRow = agentResult.rows[0]
    if (!agentRow) {
      throw new Error('No primary agent found')
    }

    const agentId = agentRow.id

    // Update global settings
    await sql`
      UPDATE agent_autonomy_settings SET
        max_actions_per_hour = ${settings.maxActionsPerHour},
        max_cost_per_day = ${settings.maxCostPerDay},
        require_human_for_high_value = ${settings.requireHumanForHighValue ? settings.highValueThreshold : 0},
        adapt_to_feedback = ${settings.adaptToFeedback},
        track_success_patterns = ${settings.trackSuccessPatterns},
        adjust_to_user_preferences = ${settings.adjustToUserPreferences},
        updated_at = NOW()
      WHERE agent_id = ${agentId}
    `

    // Update per-action settings
    for (const action of actions) {
      await sql`
        INSERT INTO agent_action_autonomy (
          agent_id, action_type, enabled, requires_approval, max_per_day, cooldown_hours
        ) VALUES (
          ${agentId}, ${action.actionType}, ${action.enabled},
          ${action.requiresApproval}, ${action.maxPerDay}, ${action.cooldownHours}
        )
        ON CONFLICT (agent_id, action_type) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          requires_approval = EXCLUDED.requires_approval,
          max_per_day = EXCLUDED.max_per_day,
          cooldown_hours = EXCLUDED.cooldown_hours,
          updated_at = NOW()
      `
    }
  })
}

// Integrations

export async function getIntegrationStatus(tenantSlug: string): Promise<IntegrationStatus> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT provider, is_active, config, last_used_at, error_message
      FROM bri_integrations
    `

    const integrations: IntegrationStatus = {
      slack: { connected: false, source: null },
      google: { connected: false, source: null },
      sms: { configured: false, source: null },
      email: { configured: false, source: null },
    }

    for (const row of result.rows) {
      const provider = row.provider as string
      const config = row.config as Record<string, unknown>

      switch (provider) {
        case 'slack':
          integrations.slack = {
            connected: row.is_active as boolean,
            teamName: config.teamName as string | undefined,
            source: 'database',
          }
          break
        case 'google':
          integrations.google = {
            connected: row.is_active as boolean,
            email: config.email as string | undefined,
            scopes: config.scopes as string[] | undefined,
            source: 'database',
          }
          break
        case 'retell':
        case 'sms':
          integrations.sms = {
            configured: row.is_active as boolean,
            phoneNumber: config.phoneNumber as string | undefined,
            source: 'database',
          }
          break
        case 'resend':
        case 'email':
          integrations.email = {
            configured: row.is_active as boolean,
            fromEmail: config.fromEmail as string | undefined,
            source: 'database',
          }
          break
      }
    }

    // Check environment variables as fallback
    if (!integrations.slack.connected && process.env.SLACK_BOT_TOKEN) {
      integrations.slack = { connected: true, source: 'env' }
    }
    if (!integrations.sms.configured && process.env.RETELL_API_KEY) {
      integrations.sms = { configured: true, source: 'env' }
    }
    if (!integrations.email.configured && process.env.RESEND_API_KEY) {
      integrations.email = { configured: true, source: 'env' }
    }

    return integrations
  })
}

// Team Memories

export async function getTeamWithMemories(tenantSlug: string): Promise<TeamMember[]> {
  return withTenant(tenantSlug, async () => {
    // Get team members from users table
    const usersResult = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        NULL as "avatarUrl"
      FROM public.users u
      JOIN public.user_organizations uo ON uo.user_id = u.id
      JOIN public.organizations o ON o.id = uo.organization_id
      WHERE o.slug = ${tenantSlug}
    `

    const userIds = usersResult.rows.map(r => r.id as string)

    if (userIds.length === 0) {
      return []
    }

    // Get memories for these users
    const memoriesResult = await sql`
      SELECT
        id,
        user_id as "userId",
        memory_type as "memoryType",
        source,
        content,
        confidence,
        created_at as "createdAt"
      FROM team_member_memories
      WHERE user_id = ANY(${toPostgresArray(userIds)}::TEXT[])
    `

    // Group memories by user
    const memoriesByUser = new Map<string, TeamMemberMemory[]>()
    for (const mem of memoriesResult.rows as TeamMemberMemory[]) {
      const existing = memoriesByUser.get(mem.userId) ?? []
      existing.push(mem)
      memoriesByUser.set(mem.userId, existing)
    }

    return usersResult.rows.map(user => ({
      id: user.id as string,
      name: user.name as string,
      email: user.email as string,
      avatarUrl: user.avatarUrl as string | null,
      memories: memoriesByUser.get(user.id as string) ?? [],
    }))
  })
}

export async function addTeamMemory(
  tenantSlug: string,
  memory: Omit<TeamMemberMemory, 'id' | 'createdAt'>
): Promise<TeamMemberMemory> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO team_member_memories (
        user_id, memory_type, source, content, confidence
      ) VALUES (
        ${memory.userId},
        ${memory.memoryType}::memory_type,
        ${memory.source}::memory_source,
        ${memory.content},
        ${memory.confidence}
      )
      RETURNING
        id,
        user_id as "userId",
        memory_type as "memoryType",
        source,
        content,
        confidence,
        created_at as "createdAt"
    `
    return result.rows[0] as TeamMemberMemory
  })
}

export async function deleteTeamMemory(tenantSlug: string, id: string): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`DELETE FROM team_member_memories WHERE id = ${id}`
  })
}

// User Memories

export async function getUserMemories(
  tenantSlug: string,
  search?: string
): Promise<UserMemory[]> {
  return withTenant(tenantSlug, async () => {
    if (search) {
      const result = await sql`
        SELECT
          id,
          content,
          content_type as "contentType",
          importance_score as "importanceScore",
          is_archived as "isArchived",
          created_at as "createdAt"
        FROM user_memories
        WHERE is_archived = false
          AND content ILIKE ${`%${search}%`}
        ORDER BY importance_score DESC
        LIMIT 50
      `
      return result.rows as UserMemory[]
    }

    const result = await sql`
      SELECT
        id,
        content,
        content_type as "contentType",
        importance_score as "importanceScore",
        is_archived as "isArchived",
        created_at as "createdAt"
      FROM user_memories
      WHERE is_archived = false
      ORDER BY importance_score DESC
      LIMIT 50
    `
    return result.rows as UserMemory[]
  })
}

export async function archiveUserMemory(tenantSlug: string, id: string): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE user_memories SET is_archived = true, updated_at = NOW()
      WHERE id = ${id}
    `
  })
}

// Team Defaults

export async function getTeamDefaults(tenantSlug: string): Promise<TeamDefaults | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        primary_contact_id as "primaryContactId",
        secondary_contact_ids as "secondaryContactIds",
        default_reviewer_ids as "defaultReviewerIds",
        finance_contact_id as "financeContactId"
      FROM bri_team_defaults
      LIMIT 1
    `
    return result.rows[0] as TeamDefaults | undefined ?? null
  })
}

export async function saveTeamDefaults(
  tenantSlug: string,
  defaults: TeamDefaults
): Promise<TeamDefaults> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO bri_team_defaults (
        primary_contact_id,
        secondary_contact_ids,
        default_reviewer_ids,
        finance_contact_id
      ) VALUES (
        ${defaults.primaryContactId},
        ${toPostgresArray(defaults.secondaryContactIds)}::TEXT[],
        ${toPostgresArray(defaults.defaultReviewerIds)}::TEXT[],
        ${defaults.financeContactId}
      )
      ON CONFLICT (id) DO UPDATE SET
        primary_contact_id = EXCLUDED.primary_contact_id,
        secondary_contact_ids = EXCLUDED.secondary_contact_ids,
        default_reviewer_ids = EXCLUDED.default_reviewer_ids,
        finance_contact_id = EXCLUDED.finance_contact_id,
        updated_at = NOW()
      RETURNING
        primary_contact_id as "primaryContactId",
        secondary_contact_ids as "secondaryContactIds",
        default_reviewer_ids as "defaultReviewerIds",
        finance_contact_id as "financeContactId"
    `
    return result.rows[0] as TeamDefaults
  })
}

// Slack Users

export async function getSlackUserLinks(tenantSlug: string): Promise<SlackUserLink[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        user_id as "userId",
        slack_user_id as "slackUserId",
        slack_username as "slackUsername",
        is_auto_linked as "isAutoLinked"
      FROM slack_user_links
    `
    return result.rows as SlackUserLink[]
  })
}

export async function linkSlackUser(
  tenantSlug: string,
  userId: string,
  slackUserId: string,
  slackUsername: string | null
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO slack_user_links (user_id, slack_user_id, slack_username)
      VALUES (${userId}, ${slackUserId}, ${slackUsername})
      ON CONFLICT (user_id) DO UPDATE SET
        slack_user_id = EXCLUDED.slack_user_id,
        slack_username = EXCLUDED.slack_username,
        updated_at = NOW()
    `
  })
}

export async function unlinkSlackUser(tenantSlug: string, userId: string): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`DELETE FROM slack_user_links WHERE user_id = ${userId}`
  })
}

// Notification Settings

export async function getNotificationSettings(
  tenantSlug: string
): Promise<NotificationSettings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        event_settings as "eventSettings",
        default_slack_channel as "defaultSlackChannel",
        quiet_hours_start::TEXT as "quietHoursStart",
        quiet_hours_end::TEXT as "quietHoursEnd",
        quiet_hours_timezone as "quietHoursTimezone"
      FROM bri_notification_settings
      LIMIT 1
    `

    const row = result.rows[0]
    if (!row) return null

    return {
      events: (row.eventSettings as Record<string, unknown>).events as NotificationSettings['events'] ?? [],
      defaultSlackChannel: row.defaultSlackChannel as string | null,
      quietHoursStart: row.quietHoursStart as string | null,
      quietHoursEnd: row.quietHoursEnd as string | null,
      quietHoursTimezone: row.quietHoursTimezone as string,
    }
  })
}

export async function saveNotificationSettings(
  tenantSlug: string,
  settings: NotificationSettings
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO bri_notification_settings (
        event_settings,
        default_slack_channel,
        quiet_hours_start,
        quiet_hours_end,
        quiet_hours_timezone
      ) VALUES (
        ${JSON.stringify({ events: settings.events })},
        ${settings.defaultSlackChannel},
        ${settings.quietHoursStart}::TIME,
        ${settings.quietHoursEnd}::TIME,
        ${settings.quietHoursTimezone}
      )
      ON CONFLICT (id) DO UPDATE SET
        event_settings = EXCLUDED.event_settings,
        default_slack_channel = EXCLUDED.default_slack_channel,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        quiet_hours_timezone = EXCLUDED.quiet_hours_timezone,
        updated_at = NOW()
    `
  })
}

// Follow-up Settings

export async function getFollowupSettings(tenantSlug: string): Promise<FollowupSettings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        enable_delivery_reminders as "enableDeliveryReminders",
        delivery_reminder_days as "deliveryReminderDays",
        traffic_scripts_on_production as "trafficScriptsOnProduction",
        traffic_script_delay_hours as "trafficScriptDelayHours",
        days_before_deadline as "daysBeforeDeadline",
        days_after_deadline as "daysAfterDeadline",
        escalate_after_days as "escalateAfterDays",
        escalation_channel as "escalationChannel",
        quiet_hours_start::TEXT as "quietHoursStart",
        quiet_hours_end::TEXT as "quietHoursEnd",
        quiet_hours_timezone as "quietHoursTimezone",
        template_overrides as "templateOverrides"
      FROM bri_followup_settings
      LIMIT 1
    `
    return result.rows[0] as FollowupSettings | undefined ?? null
  })
}

export async function saveFollowupSettings(
  tenantSlug: string,
  settings: FollowupSettings
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO bri_followup_settings (
        enable_delivery_reminders,
        delivery_reminder_days,
        traffic_scripts_on_production,
        traffic_script_delay_hours,
        days_before_deadline,
        days_after_deadline,
        escalate_after_days,
        escalation_channel,
        quiet_hours_start,
        quiet_hours_end,
        quiet_hours_timezone,
        template_overrides
      ) VALUES (
        ${settings.enableDeliveryReminders},
        ${settings.deliveryReminderDays},
        ${settings.trafficScriptsOnProduction},
        ${settings.trafficScriptDelayHours},
        ${settings.daysBeforeDeadline},
        ${settings.daysAfterDeadline},
        ${settings.escalateAfterDays},
        ${settings.escalationChannel},
        ${settings.quietHoursStart}::TIME,
        ${settings.quietHoursEnd}::TIME,
        ${settings.quietHoursTimezone},
        ${JSON.stringify(settings.templateOverrides)}
      )
      ON CONFLICT (id) DO UPDATE SET
        enable_delivery_reminders = EXCLUDED.enable_delivery_reminders,
        delivery_reminder_days = EXCLUDED.delivery_reminder_days,
        traffic_scripts_on_production = EXCLUDED.traffic_scripts_on_production,
        traffic_script_delay_hours = EXCLUDED.traffic_script_delay_hours,
        days_before_deadline = EXCLUDED.days_before_deadline,
        days_after_deadline = EXCLUDED.days_after_deadline,
        escalate_after_days = EXCLUDED.escalate_after_days,
        escalation_channel = EXCLUDED.escalation_channel,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        quiet_hours_timezone = EXCLUDED.quiet_hours_timezone,
        template_overrides = EXCLUDED.template_overrides,
        updated_at = NOW()
    `
  })
}

// Voice Config

export async function getVoiceConfig(tenantSlug: string): Promise<VoiceConfig | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        tts_provider as "ttsProvider",
        tts_voice_id as "ttsVoiceId",
        tts_model as "ttsModel",
        tts_stability as "ttsStability",
        tts_similarity_boost as "ttsSimilarityBoost",
        tts_speed as "ttsSpeed",
        stt_provider as "sttProvider",
        stt_model as "sttModel",
        stt_language as "sttLanguage",
        acknowledgments,
        thinking_phrases as "thinkingPhrases",
        speech_speed as "speechSpeed"
      FROM bri_voice_config
      LIMIT 1
    `
    return result.rows[0] as VoiceConfig | undefined ?? null
  })
}

export async function saveVoiceConfig(
  tenantSlug: string,
  config: VoiceConfig
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO bri_voice_config (
        tts_provider, tts_voice_id, tts_model, tts_stability, tts_similarity_boost, tts_speed,
        stt_provider, stt_model, stt_language,
        acknowledgments, thinking_phrases, speech_speed
      ) VALUES (
        ${config.ttsProvider},
        ${config.ttsVoiceId},
        ${config.ttsModel},
        ${config.ttsStability},
        ${config.ttsSimilarityBoost},
        ${config.ttsSpeed},
        ${config.sttProvider},
        ${config.sttModel},
        ${config.sttLanguage},
        ${toPostgresArray(config.acknowledgments)}::TEXT[],
        ${toPostgresArray(config.thinkingPhrases)}::TEXT[],
        ${config.speechSpeed}
      )
      ON CONFLICT (id) DO UPDATE SET
        tts_provider = EXCLUDED.tts_provider,
        tts_voice_id = EXCLUDED.tts_voice_id,
        tts_model = EXCLUDED.tts_model,
        tts_stability = EXCLUDED.tts_stability,
        tts_similarity_boost = EXCLUDED.tts_similarity_boost,
        tts_speed = EXCLUDED.tts_speed,
        stt_provider = EXCLUDED.stt_provider,
        stt_model = EXCLUDED.stt_model,
        stt_language = EXCLUDED.stt_language,
        acknowledgments = EXCLUDED.acknowledgments,
        thinking_phrases = EXCLUDED.thinking_phrases,
        speech_speed = EXCLUDED.speech_speed,
        updated_at = NOW()
    `
  })
}
