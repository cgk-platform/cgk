/**
 * Pipeline database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  PipelineProject,
  PipelineStats,
  PipelineAnalytics,
  PipelineConfig,
  PipelineTrigger,
  SavedFilter,
  PipelineFilters,
  ProjectStatus,
  RiskLevel,
  StageConfig,
} from './types'
import { calculateRiskLevel, PIPELINE_STAGES } from './types'

/**
 * Get pipeline projects with filters
 */
export async function getPipelineProjects(
  tenantSlug: string,
  filters: PipelineFilters = {},
  page = 1,
  limit = 100
): Promise<{ projects: PipelineProject[]; total: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    // Build filter conditions
    if (filters.search) {
      paramIndex++
      conditions.push(
        `(p.title ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex})`
      )
      values.push(`%${filters.search}%`)
    }

    if (filters.statuses && filters.statuses.length > 0) {
      paramIndex++
      conditions.push(`p.status = ANY($${paramIndex}::project_status[])`)
      values.push(filters.statuses)
    }

    if (filters.creatorIds && filters.creatorIds.length > 0) {
      paramIndex++
      conditions.push(`p.creator_id = ANY($${paramIndex}::text[])`)
      values.push(filters.creatorIds)
    }

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`p.due_date >= $${paramIndex}::date`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`p.due_date <= $${paramIndex}::date`)
      values.push(filters.dateTo)
    }

    if (filters.minValueCents !== undefined) {
      paramIndex++
      conditions.push(`p.value_cents >= $${paramIndex}`)
      values.push(filters.minValueCents)
    }

    if (filters.maxValueCents !== undefined) {
      paramIndex++
      conditions.push(`p.value_cents <= $${paramIndex}`)
      values.push(filters.maxValueCents)
    }

    if (filters.hasFiles) {
      conditions.push(`p.files_count > 0`)
    }

    if (filters.hasUnreadMessages) {
      conditions.push(`p.has_unread_messages = true`)
    }

    if (filters.tags && filters.tags.length > 0) {
      paramIndex++
      conditions.push(`p.tags && $${paramIndex}::text[]`)
      values.push(filters.tags)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const offset = (page - 1) * limit

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const query = `
      SELECT
        p.id,
        p.title,
        p.creator_id as "creatorId",
        COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as "creatorName",
        c.avatar_url as "creatorAvatar",
        p.status,
        p.due_date as "dueDate",
        CASE
          WHEN p.due_date IS NULL THEN NULL
          ELSE EXTRACT(DAY FROM p.due_date::timestamp - NOW())::integer
        END as "daysUntilDeadline",
        p.value_cents as "valueCents",
        p.tags,
        p.has_unread_messages as "hasUnreadMessages",
        p.files_count as "filesCount",
        p.last_activity_at as "lastActivityAt",
        p.created_at as "createdAt"
      FROM projects p
      LEFT JOIN creators c ON c.id = p.creator_id
      ${whereClause}
      ORDER BY
        CASE WHEN p.due_date IS NULL THEN 1 ELSE 0 END,
        p.due_date ASC,
        p.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    const countQuery = `
      SELECT COUNT(*)::integer as count
      FROM projects p
      LEFT JOIN creators c ON c.id = p.creator_id
      ${whereClause}
    `

    const dataResult = await sql.query(query, values)
    const countValues = values.slice(0, -2)
    const countResult = await sql.query(countQuery, countValues)

    // Process projects to add risk levels
    const projects: PipelineProject[] = dataResult.rows.map((row) => {
      const riskLevel = calculateRiskLevel(row.dueDate, row.status as ProjectStatus)
      return {
        ...row,
        riskLevel,
        isAtRisk: riskLevel === 'high' || riskLevel === 'critical',
        tags: row.tags || [],
      } as PipelineProject
    })

    // Filter by risk level if specified
    let filteredProjects = projects
    if (filters.riskLevels && filters.riskLevels.length > 0) {
      filteredProjects = projects.filter((p) =>
        filters.riskLevels!.includes(p.riskLevel)
      )
    }

    return {
      projects: filteredProjects,
      total: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get pipeline statistics
 */
export async function getPipelineStats(tenantSlug: string): Promise<PipelineStats> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*)::integer as "totalProjects",
        COUNT(*) FILTER (WHERE status NOT IN ('payout_approved'))::integer as "activeProjects",
        COALESCE(SUM(value_cents), 0)::bigint as "totalValueCents",
        COALESCE(
          SUM(value_cents) FILTER (
            WHERE due_date < CURRENT_DATE
            AND status NOT IN ('approved', 'payout_ready', 'withdrawal_requested', 'payout_approved')
          ), 0
        )::bigint as "atRiskValueCents",
        COUNT(*) FILTER (
          WHERE due_date < CURRENT_DATE
          AND status NOT IN ('approved', 'payout_ready', 'withdrawal_requested', 'payout_approved')
        )::integer as "overdueCount",
        COUNT(*) FILTER (
          WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND status NOT IN ('approved', 'payout_ready', 'withdrawal_requested', 'payout_approved')
        )::integer as "dueSoonCount"
      FROM projects
    `

    // Calculate average cycle time
    const cycleResult = await sql`
      SELECT
        AVG(EXTRACT(DAY FROM completed_at - created_at))::numeric(10,1) as avg_cycle_days
      FROM projects
      WHERE completed_at IS NOT NULL
      AND completed_at > NOW() - INTERVAL '90 days'
    `

    // Calculate throughput (completions per week)
    const throughputResult = await sql`
      SELECT
        (COUNT(*) / GREATEST(
          EXTRACT(WEEK FROM NOW() - MIN(completed_at)),
          1
        ))::numeric(10,1) as throughput
      FROM projects
      WHERE completed_at IS NOT NULL
      AND completed_at > NOW() - INTERVAL '30 days'
    `

    return {
      totalProjects: result.rows[0]?.totalProjects || 0,
      activeProjects: result.rows[0]?.activeProjects || 0,
      totalValueCents: Number(result.rows[0]?.totalValueCents || 0),
      atRiskValueCents: Number(result.rows[0]?.atRiskValueCents || 0),
      overdueCount: result.rows[0]?.overdueCount || 0,
      dueSoonCount: result.rows[0]?.dueSoonCount || 0,
      avgCycleTimeDays: Number(cycleResult.rows[0]?.avg_cycle_days || 0),
      throughputPerWeek: Number(throughputResult.rows[0]?.throughput || 0),
    }
  })
}

/**
 * Get pipeline analytics
 */
export async function getPipelineAnalytics(
  tenantSlug: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<PipelineAnalytics> {
  return withTenant(tenantSlug, async () => {
    const intervalDays = period === '7d' ? 7 : period === '30d' ? 30 : 90

    // Throughput by week
    const throughputResult = await sql.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('week', completed_at), 'YYYY-MM-DD') as week,
        COUNT(*)::integer as count
      FROM projects
      WHERE completed_at IS NOT NULL
      AND completed_at > NOW() - INTERVAL '${intervalDays} days'
      GROUP BY DATE_TRUNC('week', completed_at)
      ORDER BY week
    `,
      []
    )

    // Cycle time distribution
    const cycleResult = await sql.query(
      `
      SELECT
        FLOOR(EXTRACT(DAY FROM completed_at - created_at))::integer as days,
        COUNT(*)::integer as count
      FROM projects
      WHERE completed_at IS NOT NULL
      AND completed_at > NOW() - INTERVAL '${intervalDays} days'
      GROUP BY FLOOR(EXTRACT(DAY FROM completed_at - created_at))
      ORDER BY days
    `,
      []
    )

    // Stage metrics
    const stageResult = await sql`
      SELECT
        status as stage,
        COUNT(*)::integer as "currentCount",
        AVG(EXTRACT(DAY FROM NOW() - last_activity_at))::numeric(10,1) as "avgDurationDays"
      FROM projects
      WHERE status NOT IN ('payout_approved')
      GROUP BY status
    `

    // Get WIP limits from config
    const configResult = await sql`
      SELECT wip_limits FROM pipeline_config LIMIT 1
    `
    const wipLimits = (configResult.rows[0]?.wip_limits as Record<string, number>) || {}

    const bottlenecks = stageResult.rows.map((row) => ({
      stage: row.stage as ProjectStatus,
      avgDuration: Number(row.avgDurationDays) || 0,
      wipViolation: wipLimits[row.stage]
        ? Number(row.currentCount) > wipLimits[row.stage]
        : false,
    }))

    // Risk distribution
    const allProjects = await sql`
      SELECT due_date, status, value_cents FROM projects WHERE status NOT IN ('payout_approved')
    `

    const riskCounts: Record<RiskLevel, { count: number; valueCents: number }> = {
      none: { count: 0, valueCents: 0 },
      low: { count: 0, valueCents: 0 },
      medium: { count: 0, valueCents: 0 },
      high: { count: 0, valueCents: 0 },
      critical: { count: 0, valueCents: 0 },
    }

    for (const row of allProjects.rows) {
      const risk = calculateRiskLevel(row.due_date, row.status as ProjectStatus)
      riskCounts[risk].count++
      riskCounts[risk].valueCents += Number(row.value_cents || 0)
    }

    return {
      throughput: throughputResult.rows.map((r) => ({
        week: r.week,
        count: r.count,
      })),
      cycleTime: cycleResult.rows.map((r) => ({
        days: r.days,
        count: r.count,
      })),
      stageMetrics: stageResult.rows.map((r) => ({
        stage: r.stage as ProjectStatus,
        avgDurationDays: Number(r.avgDurationDays) || 0,
        currentCount: r.currentCount,
      })),
      bottlenecks: bottlenecks.sort((a, b) => b.avgDuration - a.avgDuration),
      riskDistribution: Object.entries(riskCounts).map(([level, data]) => ({
        level: level as RiskLevel,
        count: data.count,
        valueCents: data.valueCents,
      })),
    }
  })
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  tenantSlug: string,
  projectId: string,
  newStatus: ProjectStatus,
  notes?: string,
  userId?: string
): Promise<PipelineProject | null> {
  return withTenant(tenantSlug, async () => {
    // Get current status for history
    const current = await sql`
      SELECT status FROM projects WHERE id = ${projectId}
    `

    if (current.rows.length === 0) {
      return null
    }

    const fromStatus = current.rows[0].status

    // Update project
    const updateFields: Record<string, unknown> = {
      status: newStatus,
      last_activity_at: new Date().toISOString(),
    }

    if (newStatus === 'approved') {
      updateFields.approved_at = new Date().toISOString()
    }

    if (newStatus === 'payout_approved') {
      updateFields.completed_at = new Date().toISOString()
    }

    const result = await sql`
      UPDATE projects
      SET
        status = ${newStatus}::project_status,
        last_activity_at = NOW(),
        approved_at = CASE WHEN ${newStatus} = 'approved' THEN NOW() ELSE approved_at END,
        completed_at = CASE WHEN ${newStatus} = 'payout_approved' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = ${projectId}
      RETURNING id
    `

    if ((result.rowCount ?? 0) === 0) {
      return null
    }

    // Record history
    await sql`
      INSERT INTO pipeline_stage_history (project_id, from_stage, to_stage, changed_by, notes)
      VALUES (${projectId}, ${fromStatus}, ${newStatus}, ${userId || null}, ${notes || null})
    `

    // Fetch updated project
    const projectResult = await sql`
      SELECT
        p.id,
        p.title,
        p.creator_id as "creatorId",
        COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as "creatorName",
        c.avatar_url as "creatorAvatar",
        p.status,
        p.due_date as "dueDate",
        CASE
          WHEN p.due_date IS NULL THEN NULL
          ELSE EXTRACT(DAY FROM p.due_date::timestamp - NOW())::integer
        END as "daysUntilDeadline",
        p.value_cents as "valueCents",
        p.tags,
        p.has_unread_messages as "hasUnreadMessages",
        p.files_count as "filesCount",
        p.last_activity_at as "lastActivityAt",
        p.created_at as "createdAt"
      FROM projects p
      LEFT JOIN creators c ON c.id = p.creator_id
      WHERE p.id = ${projectId}
    `

    if (projectResult.rows.length === 0) {
      return null
    }

    const project = projectResult.rows[0]
    const riskLevel = calculateRiskLevel(project.dueDate, project.status as ProjectStatus)

    return {
      ...project,
      riskLevel,
      isAtRisk: riskLevel === 'high' || riskLevel === 'critical',
      tags: project.tags || [],
    } as PipelineProject
  })
}

/**
 * Bulk update project statuses
 */
export async function bulkUpdateStatus(
  tenantSlug: string,
  projectIds: string[],
  newStatus: ProjectStatus,
  userId?: string
): Promise<{ updated: number; errors: string[] }> {
  return withTenant(tenantSlug, async () => {
    let updated = 0
    const errors: string[] = []

    for (const projectId of projectIds) {
      try {
        const result = await updateProjectStatus(
          tenantSlug,
          projectId,
          newStatus,
          'Bulk update',
          userId
        )
        if (result) {
          updated++
        } else {
          errors.push(`Project ${projectId} not found`)
        }
      } catch (error) {
        errors.push(`Failed to update ${projectId}: ${String(error)}`)
      }
    }

    return { updated, errors }
  })
}

/**
 * Get pipeline configuration
 */
export async function getPipelineConfig(tenantSlug: string): Promise<PipelineConfig> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT stages, default_filters, wip_limits
      FROM pipeline_config
      LIMIT 1
    `

    if (result.rows.length === 0) {
      // Return default config
      return {
        stages: PIPELINE_STAGES as unknown as StageConfig[],
        defaultFilters: undefined,
        wipLimits: {},
      }
    }

    return {
      stages: result.rows[0].stages as StageConfig[],
      defaultFilters: result.rows[0].default_filters as PipelineFilters | undefined,
      wipLimits: (result.rows[0].wip_limits as Record<string, number>) || {},
    }
  })
}

/**
 * Update pipeline configuration
 */
export async function updatePipelineConfig(
  tenantSlug: string,
  config: Partial<PipelineConfig>
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO pipeline_config (stages, default_filters, wip_limits)
      VALUES (
        ${JSON.stringify(config.stages || PIPELINE_STAGES)}::jsonb,
        ${config.defaultFilters ? JSON.stringify(config.defaultFilters) : null}::jsonb,
        ${JSON.stringify(config.wipLimits || {})}::jsonb
      )
      ON CONFLICT ((true)) DO UPDATE SET
        stages = COALESCE(${config.stages ? JSON.stringify(config.stages) : null}::jsonb, pipeline_config.stages),
        default_filters = COALESCE(${config.defaultFilters ? JSON.stringify(config.defaultFilters) : null}::jsonb, pipeline_config.default_filters),
        wip_limits = COALESCE(${config.wipLimits ? JSON.stringify(config.wipLimits) : null}::jsonb, pipeline_config.wip_limits),
        updated_at = NOW()
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get pipeline triggers
 */
export async function getPipelineTriggers(tenantSlug: string): Promise<PipelineTrigger[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        name,
        enabled,
        trigger_type as "triggerType",
        trigger_stage as "triggerStage",
        trigger_days as "triggerDays",
        trigger_value_cents as "triggerValueCents",
        actions,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM pipeline_triggers
      ORDER BY created_at DESC
    `
    return result.rows as PipelineTrigger[]
  })
}

/**
 * Create pipeline trigger
 */
export async function createPipelineTrigger(
  tenantSlug: string,
  trigger: Omit<PipelineTrigger, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PipelineTrigger> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO pipeline_triggers (
        name, enabled, trigger_type, trigger_stage,
        trigger_days, trigger_value_cents, actions
      )
      VALUES (
        ${trigger.name},
        ${trigger.enabled},
        ${trigger.triggerType},
        ${trigger.triggerStage || null},
        ${trigger.triggerDays || null},
        ${trigger.triggerValueCents || null},
        ${JSON.stringify(trigger.actions)}::jsonb
      )
      RETURNING
        id,
        name,
        enabled,
        trigger_type as "triggerType",
        trigger_stage as "triggerStage",
        trigger_days as "triggerDays",
        trigger_value_cents as "triggerValueCents",
        actions,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    return result.rows[0] as PipelineTrigger
  })
}

/**
 * Update pipeline trigger
 */
export async function updatePipelineTrigger(
  tenantSlug: string,
  triggerId: string,
  updates: Partial<Omit<PipelineTrigger, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (updates.name !== undefined) {
      paramIndex++
      setClauses.push(`name = $${paramIndex}`)
      values.push(updates.name)
    }

    if (updates.enabled !== undefined) {
      paramIndex++
      setClauses.push(`enabled = $${paramIndex}`)
      values.push(updates.enabled)
    }

    if (updates.triggerType !== undefined) {
      paramIndex++
      setClauses.push(`trigger_type = $${paramIndex}`)
      values.push(updates.triggerType)
    }

    if (updates.triggerStage !== undefined) {
      paramIndex++
      setClauses.push(`trigger_stage = $${paramIndex}`)
      values.push(updates.triggerStage)
    }

    if (updates.triggerDays !== undefined) {
      paramIndex++
      setClauses.push(`trigger_days = $${paramIndex}`)
      values.push(updates.triggerDays)
    }

    if (updates.triggerValueCents !== undefined) {
      paramIndex++
      setClauses.push(`trigger_value_cents = $${paramIndex}`)
      values.push(updates.triggerValueCents)
    }

    if (updates.actions !== undefined) {
      paramIndex++
      setClauses.push(`actions = $${paramIndex}::jsonb`)
      values.push(JSON.stringify(updates.actions))
    }

    paramIndex++
    values.push(triggerId)

    const result = await sql.query(
      `UPDATE pipeline_triggers SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
      values
    )
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Delete pipeline trigger
 */
export async function deletePipelineTrigger(
  tenantSlug: string,
  triggerId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM pipeline_triggers WHERE id = ${triggerId} RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get saved filters
 */
export async function getSavedFilters(
  tenantSlug: string,
  userId?: string
): Promise<SavedFilter[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        user_id as "userId",
        name,
        filters,
        is_default as "isDefault",
        created_at as "createdAt"
      FROM pipeline_saved_filters
      WHERE user_id IS NULL OR user_id = ${userId || null}
      ORDER BY is_default DESC, created_at DESC
    `
    return result.rows as SavedFilter[]
  })
}

/**
 * Create saved filter
 */
export async function createSavedFilter(
  tenantSlug: string,
  filter: {
    userId?: string
    name: string
    filters: PipelineFilters
    isDefault?: boolean
  }
): Promise<SavedFilter> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO pipeline_saved_filters (user_id, name, filters, is_default)
      VALUES (
        ${filter.userId || null},
        ${filter.name},
        ${JSON.stringify(filter.filters)}::jsonb,
        ${filter.isDefault || false}
      )
      RETURNING
        id,
        user_id as "userId",
        name,
        filters,
        is_default as "isDefault",
        created_at as "createdAt"
    `
    return result.rows[0] as SavedFilter
  })
}

/**
 * Delete saved filter
 */
export async function deleteSavedFilter(
  tenantSlug: string,
  filterId: string,
  userId?: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM pipeline_saved_filters
      WHERE id = ${filterId}
      AND (user_id IS NULL OR user_id = ${userId || null})
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get creators for filter dropdown
 */
export async function getCreatorsForFilter(
  tenantSlug: string
): Promise<Array<{ id: string; name: string }>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT DISTINCT
        c.id,
        COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as name
      FROM creators c
      INNER JOIN projects p ON p.creator_id = c.id
      ORDER BY name
    `
    return result.rows as Array<{ id: string; name: string }>
  })
}

/**
 * Update project due date (for calendar drag)
 */
export async function updateProjectDueDate(
  tenantSlug: string,
  projectId: string,
  dueDate: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE projects
      SET due_date = ${dueDate}::date, updated_at = NOW()
      WHERE id = ${projectId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}
