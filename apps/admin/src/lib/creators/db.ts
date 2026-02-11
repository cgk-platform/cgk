/**
 * Creator database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  Creator,
  CreatorWithEarnings,
  CreatorProject,
  CreatorEarning,
  CreatorFilters,
  CreatorStatus,
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
