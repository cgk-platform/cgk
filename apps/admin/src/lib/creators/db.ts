/**
 * Creator database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  Creator,
  CreatorWithEarnings,
  CreatorProject,
  CreatorEarning,
  CreatorFilters,
  CreatorStatus,
  CreatorDirectoryFilters,
  CreatorProfile,
  CreatorStats,
  CreatorActivity,
  CreatorConversation,
  CreatorMessage,
  ExportConfig,
  CreatorTier,
} from './types'

const CREATOR_SORT_COLUMNS: Record<string, string> = {
  applied_at: 'applied_at',
  created_at: 'created_at',
  email: 'email',
  first_name: 'first_name',
  display_name: 'display_name',
  status: 'status',
}

export async function getCreators(
  tenantSlug: string,
  filters: CreatorFilters,
): Promise<{ rows: CreatorWithEarnings[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.search) {
      paramIndex++
      conditions.push(
        `(c.email ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.display_name ILIKE $${paramIndex})`,
      )
      values.push(`%${filters.search}%`)
    }

    if (filters.status) {
      paramIndex++
      conditions.push(`c.status = $${paramIndex}::creator_status`)
      values.push(filters.status)
    }

    if (filters.tier) {
      paramIndex++
      conditions.push(`c.tier = $${paramIndex}::creator_tier`)
      values.push(filters.tier)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortCol = CREATOR_SORT_COLUMNS[filters.sort] || 'applied_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        c.id, c.user_id, c.email, c.first_name, c.last_name, c.display_name,
        c.avatar_url, c.status, c.tier, c.phone, c.bio, c.social_links, c.tags,
        c.notes, c.applied_at, c.approved_at, c.created_at, c.updated_at,
        COALESCE(e.total_earned_cents, 0)::bigint as total_earned_cents,
        COALESCE(e.pending_balance_cents, 0)::bigint as pending_balance_cents,
        COALESCE(e.available_balance_cents, 0)::bigint as available_balance_cents,
        COALESCE(p.total_projects, 0)::int as total_projects
      FROM creators c
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN type != 'payout' THEN amount_cents ELSE 0 END) as total_earned_cents,
          SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END) as pending_balance_cents,
          SUM(CASE WHEN status = 'available' THEN amount_cents ELSE 0 END) as available_balance_cents
        FROM balance_transactions
        WHERE creator_id = c.id
      ) e ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as total_projects
        FROM projects
        WHERE creator_id = c.id
      ) p ON true
      ${whereClause}
      ORDER BY c.${sortCol} ${sortDir} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM creators c ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as CreatorWithEarnings[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getCreatorsByStage(
  tenantSlug: string,
): Promise<Record<CreatorStatus, Creator[]>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, user_id, email, first_name, last_name, display_name,
        avatar_url, status, tier, phone, bio, social_links, tags,
        notes, applied_at, approved_at, created_at, updated_at
      FROM creators
      WHERE status IN ('applied', 'reviewing', 'approved', 'onboarding', 'active')
      ORDER BY applied_at ASC
    `

    const stages: Record<CreatorStatus, Creator[]> = {
      applied: [],
      reviewing: [],
      approved: [],
      onboarding: [],
      active: [],
      inactive: [],
      rejected: [],
    }

    for (const row of result.rows as Creator[]) {
      if (stages[row.status]) {
        stages[row.status].push(row)
      }
    }

    return stages
  })
}

export async function getCreator(
  tenantSlug: string,
  creatorId: string,
): Promise<CreatorWithEarnings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        c.id, c.user_id, c.email, c.first_name, c.last_name, c.display_name,
        c.avatar_url, c.status, c.tier, c.phone, c.bio, c.social_links, c.tags,
        c.notes, c.applied_at, c.approved_at, c.created_at, c.updated_at,
        COALESCE(e.total_earned_cents, 0)::bigint as total_earned_cents,
        COALESCE(e.pending_balance_cents, 0)::bigint as pending_balance_cents,
        COALESCE(e.available_balance_cents, 0)::bigint as available_balance_cents,
        COALESCE(p.total_projects, 0)::int as total_projects
      FROM creators c
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN type != 'payout' THEN amount_cents ELSE 0 END) as total_earned_cents,
          SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END) as pending_balance_cents,
          SUM(CASE WHEN status = 'available' THEN amount_cents ELSE 0 END) as available_balance_cents
        FROM balance_transactions
        WHERE creator_id = c.id
      ) e ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as total_projects
        FROM projects
        WHERE creator_id = c.id
      ) p ON true
      WHERE c.id = ${creatorId}
      LIMIT 1
    `

    return (result.rows[0] as CreatorWithEarnings) || null
  })
}

export async function updateCreatorStage(
  tenantSlug: string,
  creatorId: string,
  newStatus: CreatorStatus,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql.query(
      `UPDATE creators
       SET status = $1::creator_status,
           approved_at = ${newStatus === 'approved' ? 'NOW()' : 'approved_at'},
           updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [newStatus, creatorId],
    )
    return (result.rowCount ?? 0) > 0
  })
}

export async function updateCreator(
  tenantSlug: string,
  creatorId: string,
  updates: Partial<Pick<Creator, 'notes' | 'tags' | 'tier'>>,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (updates.notes !== undefined) {
      paramIndex++
      setClauses.push(`notes = $${paramIndex}`)
      values.push(updates.notes)
    }

    if (updates.tags !== undefined) {
      paramIndex++
      setClauses.push(`tags = $${paramIndex}::text[]`)
      values.push(updates.tags)
    }

    if (updates.tier !== undefined) {
      paramIndex++
      setClauses.push(`tier = $${paramIndex}::creator_tier`)
      values.push(updates.tier)
    }

    paramIndex++
    values.push(creatorId)

    const result = await sql.query(
      `UPDATE creators SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
      values,
    )
    return (result.rowCount ?? 0) > 0
  })
}

export async function getCreatorProjects(
  tenantSlug: string,
  creatorId: string,
): Promise<CreatorProject[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        p.id, p.creator_id, p.name, p.status,
        p.started_at, p.completed_at, p.created_at,
        COUNT(d.id)::int as deliverables_count,
        COUNT(d.id) FILTER (WHERE d.status = 'completed')::int as completed_deliverables,
        COALESCE(SUM(d.value_cents), 0)::bigint as total_value_cents,
        COALESCE(SUM(d.value_cents) FILTER (WHERE d.status = 'completed'), 0)::bigint as earned_cents
      FROM projects p
      LEFT JOIN deliverables d ON d.project_id = p.id
      WHERE p.creator_id = ${creatorId}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `
    return result.rows as CreatorProject[]
  })
}

export async function getCreatorEarnings(
  tenantSlug: string,
  creatorId: string,
  limit = 50,
): Promise<CreatorEarning[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, creator_id, type, amount_cents, description,
        reference_type, reference_id, created_at
      FROM balance_transactions
      WHERE creator_id = ${creatorId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result.rows as CreatorEarning[]
  })
}

// Extended directory query with tags and date range
export async function getCreatorsDirectory(
  tenantSlug: string,
  filters: CreatorDirectoryFilters,
): Promise<{ rows: CreatorWithEarnings[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.search) {
      paramIndex++
      conditions.push(
        `(c.email ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.display_name ILIKE $${paramIndex} OR c.referral_code ILIKE $${paramIndex})`,
      )
      values.push(`%${filters.search}%`)
    }

    if (filters.status) {
      paramIndex++
      conditions.push(`c.status = $${paramIndex}::creator_status`)
      values.push(filters.status)
    }

    if (filters.tier) {
      paramIndex++
      conditions.push(`c.tier = $${paramIndex}::creator_tier`)
      values.push(filters.tier)
    }

    if (filters.tags && filters.tags.length > 0) {
      paramIndex++
      conditions.push(`c.tags && $${paramIndex}::text[]`)
      values.push(`{${filters.tags.map((s) => `"${s}"`).join(',')}}`)
    }

    if (filters.dateFrom) {
      paramIndex++
      const dateField = filters.dateField || 'applied_at'
      conditions.push(`c.${dateField} >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      const dateField = filters.dateField || 'applied_at'
      conditions.push(`c.${dateField} <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortCol = CREATOR_SORT_COLUMNS[filters.sort] || 'applied_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        c.id, c.user_id, c.email, c.first_name, c.last_name, c.display_name,
        c.avatar_url, c.status, c.tier, c.phone, c.bio, c.social_links, c.tags,
        c.notes, c.applied_at, c.approved_at, c.created_at, c.updated_at,
        c.referral_code, c.commission_rate_pct,
        COALESCE(e.total_earned_cents, 0)::bigint as total_earned_cents,
        COALESCE(e.pending_balance_cents, 0)::bigint as pending_balance_cents,
        COALESCE(e.available_balance_cents, 0)::bigint as available_balance_cents,
        COALESCE(p.total_projects, 0)::int as total_projects
      FROM creators c
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN type != 'payout' THEN amount_cents ELSE 0 END) as total_earned_cents,
          SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END) as pending_balance_cents,
          SUM(CASE WHEN status = 'available' THEN amount_cents ELSE 0 END) as available_balance_cents
        FROM balance_transactions
        WHERE creator_id = c.id
      ) e ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as total_projects
        FROM projects
        WHERE creator_id = c.id
      ) p ON true
      ${whereClause}
      ORDER BY c.${sortCol} ${sortDir} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM creators c ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as CreatorWithEarnings[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

// Create a new creator
export async function createCreator(
  tenantSlug: string,
  data: CreatorProfile,
): Promise<Creator | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creators (
        email, first_name, last_name, display_name, phone, bio,
        status, tier, commission_rate_pct, referral_code, tags,
        social_profiles, notes
      ) VALUES (
        ${data.email},
        ${data.first_name},
        ${data.last_name},
        ${data.display_name || null},
        ${data.phone || null},
        ${data.bio || null},
        ${data.status}::creator_status,
        ${data.tier || null}::creator_tier,
        ${data.commission_percent},
        ${data.discount_code || null},
        ${data.tags?.length ? `{${data.tags.map((s) => `"${s}"`).join(',')}}` : '{}'}::text[],
        ${JSON.stringify(data.social_links || {})}::jsonb,
        ${data.internal_notes || null}
      )
      RETURNING *
    `
    return (result.rows[0] as Creator) || null
  })
}

// Full creator update
export async function updateCreatorFull(
  tenantSlug: string,
  creatorId: string,
  data: Partial<CreatorProfile>,
): Promise<Creator | null> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (data.email !== undefined) {
      paramIndex++
      setClauses.push(`email = $${paramIndex}`)
      values.push(data.email)
    }

    if (data.first_name !== undefined) {
      paramIndex++
      setClauses.push(`first_name = $${paramIndex}`)
      values.push(data.first_name)
    }

    if (data.last_name !== undefined) {
      paramIndex++
      setClauses.push(`last_name = $${paramIndex}`)
      values.push(data.last_name)
    }

    if (data.display_name !== undefined) {
      paramIndex++
      setClauses.push(`display_name = $${paramIndex}`)
      values.push(data.display_name)
    }

    if (data.phone !== undefined) {
      paramIndex++
      setClauses.push(`phone = $${paramIndex}`)
      values.push(data.phone)
    }

    if (data.bio !== undefined) {
      paramIndex++
      setClauses.push(`bio = $${paramIndex}`)
      values.push(data.bio)
    }

    if (data.status !== undefined) {
      paramIndex++
      setClauses.push(`status = $${paramIndex}::creator_status`)
      values.push(data.status)
    }

    if (data.tier !== undefined) {
      paramIndex++
      setClauses.push(`tier = $${paramIndex}::creator_tier`)
      values.push(data.tier)
    }

    if (data.commission_percent !== undefined) {
      paramIndex++
      setClauses.push(`commission_rate_pct = $${paramIndex}`)
      values.push(data.commission_percent)
    }

    if (data.discount_code !== undefined) {
      paramIndex++
      setClauses.push(`referral_code = $${paramIndex}`)
      values.push(data.discount_code)
    }

    if (data.tags !== undefined) {
      paramIndex++
      setClauses.push(`tags = $${paramIndex}::text[]`)
      values.push(`{${data.tags.map((s) => `"${s}"`).join(',')}}`)
    }

    if (data.social_links !== undefined) {
      paramIndex++
      setClauses.push(`social_profiles = $${paramIndex}::jsonb`)
      values.push(JSON.stringify(data.social_links))
    }

    if (data.internal_notes !== undefined) {
      paramIndex++
      setClauses.push(`notes = $${paramIndex}`)
      values.push(data.internal_notes)
    }

    paramIndex++
    values.push(creatorId)

    const result = await sql.query(
      `UPDATE creators SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    return (result.rows[0] as Creator) || null
  })
}

// Soft delete creator
export async function deleteCreator(
  tenantSlug: string,
  creatorId: string,
  hard = false,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    if (hard) {
      const result = await sql`DELETE FROM creators WHERE id = ${creatorId} RETURNING id`
      return (result.rowCount ?? 0) > 0
    }

    const result = await sql`
      UPDATE creators
      SET status = 'inactive'::creator_status, updated_at = NOW()
      WHERE id = ${creatorId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

// Get creator stats
export async function getCreatorStats(
  tenantSlug: string,
  creatorId: string,
  period: '7d' | '30d' | '90d' | 'all' = '30d',
): Promise<CreatorStats> {
  return withTenant(tenantSlug, async () => {
    // Period parameter is currently unused - stats are calculated differently
    // Kept for future use when period-based filtering is implemented
    void period

    const result = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type != 'payout' THEN amount_cents ELSE 0 END), 0)::bigint as lifetime_earnings_cents,
        COALESCE(SUM(CASE WHEN type != 'payout' AND created_at >= DATE_TRUNC('month', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint as this_month_earnings_cents,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END), 0)::bigint as pending_balance_cents
      FROM balance_transactions
      WHERE creator_id = ${creatorId}
    `

    const projectsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int as projects_completed,
        COALESCE(AVG(CASE WHEN completed_at <= due_date THEN 100 ELSE 0 END), 0)::numeric as on_time_delivery_percent
      FROM projects
      WHERE creator_id = ${creatorId}
    `

    // Calculate average response time from message timestamps
    // Find creator responses to admin messages and calculate time difference
    const responseTimeResult = await sql`
      WITH admin_messages AS (
        SELECT m.id, m.conversation_id, m.created_at
        FROM creator_conversation_messages m
        JOIN creator_conversations c ON c.id = m.conversation_id
        WHERE c.creator_id = ${creatorId}
          AND m.sender_type = 'admin'
          AND m.is_internal = false
        ORDER BY m.created_at
      ),
      creator_responses AS (
        SELECT
          am.id as admin_msg_id,
          MIN(cm.created_at) as response_at,
          am.created_at as admin_msg_at
        FROM admin_messages am
        JOIN creator_conversation_messages cm ON cm.conversation_id = am.conversation_id
          AND cm.sender_type = 'creator'
          AND cm.created_at > am.created_at
        GROUP BY am.id, am.created_at
      )
      SELECT
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (response_at - admin_msg_at)) / 3600),
          4.0
        )::numeric as avg_response_hours
      FROM creator_responses
    `

    const row = result.rows[0] || {}
    const projectRow = projectsResult.rows[0] || {}
    const responseRow = responseTimeResult.rows[0] || {}

    return {
      lifetime_earnings_cents: Number(row.lifetime_earnings_cents || 0),
      this_month_earnings_cents: Number(row.this_month_earnings_cents || 0),
      pending_balance_cents: Number(row.pending_balance_cents || 0),
      projects_completed: Number(projectRow.projects_completed || 0),
      on_time_delivery_percent: Number(projectRow.on_time_delivery_percent || 0),
      avg_response_hours: Number(responseRow.avg_response_hours || 4.0),
    }
  })
}

// Get creator activity feed
export async function getCreatorActivity(
  tenantSlug: string,
  creatorId: string,
  limit = 20,
): Promise<CreatorActivity[]> {
  return withTenant(tenantSlug, async () => {
    // Combine multiple activity sources
    const result = await sql`
      SELECT * FROM (
        -- Balance transactions
        SELECT
          id,
          CASE
            WHEN type = 'payout' THEN 'payment_received'
            ELSE 'payment_received'
          END as type,
          CASE
            WHEN type = 'payout' THEN 'Payout processed'
            ELSE 'Payment received'
          END as title,
          description,
          jsonb_build_object('amount_cents', amount_cents, 'type', type) as metadata,
          created_at
        FROM balance_transactions
        WHERE creator_id = ${creatorId}

        UNION ALL

        -- Project submissions
        SELECT
          id,
          'project_submitted' as type,
          'Project: ' || name as title,
          NULL as description,
          jsonb_build_object('status', status) as metadata,
          created_at
        FROM projects
        WHERE creator_id = ${creatorId}
      ) activities
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows as CreatorActivity[]
  })
}

// Get all unique tags for a tenant
export async function getAllCreatorTags(tenantSlug: string): Promise<string[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT DISTINCT unnest(tags) as tag
      FROM creators
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag
    `
    return result.rows.map((row) => (row as { tag: string }).tag)
  })
}

// Bulk update creators
export async function bulkUpdateCreators(
  tenantSlug: string,
  creatorIds: string[],
  updates: {
    status?: CreatorStatus
    tier?: CreatorTier
    addTags?: string[]
    removeTags?: string[]
  },
): Promise<{ success: number; failed: number }> {
  return withTenant(tenantSlug, async () => {
    let success = 0
    let failed = 0

    for (const id of creatorIds) {
      try {
        const setClauses: string[] = ['updated_at = NOW()']
        const values: unknown[] = []
        let paramIndex = 0

        if (updates.status) {
          paramIndex++
          setClauses.push(`status = $${paramIndex}::creator_status`)
          values.push(updates.status)
        }

        if (updates.tier) {
          paramIndex++
          setClauses.push(`tier = $${paramIndex}::creator_tier`)
          values.push(updates.tier)
        }

        if (updates.addTags && updates.addTags.length > 0) {
          paramIndex++
          setClauses.push(`tags = array_cat(COALESCE(tags, '{}'), $${paramIndex}::text[])`)
          values.push(`{${updates.addTags.map((s) => `"${s}"`).join(',')}}`)
        }

        if (updates.removeTags && updates.removeTags.length > 0) {
          paramIndex++
          setClauses.push(`tags = array_remove_all(COALESCE(tags, '{}'), $${paramIndex}::text[])`)
          values.push(`{${updates.removeTags.map((s) => `"${s}"`).join(',')}}`)
        }

        if (setClauses.length > 1) {
          paramIndex++
          values.push(id)
          await sql.query(
            `UPDATE creators SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
            values,
          )
          success++
        }
      } catch {
        failed++
      }
    }

    return { success, failed }
  })
}

// Get creators for export
export async function getCreatorsForExport(
  tenantSlug: string,
  config: ExportConfig,
): Promise<Record<string, unknown>[]> {
  return withTenant(tenantSlug, async () => {
    let whereClause = ''
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (config.selectedIds && config.selectedIds.length > 0) {
      paramIndex++
      conditions.push(`c.id = ANY($${paramIndex}::text[])`)
      values.push(`{${config.selectedIds.map((s) => `"${s}"`).join(',')}}`)
    }

    if (config.filters.status) {
      paramIndex++
      conditions.push(`c.status = $${paramIndex}::creator_status`)
      values.push(config.filters.status)
    }

    if (config.filters.tier) {
      paramIndex++
      conditions.push(`c.tier = $${paramIndex}::creator_tier`)
      values.push(config.filters.tier)
    }

    if (!config.includeArchived) {
      conditions.push(`c.status != 'inactive'::creator_status`)
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`
    }

    const result = await sql.query(
      `SELECT
        c.id,
        COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as name,
        c.email,
        c.phone,
        c.status,
        c.tier,
        c.commission_rate_pct as commission_percent,
        c.referral_code as discount_code,
        c.tags,
        c.created_at,
        COALESCE(e.total_earned_cents, 0)::bigint as lifetime_earnings_cents,
        COALESCE(p.total_projects, 0)::int as projects_completed,
        c.updated_at as last_active
      FROM creators c
      LEFT JOIN LATERAL (
        SELECT SUM(CASE WHEN type != 'payout' THEN amount_cents ELSE 0 END) as total_earned_cents
        FROM balance_transactions
        WHERE creator_id = c.id
      ) e ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as total_projects
        FROM projects
        WHERE creator_id = c.id AND status = 'completed'
      ) p ON true
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT 10000`,
      values,
    )

    return result.rows as Record<string, unknown>[]
  })
}

// Per-creator conversations
export async function getCreatorConversations(
  tenantSlug: string,
  creatorId: string,
): Promise<CreatorConversation[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, creator_id, project_id, subject, status,
        last_message_at, last_message_preview,
        unread_creator, unread_admin, assigned_to,
        created_at, updated_at
      FROM creator_conversations
      WHERE creator_id = ${creatorId}
      ORDER BY last_message_at DESC NULLS LAST
    `
    return result.rows as CreatorConversation[]
  })
}

// Get messages for a conversation
export async function getConversationMessages(
  tenantSlug: string,
  conversationId: string,
  includeInternal = true,
): Promise<CreatorMessage[]> {
  return withTenant(tenantSlug, async () => {
    const internalFilter = includeInternal ? '' : 'AND is_internal = false'
    const result = await sql.query(
      `SELECT
        id, conversation_id, sender_type, sender_id, sender_name,
        content, content_html, attachments, is_internal, ai_generated,
        scheduled_for, sent_at, read_at, created_at
      FROM creator_conversation_messages
      WHERE conversation_id = $1 ${internalFilter}
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      ORDER BY created_at ASC`,
      [conversationId],
    )
    return result.rows as CreatorMessage[]
  })
}

// Create a new conversation
export async function createConversation(
  tenantSlug: string,
  creatorId: string,
  subject: string | null,
  initialMessage: {
    senderType: 'admin' | 'creator'
    senderId: string
    senderName: string
    content: string
    isInternal?: boolean
  },
): Promise<{ conversation: CreatorConversation; message: CreatorMessage } | null> {
  return withTenant(tenantSlug, async () => {
    const convResult = await sql`
      INSERT INTO creator_conversations (creator_id, subject, last_message_preview)
      VALUES (${creatorId}, ${subject}, ${initialMessage.content.slice(0, 200)})
      RETURNING *
    `

    if (!convResult.rows[0]) return null

    const conversation = convResult.rows[0] as CreatorConversation

    const msgResult = await sql`
      INSERT INTO creator_conversation_messages (
        conversation_id, sender_type, sender_id, sender_name, content, is_internal, sent_at
      ) VALUES (
        ${conversation.id},
        ${initialMessage.senderType}::message_sender_type,
        ${initialMessage.senderId},
        ${initialMessage.senderName},
        ${initialMessage.content},
        ${initialMessage.isInternal || false},
        NOW()
      )
      RETURNING *
    `

    if (!msgResult.rows[0]) return null

    return {
      conversation,
      message: msgResult.rows[0] as CreatorMessage,
    }
  })
}

// Send a message in a conversation
export async function sendConversationMessage(
  tenantSlug: string,
  conversationId: string,
  message: {
    senderType: 'admin' | 'creator' | 'system'
    senderId: string | null
    senderName: string
    content: string
    contentHtml?: string
    attachments?: Array<{ name: string; url: string; size: number; type: string }>
    isInternal?: boolean
    scheduledFor?: string
  },
): Promise<CreatorMessage | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creator_conversation_messages (
        conversation_id, sender_type, sender_id, sender_name,
        content, content_html, attachments, is_internal, scheduled_for, sent_at
      ) VALUES (
        ${conversationId},
        ${message.senderType}::message_sender_type,
        ${message.senderId},
        ${message.senderName},
        ${message.content},
        ${message.contentHtml || null},
        ${JSON.stringify(message.attachments || [])}::jsonb,
        ${message.isInternal || false},
        ${message.scheduledFor || null}::timestamptz,
        ${message.scheduledFor ? null : new Date().toISOString()}::timestamptz
      )
      RETURNING *
    `

    if (result.rows[0] && !message.scheduledFor) {
      // Update conversation last message
      await sql`
        UPDATE creator_conversations
        SET
          last_message_at = NOW(),
          last_message_preview = ${message.content.slice(0, 200)},
          unread_admin = CASE WHEN ${message.senderType} = 'creator' THEN unread_admin + 1 ELSE unread_admin END,
          unread_creator = CASE WHEN ${message.senderType} = 'admin' AND ${!message.isInternal} THEN unread_creator + 1 ELSE unread_creator END,
          updated_at = NOW()
        WHERE id = ${conversationId}
      `
    }

    return (result.rows[0] as CreatorMessage) || null
  })
}

// Mark conversation as read
export async function markConversationRead(
  tenantSlug: string,
  conversationId: string,
  readerType: 'admin' | 'creator',
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const unreadField = readerType === 'admin' ? 'unread_admin' : 'unread_creator'

    await sql.query(
      `UPDATE creator_conversations SET ${unreadField} = 0, updated_at = NOW() WHERE id = $1`,
      [conversationId],
    )

    // Mark individual messages as read
    const senderTypeToMark = readerType === 'admin' ? 'creator' : 'admin'
    await sql`
      UPDATE creator_conversation_messages
      SET read_at = NOW()
      WHERE conversation_id = ${conversationId}
        AND sender_type = ${senderTypeToMark}::message_sender_type
        AND read_at IS NULL
    `

    return true
  })
}
