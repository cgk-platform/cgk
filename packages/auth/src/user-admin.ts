/**
 * User Admin Service
 *
 * Platform-wide user management for super admins.
 * Provides user queries, status management, and activity logging.
 */

import { sql } from '@cgk-platform/db'

import { logAuditAction, revokeAllSuperAdminSessions } from './super-admin'
import { revokeAllSessions } from './session'

/**
 * User status values
 */
export type PlatformUserStatus = 'active' | 'disabled' | 'pending_verification' | 'invited'

/**
 * User with basic information
 */
export interface PlatformUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  status: PlatformUserStatus
  role: string
  emailVerified: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  disabledAt: Date | null
  disabledBy: string | null
  disabledReason: string | null
  tenantCount: number
  isSuperAdmin: boolean
}

/**
 * User membership in a tenant
 */
export interface UserMembership {
  tenantId: string
  tenantName: string
  tenantSlug: string
  tenantLogoUrl: string | null
  role: string
  joinedAt: Date
  isActive: boolean
}

/**
 * User with all their memberships
 */
export interface UserWithMemberships extends PlatformUser {
  superAdminGrantedBy: string | null
  superAdminGrantedAt: Date | null
  memberships: UserMembership[]
}

/**
 * User activity log entry
 */
export interface UserActivityEntry {
  id: string
  userId: string
  tenantId: string | null
  tenantName: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  createdAt: Date
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number
  limit?: number
}

/**
 * User query options
 */
export interface UserQueryOptions extends PaginationOptions {
  status?: PlatformUserStatus | 'all'
  isSuperAdmin?: boolean
  tenantId?: string
  search?: string
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated users result
 */
export interface PaginatedUsers {
  users: PlatformUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Tracked actions for activity logging
 */
export const TRACKED_ACTIONS = [
  'user.login',
  'user.logout',
  'user.password_reset',
  'user.mfa_enabled',
  'tenant.switched',
  'tenant.joined',
  'tenant.left',
  'team.member_invited',
  'team.member_removed',
  'role.changed',
  'super_admin.granted',
  'super_admin.revoked',
  'user.disabled',
  'user.enabled',
  'user.impersonated',
] as const

export type TrackedAction = (typeof TRACKED_ACTIONS)[number]

/**
 * Map database row to PlatformUser
 */
function mapRowToPlatformUser(row: Record<string, unknown>): PlatformUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string) || null,
    avatarUrl: (row.avatar_url as string) || null,
    status: row.status as PlatformUserStatus,
    role: row.role as string,
    emailVerified: row.email_verified as boolean,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    disabledAt: row.disabled_at ? new Date(row.disabled_at as string) : null,
    disabledBy: (row.disabled_by as string) || null,
    disabledReason: (row.disabled_reason as string) || null,
    tenantCount: Number(row.tenant_count || 0),
    isSuperAdmin: Boolean(row.is_super_admin),
  }
}

/**
 * Get all users with pagination and filtering
 *
 * @param options - Query options
 * @returns Paginated user list
 */
export async function getAllUsers(options: UserQueryOptions = {}): Promise<PaginatedUsers> {
  const page = options.page || 1
  const limit = Math.min(options.limit || 50, 100)
  const offset = (page - 1) * limit
  const sortBy = options.sortBy || 'createdAt'
  const sortOrder = options.sortOrder || 'desc'

  // Build dynamic query parts
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (options.status && options.status !== 'all') {
    conditions.push(`u.status = $${paramIndex}`)
    params.push(options.status)
    paramIndex++
  }

  if (options.isSuperAdmin !== undefined) {
    if (options.isSuperAdmin) {
      conditions.push(`sau.user_id IS NOT NULL`)
    } else {
      conditions.push(`sau.user_id IS NULL`)
    }
  }

  if (options.tenantId) {
    conditions.push(`uo.organization_id = $${paramIndex}`)
    params.push(options.tenantId)
    paramIndex++
  }

  if (options.search) {
    conditions.push(`u.search_vector @@ plainto_tsquery('english', $${paramIndex})`)
    params.push(options.search)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Validate sortBy to prevent SQL injection
  const sortColumn =
    {
      name: 'u.name',
      email: 'u.email',
      createdAt: 'u.created_at',
      lastLoginAt: 'u.last_login_at',
    }[sortBy] || 'u.created_at'

  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC'

  // Count total matching users
  const countResult = await sql.query(
    `
    SELECT COUNT(DISTINCT u.id) as total
    FROM users u
    LEFT JOIN super_admin_users sau ON sau.user_id = u.id AND sau.is_active = TRUE
    LEFT JOIN user_organizations uo ON uo.user_id = u.id
    ${whereClause}
  `,
    params
  )

  const total = Number((countResult.rows[0] as Record<string, unknown>).total || 0)

  // Get users with tenant count and super admin status
  const usersResult = await sql.query(
    `
    SELECT
      u.id, u.email, u.name, u.avatar_url, u.status, u.role,
      u.email_verified, u.last_login_at, u.created_at, u.updated_at,
      u.disabled_at, u.disabled_by, u.disabled_reason,
      (SELECT COUNT(*) FROM user_organizations WHERE user_id = u.id) as tenant_count,
      CASE WHEN sau.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_super_admin
    FROM users u
    LEFT JOIN super_admin_users sau ON sau.user_id = u.id AND sau.is_active = TRUE
    LEFT JOIN user_organizations uo ON uo.user_id = u.id
    ${whereClause}
    GROUP BY u.id, sau.user_id
    ORDER BY ${sortColumn} ${sortDir} NULLS LAST
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `,
    [...params, limit, offset]
  )

  const users = usersResult.rows.map((row) => mapRowToPlatformUser(row as Record<string, unknown>))

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Search users by name or email
 *
 * @param query - Search query
 * @param options - Pagination options
 * @returns Matching users
 */
export async function searchUsers(
  query: string,
  options: PaginationOptions = {}
): Promise<PlatformUser[]> {
  const limit = Math.min(options.limit || 20, 50)

  const result = await sql`
    SELECT
      u.id, u.email, u.name, u.avatar_url, u.status, u.role,
      u.email_verified, u.last_login_at, u.created_at, u.updated_at,
      u.disabled_at, u.disabled_by, u.disabled_reason,
      (SELECT COUNT(*) FROM user_organizations WHERE user_id = u.id) as tenant_count,
      CASE WHEN sau.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_super_admin
    FROM users u
    LEFT JOIN super_admin_users sau ON sau.user_id = u.id AND sau.is_active = TRUE
    WHERE u.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY ts_rank(u.search_vector, plainto_tsquery('english', ${query})) DESC
    LIMIT ${limit}
  `

  return result.rows.map((row) => mapRowToPlatformUser(row as Record<string, unknown>))
}

/**
 * Get user details with all tenant memberships
 *
 * @param userId - User ID
 * @returns User with memberships or null if not found
 */
export async function getUserWithMemberships(userId: string): Promise<UserWithMemberships | null> {
  // Get user details
  const userResult = await sql`
    SELECT
      u.id, u.email, u.name, u.avatar_url, u.status, u.role,
      u.email_verified, u.last_login_at, u.created_at, u.updated_at,
      u.disabled_at, u.disabled_by, u.disabled_reason,
      (SELECT COUNT(*) FROM user_organizations WHERE user_id = u.id) as tenant_count,
      CASE WHEN sau.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_super_admin,
      sau.granted_by as super_admin_granted_by,
      sau.granted_at as super_admin_granted_at
    FROM users u
    LEFT JOIN super_admin_users sau ON sau.user_id = u.id AND sau.is_active = TRUE
    WHERE u.id = ${userId}
  `

  if (userResult.rows.length === 0) {
    return null
  }

  const userRow = userResult.rows[0] as Record<string, unknown>
  const user = mapRowToPlatformUser(userRow)

  // Get tenant memberships
  const membershipsResult = await sql`
    SELECT
      o.id as tenant_id,
      o.name as tenant_name,
      o.slug as tenant_slug,
      o.logo_url as tenant_logo_url,
      uo.role,
      uo.created_at as joined_at,
      o.is_active
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
    ORDER BY uo.created_at DESC
  `

  const memberships: UserMembership[] = membershipsResult.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      tenantId: r.tenant_id as string,
      tenantName: r.tenant_name as string,
      tenantSlug: r.tenant_slug as string,
      tenantLogoUrl: (r.tenant_logo_url as string) || null,
      role: r.role as string,
      joinedAt: new Date(r.joined_at as string),
      isActive: r.is_active as boolean,
    }
  })

  return {
    ...user,
    superAdminGrantedBy: (userRow.super_admin_granted_by as string) || null,
    superAdminGrantedAt: userRow.super_admin_granted_at
      ? new Date(userRow.super_admin_granted_at as string)
      : null,
    memberships,
  }
}

/**
 * Get user activity log
 *
 * @param userId - User ID
 * @param options - Pagination options
 * @returns Activity entries
 */
export async function getUserActivityLog(
  userId: string,
  options: PaginationOptions = {}
): Promise<UserActivityEntry[]> {
  const limit = Math.min(options.limit || 50, 100)
  const offset = ((options.page || 1) - 1) * limit

  const result = await sql`
    SELECT
      ual.id, ual.user_id, ual.tenant_id,
      o.name as tenant_name,
      ual.action, ual.resource_type, ual.resource_id,
      ual.metadata, ual.ip_address, ual.created_at
    FROM user_activity_log ual
    LEFT JOIN organizations o ON o.id = ual.tenant_id
    WHERE ual.user_id = ${userId}
    ORDER BY ual.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      userId: r.user_id as string,
      tenantId: (r.tenant_id as string) || null,
      tenantName: (r.tenant_name as string) || null,
      action: r.action as string,
      resourceType: (r.resource_type as string) || null,
      resourceId: (r.resource_id as string) || null,
      metadata: (r.metadata as Record<string, unknown>) || {},
      ipAddress: (r.ip_address as string) || null,
      createdAt: new Date(r.created_at as string),
    }
  })
}

/**
 * Log user activity
 *
 * @param entry - Activity log entry data
 */
export async function logUserActivity(entry: {
  userId: string
  tenantId?: string | null
  action: string
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<void> {
  await sql`
    INSERT INTO user_activity_log (
      user_id, tenant_id, action, resource_type, resource_id,
      metadata, ip_address, user_agent
    )
    VALUES (
      ${entry.userId},
      ${entry.tenantId || null},
      ${entry.action},
      ${entry.resourceType || null},
      ${entry.resourceId || null},
      ${JSON.stringify(entry.metadata || {})}::jsonb,
      ${entry.ipAddress || null},
      ${entry.userAgent || null}
    )
  `
}

/**
 * Disable a user account
 *
 * Immediately invalidates all sessions for the user.
 *
 * @param userId - User ID to disable
 * @param reason - Reason for disabling
 * @param disabledBy - Super admin who disabled the user
 */
export async function disableUser(
  userId: string,
  reason: string,
  disabledBy: string
): Promise<void> {
  // Check if user is the last super admin
  const superAdminCount = await sql`
    SELECT COUNT(*) as count FROM super_admin_users WHERE is_active = TRUE
  `
  const count = Number((superAdminCount.rows[0] as Record<string, unknown>).count || 0)

  const isSuperAdminResult = await sql`
    SELECT user_id FROM super_admin_users
    WHERE user_id = ${userId} AND is_active = TRUE
  `

  if (isSuperAdminResult.rows.length > 0 && count <= 1) {
    throw new Error('Cannot disable the last super admin')
  }

  // Update user status
  await sql`
    UPDATE users
    SET
      status = 'disabled',
      disabled_at = NOW(),
      disabled_by = ${disabledBy},
      disabled_reason = ${reason}
    WHERE id = ${userId}
  `

  // Revoke all regular sessions
  await revokeAllSessions(userId)

  // If super admin, also revoke super admin sessions
  if (isSuperAdminResult.rows.length > 0) {
    await revokeAllSuperAdminSessions(userId, 'account_disabled')
  }

  // Log the action to super admin audit log
  await logAuditAction({
    userId: disabledBy,
    action: 'edit_user',
    resourceType: 'user',
    resourceId: userId,
    metadata: { action: 'disable', reason },
  })

  // Log to user activity
  await logUserActivity({
    userId,
    action: 'user.disabled',
    metadata: { reason, disabledBy },
  })
}

/**
 * Enable a previously disabled user account
 *
 * @param userId - User ID to enable
 * @param enabledBy - Super admin who enabled the user
 */
export async function enableUser(userId: string, enabledBy: string): Promise<void> {
  await sql`
    UPDATE users
    SET
      status = 'active',
      disabled_at = NULL,
      disabled_by = NULL,
      disabled_reason = NULL
    WHERE id = ${userId}
  `

  // Log the action to super admin audit log
  await logAuditAction({
    userId: enabledBy,
    action: 'edit_user',
    resourceType: 'user',
    resourceId: userId,
    metadata: { action: 'enable' },
  })

  // Log to user activity
  await logUserActivity({
    userId,
    action: 'user.enabled',
    metadata: { enabledBy },
  })
}

/**
 * Grant super admin access to a user
 *
 * @param userId - User ID to grant access to
 * @param grantedBy - Super admin granting access
 * @param notes - Optional notes about why access was granted
 */
export async function grantSuperAdmin(
  userId: string,
  grantedBy: string,
  notes?: string
): Promise<void> {
  // Verify the granting user has permission to manage super admins
  const granterResult = await sql`
    SELECT can_manage_super_admins FROM super_admin_users
    WHERE user_id = ${grantedBy} AND is_active = TRUE
  `

  if (granterResult.rows.length === 0) {
    throw new Error('Only super admins can grant super admin access')
  }

  const granter = granterResult.rows[0] as Record<string, unknown>
  if (!granter.can_manage_super_admins) {
    throw new Error('You do not have permission to manage super admins')
  }

  // Check if user already has super admin access
  const existingResult = await sql`
    SELECT user_id, is_active FROM super_admin_users WHERE user_id = ${userId}
  `

  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0] as Record<string, unknown>
    if (existing.is_active) {
      throw new Error('User is already a super admin')
    }

    // Reactivate existing super admin
    await sql`
      UPDATE super_admin_users
      SET
        is_active = TRUE,
        granted_at = NOW(),
        granted_by = ${grantedBy},
        notes = ${notes || null},
        deactivated_at = NULL,
        deactivated_by = NULL
      WHERE user_id = ${userId}
    `
  } else {
    // Create new super admin record
    await sql`
      INSERT INTO super_admin_users (user_id, granted_by, notes)
      VALUES (${userId}, ${grantedBy}, ${notes || null})
    `
  }

  // Update user role
  await sql`
    UPDATE users SET role = 'super_admin' WHERE id = ${userId}
  `

  // Log the action
  await logAuditAction({
    userId: grantedBy,
    action: 'grant_super_admin',
    resourceType: 'super_admin',
    resourceId: userId,
    metadata: { notes },
  })

  await logUserActivity({
    userId,
    action: 'super_admin.granted',
    metadata: { grantedBy, notes },
  })
}

/**
 * Revoke super admin access from a user
 *
 * @param userId - User ID to revoke access from
 * @param revokedBy - Super admin revoking access
 */
export async function revokeSuperAdmin(userId: string, revokedBy: string): Promise<void> {
  // Cannot revoke own super admin access
  if (userId === revokedBy) {
    throw new Error('Cannot revoke your own super admin access')
  }

  // Check if this is the last super admin
  const superAdminCount = await sql`
    SELECT COUNT(*) as count FROM super_admin_users WHERE is_active = TRUE
  `
  const count = Number((superAdminCount.rows[0] as Record<string, unknown>).count || 0)

  if (count <= 1) {
    throw new Error('Cannot revoke the last super admin')
  }

  // Verify the revoking user has permission
  const revokerResult = await sql`
    SELECT can_manage_super_admins FROM super_admin_users
    WHERE user_id = ${revokedBy} AND is_active = TRUE
  `

  if (revokerResult.rows.length === 0) {
    throw new Error('Only super admins can revoke super admin access')
  }

  const revoker = revokerResult.rows[0] as Record<string, unknown>
  if (!revoker.can_manage_super_admins) {
    throw new Error('You do not have permission to manage super admins')
  }

  // Deactivate super admin access
  await sql`
    UPDATE super_admin_users
    SET
      is_active = FALSE,
      deactivated_at = NOW(),
      deactivated_by = ${revokedBy}
    WHERE user_id = ${userId}
  `

  // Revoke all super admin sessions
  await revokeAllSuperAdminSessions(userId, 'super_admin_revoked')

  // Update user role back to member (they may still have org-level roles)
  await sql`
    UPDATE users SET role = 'member' WHERE id = ${userId}
  `

  // Log the action
  await logAuditAction({
    userId: revokedBy,
    action: 'revoke_super_admin',
    resourceType: 'super_admin',
    resourceId: userId,
  })

  await logUserActivity({
    userId,
    action: 'super_admin.revoked',
    metadata: { revokedBy },
  })
}

/**
 * Get super admin registry
 *
 * @returns All super admin users with their details
 */
export async function getSuperAdminRegistry(): Promise<
  Array<{
    userId: string
    email: string
    name: string | null
    avatarUrl: string | null
    grantedAt: Date
    grantedByUserId: string | null
    grantedByName: string | null
    canAccessAllTenants: boolean
    canImpersonate: boolean
    canManageSuperAdmins: boolean
    mfaEnabled: boolean
    lastAccessAt: Date | null
  }>
> {
  const result = await sql`
    SELECT
      sau.user_id,
      u.email,
      u.name,
      u.avatar_url,
      sau.granted_at,
      sau.granted_by as granted_by_user_id,
      granter.name as granted_by_name,
      sau.can_access_all_tenants,
      sau.can_impersonate,
      sau.can_manage_super_admins,
      sau.mfa_enabled,
      sau.last_access_at
    FROM super_admin_users sau
    JOIN users u ON u.id = sau.user_id
    LEFT JOIN users granter ON granter.id = sau.granted_by
    WHERE sau.is_active = TRUE
    ORDER BY sau.granted_at DESC
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      userId: r.user_id as string,
      email: r.email as string,
      name: (r.name as string) || null,
      avatarUrl: (r.avatar_url as string) || null,
      grantedAt: new Date(r.granted_at as string),
      grantedByUserId: (r.granted_by_user_id as string) || null,
      grantedByName: (r.granted_by_name as string) || null,
      canAccessAllTenants: r.can_access_all_tenants as boolean,
      canImpersonate: r.can_impersonate as boolean,
      canManageSuperAdmins: r.can_manage_super_admins as boolean,
      mfaEnabled: r.mfa_enabled as boolean,
      lastAccessAt: r.last_access_at ? new Date(r.last_access_at as string) : null,
    }
  })
}
