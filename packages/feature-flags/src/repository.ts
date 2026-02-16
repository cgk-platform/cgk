/**
 * Feature Flags Repository
 *
 * Database operations for feature flags, overrides, and audit logs.
 * Uses the public schema (platform-wide, not tenant-specific).
 */

import { sql } from '@cgk-platform/db'

import { generateFlagSalt } from './hash.js'
import type {
  CreateFlagInput,
  CreateOverrideInput,
  FeatureFlag,
  FlagAuditEntry,
  FlagListFilters,
  FlagListPagination,
  FlagListResult,
  FlagOverride,
  FlagStatus,
  FlagTargeting,
  FlagType,
  UpdateFlagInput,
} from './types.js'

/**
 * Database row types
 */
interface FlagRow {
  id: string
  key: string
  name: string
  description: string | null
  type: FlagType
  status: FlagStatus
  default_value: unknown
  targeting: FlagTargeting
  salt: string
  category: string | null
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
  created_by: string | null
}

interface OverrideRow {
  id: string
  flag_id: string
  flag_key: string
  tenant_id: string | null
  user_id: string | null
  value: unknown
  expires_at: Date | null
  reason: string | null
  created_at: Date
  created_by: string | null
}

interface AuditRow {
  id: string
  flag_id: string
  flag_key: string
  action: FlagAuditEntry['action']
  previous_value: unknown | null
  new_value: unknown | null
  user_id: string | null
  user_email: string | null
  ip_address: string | null
  reason: string | null
  created_at: Date
}

/**
 * Convert database row to FeatureFlag
 */
function rowToFlag(row: FlagRow): FeatureFlag {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    status: row.status,
    defaultValue: row.default_value as boolean | string,
    targeting: row.targeting || {},
    salt: row.salt,
    category: row.category ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by ?? undefined,
  }
}

/**
 * Convert database row to FlagOverride
 */
function rowToOverride(row: OverrideRow): FlagOverride {
  return {
    id: row.id,
    flagId: row.flag_id,
    flagKey: row.flag_key,
    tenantId: row.tenant_id ?? undefined,
    userId: row.user_id ?? undefined,
    value: row.value as boolean | string,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    reason: row.reason ?? undefined,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by ?? undefined,
  }
}

/**
 * Convert database row to FlagAuditEntry
 */
function rowToAudit(row: AuditRow): FlagAuditEntry {
  return {
    id: row.id,
    flagId: row.flag_id,
    flagKey: row.flag_key,
    action: row.action,
    previousValue: row.previous_value ?? undefined,
    newValue: row.new_value ?? undefined,
    userId: row.user_id ?? undefined,
    userEmail: row.user_email ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    reason: row.reason ?? undefined,
    createdAt: new Date(row.created_at),
  }
}

/**
 * Get all feature flags
 */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  const result = await sql`
    SELECT * FROM feature_flags
    WHERE status != 'archived'
    ORDER BY category, key
  `

  return result.rows.map((row) => rowToFlag(row as FlagRow))
}

/**
 * Get flags with filtering and pagination
 */
export async function getFlags(
  filters: FlagListFilters = {},
  pagination: FlagListPagination = { page: 1, limit: 50 }
): Promise<FlagListResult> {
  const { category, type, status, search } = filters
  const { page, limit } = pagination
  const offset = (page - 1) * limit

  // Build WHERE clauses
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (category) {
    conditions.push(`category = $${paramIndex++}`)
    values.push(category)
  }

  if (type) {
    conditions.push(`type = $${paramIndex++}`)
    values.push(type)
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`)
    values.push(status)
  } else {
    // By default, don't show archived
    conditions.push(`status != 'archived'`)
  }

  if (search) {
    conditions.push(`(key ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`)
    values.push(`%${search}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countResult = await sql.query(`SELECT COUNT(*) as count FROM feature_flags ${whereClause}`, values)
  const total = parseInt(countResult.rows[0].count as string, 10)

  // Get paginated results
  const queryValues = [...values, limit, offset]
  const result = await sql.query(
    `SELECT * FROM feature_flags ${whereClause} ORDER BY category, key LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    queryValues
  )

  return {
    flags: result.rows.map((row) => rowToFlag(row as FlagRow)),
    total,
    page,
    limit,
    hasMore: offset + result.rows.length < total,
  }
}

/**
 * Get a flag by key
 */
export async function getFlagByKey(key: string): Promise<FeatureFlag | null> {
  const result = await sql`
    SELECT * FROM feature_flags WHERE key = ${key}
  `

  if (result.rows.length === 0) {
    return null
  }

  return rowToFlag(result.rows[0] as FlagRow)
}

/**
 * Get a flag by ID
 */
export async function getFlagById(id: string): Promise<FeatureFlag | null> {
  const result = await sql`
    SELECT * FROM feature_flags WHERE id = ${id}::uuid
  `

  if (result.rows.length === 0) {
    return null
  }

  return rowToFlag(result.rows[0] as FlagRow)
}

/**
 * Create a new feature flag
 */
export async function createFlag(
  input: CreateFlagInput,
  userId?: string
): Promise<FeatureFlag> {
  const salt = generateFlagSalt()
  const targeting = input.targeting || {}

  const result = await sql`
    INSERT INTO feature_flags (
      key, name, description, type, default_value, targeting, salt, category, metadata, created_by
    )
    VALUES (
      ${input.key},
      ${input.name},
      ${input.description || null},
      ${input.type}::feature_flag_type,
      ${JSON.stringify(input.defaultValue)},
      ${JSON.stringify(targeting)},
      ${salt},
      ${input.category || null},
      ${JSON.stringify(input.metadata || {})},
      ${userId || null}::uuid
    )
    RETURNING *
  `

  const flag = rowToFlag(result.rows[0] as FlagRow)

  // Create audit entry
  await createAuditEntry({
    flagId: flag.id,
    flagKey: flag.key,
    action: 'created',
    newValue: flag,
    userId,
  })

  return flag
}

/**
 * Update a feature flag
 */
export async function updateFlag(
  key: string,
  input: UpdateFlagInput,
  userId?: string,
  reason?: string
): Promise<FeatureFlag | null> {
  // Get current flag for audit
  const currentFlag = await getFlagByKey(key)
  if (!currentFlag) {
    return null
  }

  const updates: string[] = ['updated_at = NOW()']
  const values: unknown[] = []
  let paramIndex = 1

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`)
    values.push(input.name)
  }

  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`)
    values.push(input.description)
  }

  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}::feature_flag_status`)
    values.push(input.status)
  }

  if (input.defaultValue !== undefined) {
    updates.push(`default_value = $${paramIndex++}`)
    values.push(JSON.stringify(input.defaultValue))
  }

  if (input.targeting !== undefined) {
    // Merge with existing targeting
    const newTargeting = { ...currentFlag.targeting, ...input.targeting }
    updates.push(`targeting = $${paramIndex++}`)
    values.push(JSON.stringify(newTargeting))
  }

  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`)
    values.push(input.category)
  }

  if (input.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`)
    values.push(JSON.stringify(input.metadata))
  }

  values.push(key)
  const result = await sql.query(
    `UPDATE feature_flags SET ${updates.join(', ')} WHERE key = $${paramIndex} RETURNING *`,
    values
  )

  if (result.rows.length === 0) {
    return null
  }

  const updatedFlag = rowToFlag(result.rows[0] as FlagRow)

  // Create audit entry
  await createAuditEntry({
    flagId: updatedFlag.id,
    flagKey: updatedFlag.key,
    action: input.status === 'archived' ? 'archived' : 'updated',
    previousValue: currentFlag,
    newValue: updatedFlag,
    userId,
    reason,
  })

  return updatedFlag
}

/**
 * Delete a feature flag (hard delete)
 */
export async function deleteFlag(key: string, userId?: string, reason?: string): Promise<boolean> {
  const flag = await getFlagByKey(key)
  if (!flag) {
    return false
  }

  await sql`DELETE FROM feature_flags WHERE key = ${key}`

  await createAuditEntry({
    flagId: flag.id,
    flagKey: flag.key,
    action: 'deleted',
    previousValue: flag,
    userId,
    reason,
  })

  return true
}

/**
 * Kill switch - immediately disable a flag
 */
export async function killFlag(
  key: string,
  userId?: string,
  reason?: string,
  ipAddress?: string
): Promise<FeatureFlag | null> {
  const currentFlag = await getFlagByKey(key)
  if (!currentFlag) {
    return null
  }

  const result = await sql`
    UPDATE feature_flags
    SET status = 'disabled', updated_at = NOW()
    WHERE key = ${key}
    RETURNING *
  `

  if (result.rows.length === 0) {
    return null
  }

  const disabledFlag = rowToFlag(result.rows[0] as FlagRow)

  // Create audit entry for kill switch
  await sql`
    INSERT INTO feature_flag_audit (
      flag_id, flag_key, action, previous_value, new_value, user_id, reason, ip_address
    )
    VALUES (
      ${disabledFlag.id}::uuid,
      ${disabledFlag.key},
      'kill_switch',
      ${JSON.stringify(currentFlag)},
      ${JSON.stringify(disabledFlag)},
      ${userId || null}::uuid,
      ${reason || 'Emergency kill switch activated'},
      ${ipAddress || null}::inet
    )
  `

  return disabledFlag
}

/**
 * Get all overrides for a flag
 */
export async function getOverridesForFlag(flagKey: string): Promise<FlagOverride[]> {
  const result = await sql`
    SELECT * FROM feature_flag_overrides
    WHERE flag_key = ${flagKey}
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `

  return result.rows.map((row) => rowToOverride(row as OverrideRow))
}

/**
 * Get overrides for a specific context (tenant/user)
 */
export async function getOverridesForContext(
  flagKey: string,
  tenantId?: string,
  userId?: string
): Promise<FlagOverride[]> {
  const result = await sql`
    SELECT * FROM feature_flag_overrides
    WHERE flag_key = ${flagKey}
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
      (tenant_id = ${tenantId || null} AND user_id IS NULL)
      OR (user_id = ${userId || null}::uuid AND tenant_id IS NULL)
      OR (tenant_id = ${tenantId || null} AND user_id = ${userId || null}::uuid)
    )
    ORDER BY
      CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
      created_at DESC
  `

  return result.rows.map((row) => rowToOverride(row as OverrideRow))
}

/**
 * Create a flag override
 */
export async function createOverride(
  input: CreateOverrideInput,
  userId?: string
): Promise<FlagOverride> {
  const flag = await getFlagByKey(input.flagKey)
  if (!flag) {
    throw new Error(`Flag not found: ${input.flagKey}`)
  }

  const expiresAtIso = input.expiresAt ? input.expiresAt.toISOString() : null

  const result = await sql`
    INSERT INTO feature_flag_overrides (
      flag_id, flag_key, tenant_id, user_id, value, expires_at, reason, created_by
    )
    VALUES (
      ${flag.id}::uuid,
      ${input.flagKey},
      ${input.tenantId || null},
      ${input.userId || null}::uuid,
      ${JSON.stringify(input.value)},
      ${expiresAtIso},
      ${input.reason || null},
      ${userId || null}::uuid
    )
    RETURNING *
  `

  const override = rowToOverride(result.rows[0] as OverrideRow)

  await createAuditEntry({
    flagId: flag.id,
    flagKey: flag.key,
    action: 'override_added',
    newValue: override,
    userId,
    reason: input.reason,
  })

  return override
}

/**
 * Delete a flag override
 */
export async function deleteOverride(
  overrideId: string,
  userId?: string,
  reason?: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM feature_flag_overrides
    WHERE id = ${overrideId}::uuid
    RETURNING *
  `

  if (result.rows.length === 0) {
    return false
  }

  const override = rowToOverride(result.rows[0] as OverrideRow)

  await createAuditEntry({
    flagId: override.flagId,
    flagKey: override.flagKey,
    action: 'override_removed',
    previousValue: override,
    userId,
    reason,
  })

  return true
}

/**
 * Get audit log for a flag
 */
export async function getAuditLog(
  flagKey: string,
  limit: number = 50,
  offset: number = 0
): Promise<FlagAuditEntry[]> {
  const result = await sql`
    SELECT * FROM feature_flag_audit
    WHERE flag_key = ${flagKey}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  return result.rows.map((row) => rowToAudit(row as AuditRow))
}

/**
 * Get all audit entries (for audit page)
 */
export async function getAllAuditEntries(
  limit: number = 100,
  offset: number = 0,
  action?: string
): Promise<{ entries: FlagAuditEntry[]; total: number }> {
  // Use parameterized queries to prevent SQL injection
  // Separate query branches for with/without action filter
  if (action) {
    const countResult = await sql`
      SELECT COUNT(*) as count FROM feature_flag_audit
      WHERE action = ${action}
    `
    const total = parseInt(countResult.rows[0]?.count as string ?? '0', 10)

    const result = await sql`
      SELECT * FROM feature_flag_audit
      WHERE action = ${action}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return {
      entries: result.rows.map((row) => rowToAudit(row as AuditRow)),
      total,
    }
  }

  // No action filter - query all entries
  const countResult = await sql`
    SELECT COUNT(*) as count FROM feature_flag_audit
  `
  const total = parseInt(countResult.rows[0]?.count as string ?? '0', 10)

  const result = await sql`
    SELECT * FROM feature_flag_audit
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  return {
    entries: result.rows.map((row) => rowToAudit(row as AuditRow)),
    total,
  }
}

/**
 * Create an audit entry
 */
async function createAuditEntry(params: {
  flagId: string
  flagKey: string
  action: FlagAuditEntry['action']
  previousValue?: unknown
  newValue?: unknown
  userId?: string
  userEmail?: string
  ipAddress?: string
  reason?: string
}): Promise<void> {
  await sql`
    INSERT INTO feature_flag_audit (
      flag_id, flag_key, action, previous_value, new_value, user_id, user_email, ip_address, reason
    )
    VALUES (
      ${params.flagId}::uuid,
      ${params.flagKey},
      ${params.action},
      ${params.previousValue ? JSON.stringify(params.previousValue) : null},
      ${params.newValue ? JSON.stringify(params.newValue) : null},
      ${params.userId || null}::uuid,
      ${params.userEmail || null},
      ${params.ipAddress || null}::inet,
      ${params.reason || null}
    )
  `
}

/**
 * Seed platform flags (upsert)
 */
export async function seedFlags(
  flags: CreateFlagInput[],
  userId?: string
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  for (const input of flags) {
    const existing = await getFlagByKey(input.key)

    if (existing) {
      // Update if targeting or other fields changed
      await updateFlag(
        input.key,
        {
          name: input.name,
          description: input.description,
          category: input.category,
          targeting: input.targeting,
        },
        userId,
        'Automatic seed update'
      )
      updated++
    } else {
      await createFlag(input, userId)
      created++
    }
  }

  return { created, updated }
}

/**
 * Get distinct categories
 */
export async function getCategories(): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT category FROM feature_flags
    WHERE category IS NOT NULL
    ORDER BY category
  `

  return result.rows.map((row) => row.category as string)
}
