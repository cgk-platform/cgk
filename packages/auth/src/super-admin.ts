/**
 * Super Admin Access Control
 *
 * Provides authentication and authorization for super admin users.
 * Super admins have platform-level access separate from regular user roles.
 */

import { sql } from '@cgk-platform/db'

import { sha256, generateSecureToken } from './crypto'

/**
 * Super admin role definition with permissions
 */
export interface SuperAdminRole {
  level: 0
  permissions: readonly ['*']
  canAccessAllTenants: boolean
  canImpersonate: boolean
  canManageSuperAdmins: boolean
}

/**
 * Super admin user record from database
 */
export interface SuperAdminUser {
  userId: string
  grantedAt: Date
  grantedBy: string | null
  notes: string | null
  canAccessAllTenants: boolean
  canImpersonate: boolean
  canManageSuperAdmins: boolean
  mfaEnabled: boolean
  mfaVerifiedAt: Date | null
  lastAccessAt: Date | null
  lastAccessIp: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Super admin session record
 */
export interface SuperAdminSession {
  id: string
  userId: string
  tokenHash: string
  mfaVerified: boolean
  mfaVerifiedAt: Date | null
  mfaChallengeExpiresAt: Date | null
  expiresAt: Date
  lastActivityAt: Date
  inactivityTimeoutMinutes: number
  ipAddress: string | null
  userAgent: string | null
  revokedAt: Date | null
  revokeReason: string | null
  createdAt: Date
}

/**
 * Super admin session creation result
 */
export interface SuperAdminSessionResult {
  session: SuperAdminSession
  token: string
}

/**
 * Audit log action types
 */
export type AuditAction =
  | 'login'
  | 'logout'
  | 'mfa_verify'
  | 'mfa_setup'
  | 'view_tenant'
  | 'edit_tenant'
  | 'create_tenant'
  | 'delete_tenant'
  | 'view_user'
  | 'edit_user'
  | 'impersonate_user'
  | 'end_impersonation'
  | 'grant_super_admin'
  | 'revoke_super_admin'
  | 'update_settings'
  | 'view_audit_log'
  | 'api_request'

/**
 * Resource types for audit logging
 */
export type ResourceType =
  | 'session'
  | 'mfa'
  | 'tenant'
  | 'user'
  | 'super_admin'
  | 'settings'
  | 'audit_log'
  | 'api'

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string
  userId: string
  action: AuditAction
  resourceType: ResourceType
  resourceId: string | null
  tenantId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

// Session constants
const SESSION_TOKEN_LENGTH = 48
const SESSION_EXPIRATION_HOURS = 4
const INACTIVITY_TIMEOUT_MINUTES = 30

/**
 * Generate a secure random token (Edge-compatible)
 */
function generateToken(length: number = SESSION_TOKEN_LENGTH): string {
  return generateSecureToken(length)
}

/**
 * Map database row to SuperAdminUser
 */
function mapRowToSuperAdminUser(row: Record<string, unknown>): SuperAdminUser {
  return {
    userId: row.user_id as string,
    grantedAt: new Date(row.granted_at as string),
    grantedBy: (row.granted_by as string) || null,
    notes: (row.notes as string) || null,
    canAccessAllTenants: row.can_access_all_tenants as boolean,
    canImpersonate: row.can_impersonate as boolean,
    canManageSuperAdmins: row.can_manage_super_admins as boolean,
    mfaEnabled: row.mfa_enabled as boolean,
    mfaVerifiedAt: row.mfa_verified_at ? new Date(row.mfa_verified_at as string) : null,
    lastAccessAt: row.last_access_at ? new Date(row.last_access_at as string) : null,
    lastAccessIp: (row.last_access_ip as string) || null,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Map database row to SuperAdminSession
 */
function mapRowToSuperAdminSession(row: Record<string, unknown>): SuperAdminSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tokenHash: row.token_hash as string,
    mfaVerified: row.mfa_verified as boolean,
    mfaVerifiedAt: row.mfa_verified_at ? new Date(row.mfa_verified_at as string) : null,
    mfaChallengeExpiresAt: row.mfa_challenge_expires_at
      ? new Date(row.mfa_challenge_expires_at as string)
      : null,
    expiresAt: new Date(row.expires_at as string),
    lastActivityAt: new Date(row.last_activity_at as string),
    inactivityTimeoutMinutes: row.inactivity_timeout_minutes as number,
    ipAddress: (row.ip_address as string) || null,
    userAgent: (row.user_agent as string) || null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
    revokeReason: (row.revoke_reason as string) || null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Check if a user is a super admin
 *
 * Verifies that the user exists in the super_admin_users table and is active.
 *
 * @param userId - User ID to check
 * @returns True if user is an active super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const result = await sql`
    SELECT user_id FROM public.super_admin_users
    WHERE user_id = ${userId}
      AND is_active = TRUE
  `

  return result.rows.length > 0
}

/**
 * Get super admin user details
 *
 * @param userId - User ID to look up
 * @returns SuperAdminUser if found and active, null otherwise
 */
export async function getSuperAdminUser(userId: string): Promise<SuperAdminUser | null> {
  const result = await sql`
    SELECT * FROM public.super_admin_users
    WHERE user_id = ${userId}
      AND is_active = TRUE
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToSuperAdminUser(result.rows[0] as Record<string, unknown>)
}

/**
 * Get all super admin users
 *
 * @param includeInactive - Whether to include inactive super admins
 * @returns Array of super admin users
 */
export async function getAllSuperAdmins(
  includeInactive: boolean = false
): Promise<SuperAdminUser[]> {
  const result = includeInactive
    ? await sql`
        SELECT sau.*, u.email, u.name
        FROM public.super_admin_users sau
        JOIN public.users u ON u.id = sau.user_id
        ORDER BY sau.granted_at DESC
      `
    : await sql`
        SELECT sau.*, u.email, u.name
        FROM public.super_admin_users sau
        JOIN public.users u ON u.id = sau.user_id
        WHERE sau.is_active = TRUE
        ORDER BY sau.granted_at DESC
      `

  return result.rows.map((row) => mapRowToSuperAdminUser(row as Record<string, unknown>))
}

/**
 * Create a super admin session
 *
 * Enforces single session per user by revoking existing sessions.
 *
 * @param userId - Super admin user ID
 * @param req - Request object for IP and user agent
 * @returns Session object and raw token
 */
export async function createSuperAdminSession(
  userId: string,
  req?: Request
): Promise<SuperAdminSessionResult> {
  // Verify user is a super admin
  const superAdmin = await getSuperAdminUser(userId)
  if (!superAdmin) {
    throw new Error('User is not a super admin')
  }

  // Revoke all existing sessions for this user (single session enforcement)
  await sql`
    UPDATE public.super_admin_sessions
    SET revoked_at = NOW(), revoke_reason = 'new_session_created'
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
  `

  // Generate session token
  const token = generateToken()
  const tokenHash = await sha256(token)

  // Calculate expiration (4 hours)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRATION_HOURS)

  // Extract request metadata
  const ipAddress = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req?.headers.get('x-real-ip') ||
    null
  const userAgent = req?.headers.get('user-agent') || null

  // Create session
  const result = await sql`
    INSERT INTO public.super_admin_sessions (
      user_id, token_hash, expires_at, ip_address, user_agent, inactivity_timeout_minutes
    )
    VALUES (
      ${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent}, ${INACTIVITY_TIMEOUT_MINUTES}
    )
    RETURNING *
  `

  const session = mapRowToSuperAdminSession(result.rows[0] as Record<string, unknown>)

  // Update last access on super admin user
  await sql`
    UPDATE public.super_admin_users
    SET last_access_at = NOW(), last_access_ip = ${ipAddress}
    WHERE user_id = ${userId}
  `

  return { session, token }
}

/**
 * Validate a super admin session
 *
 * Checks token validity, expiration, revocation, and inactivity timeout.
 *
 * @param token - Raw session token
 * @returns Session if valid, null otherwise
 */
export async function validateSuperAdminSession(token: string): Promise<SuperAdminSession | null> {
  const tokenHash = await sha256(token)

  const result = await sql`
    SELECT * FROM public.super_admin_sessions
    WHERE token_hash = ${tokenHash}
      AND expires_at > NOW()
      AND revoked_at IS NULL
  `

  if (result.rows.length === 0) {
    return null
  }

  const session = mapRowToSuperAdminSession(result.rows[0] as Record<string, unknown>)

  // Check inactivity timeout
  const inactivityLimit = new Date()
  inactivityLimit.setMinutes(inactivityLimit.getMinutes() - session.inactivityTimeoutMinutes)

  if (session.lastActivityAt < inactivityLimit) {
    // Session expired due to inactivity
    await sql`
      UPDATE public.super_admin_sessions
      SET revoked_at = NOW(), revoke_reason = 'inactivity_timeout'
      WHERE id = ${session.id}
    `
    return null
  }

  // Update last activity time
  await sql`
    UPDATE public.super_admin_sessions
    SET last_activity_at = NOW()
    WHERE id = ${session.id}
  `

  return session
}

/**
 * Validate a super admin session by ID
 *
 * @param sessionId - Session ID to validate
 * @returns Session if valid, null otherwise
 */
export async function validateSuperAdminSessionById(
  sessionId: string
): Promise<SuperAdminSession | null> {
  const result = await sql`
    SELECT * FROM public.super_admin_sessions
    WHERE id = ${sessionId}
      AND expires_at > NOW()
      AND revoked_at IS NULL
  `

  if (result.rows.length === 0) {
    return null
  }

  const session = mapRowToSuperAdminSession(result.rows[0] as Record<string, unknown>)

  // Check inactivity timeout
  const inactivityLimit = new Date()
  inactivityLimit.setMinutes(inactivityLimit.getMinutes() - session.inactivityTimeoutMinutes)

  if (session.lastActivityAt < inactivityLimit) {
    await sql`
      UPDATE public.super_admin_sessions
      SET revoked_at = NOW(), revoke_reason = 'inactivity_timeout'
      WHERE id = ${session.id}
    `
    return null
  }

  // Update last activity time
  await sql`
    UPDATE public.super_admin_sessions
    SET last_activity_at = NOW()
    WHERE id = ${session.id}
  `

  return session
}

/**
 * Revoke a super admin session
 *
 * @param sessionId - Session ID to revoke
 * @param reason - Reason for revocation
 */
export async function revokeSuperAdminSession(
  sessionId: string,
  reason: string = 'manual_logout'
): Promise<void> {
  await sql`
    UPDATE public.super_admin_sessions
    SET revoked_at = NOW(), revoke_reason = ${reason}
    WHERE id = ${sessionId}
  `
}

/**
 * Revoke all super admin sessions for a user
 *
 * @param userId - User ID to revoke sessions for
 * @param reason - Reason for revocation
 */
export async function revokeAllSuperAdminSessions(
  userId: string,
  reason: string = 'logout_all'
): Promise<void> {
  await sql`
    UPDATE public.super_admin_sessions
    SET revoked_at = NOW(), revoke_reason = ${reason}
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
  `
}

/**
 * Mark MFA as verified for a session
 *
 * @param sessionId - Session ID to update
 */
export async function markMfaVerified(sessionId: string): Promise<void> {
  await sql`
    UPDATE public.super_admin_sessions
    SET mfa_verified = TRUE, mfa_verified_at = NOW()
    WHERE id = ${sessionId}
  `
}

/**
 * Set MFA challenge expiration for a session
 *
 * @param sessionId - Session ID to update
 * @param expiresInMinutes - Minutes until challenge expires (default 5)
 */
export async function setMfaChallengeExpiration(
  sessionId: string,
  expiresInMinutes: number = 5
): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

  await sql`
    UPDATE public.super_admin_sessions
    SET mfa_challenge_expires_at = ${expiresAt.toISOString()}
    WHERE id = ${sessionId}
  `
}

/**
 * Log a super admin action to the audit log
 *
 * @param entry - Audit log entry data
 * @returns Created audit log entry
 */
export async function logAuditAction(entry: {
  userId: string
  action: AuditAction
  resourceType: ResourceType
  resourceId?: string | null
  tenantId?: string | null
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<AuditLogEntry> {
  const result = await sql`
    INSERT INTO public.super_admin_audit_log (
      user_id, action, resource_type, resource_id, tenant_id,
      old_value, new_value, ip_address, user_agent, request_id, metadata
    )
    VALUES (
      ${entry.userId},
      ${entry.action},
      ${entry.resourceType},
      ${entry.resourceId || null},
      ${entry.tenantId || null},
      ${entry.oldValue ? JSON.stringify(entry.oldValue) : null}::jsonb,
      ${entry.newValue ? JSON.stringify(entry.newValue) : null}::jsonb,
      ${entry.ipAddress || null},
      ${entry.userAgent || null},
      ${entry.requestId || null},
      ${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb
    )
    RETURNING *
  `

  const row = result.rows[0] as Record<string, unknown>
  return {
    id: row.id as string,
    userId: row.user_id as string,
    action: row.action as AuditAction,
    resourceType: row.resource_type as ResourceType,
    resourceId: (row.resource_id as string) || null,
    tenantId: (row.tenant_id as string) || null,
    oldValue: row.old_value as Record<string, unknown> | null,
    newValue: row.new_value as Record<string, unknown> | null,
    ipAddress: (row.ip_address as string) || null,
    userAgent: (row.user_agent as string) || null,
    requestId: (row.request_id as string) || null,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Get audit log entries
 *
 * @param options - Query options
 * @returns Array of audit log entries
 */
export async function getAuditLog(options: {
  userId?: string
  tenantId?: string
  action?: AuditAction
  resourceType?: ResourceType
  limit?: number
  offset?: number
}): Promise<AuditLogEntry[]> {
  const limit = options.limit || 100
  const offset = options.offset || 0

  let result

  if (options.userId && options.tenantId) {
    result = await sql`
      SELECT * FROM public.super_admin_audit_log
      WHERE user_id = ${options.userId}
        AND tenant_id = ${options.tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else if (options.userId) {
    result = await sql`
      SELECT * FROM public.super_admin_audit_log
      WHERE user_id = ${options.userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else if (options.tenantId) {
    result = await sql`
      SELECT * FROM public.super_admin_audit_log
      WHERE tenant_id = ${options.tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else if (options.action) {
    result = await sql`
      SELECT * FROM public.super_admin_audit_log
      WHERE action = ${options.action}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else {
    result = await sql`
      SELECT * FROM public.super_admin_audit_log
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      userId: r.user_id as string,
      action: r.action as AuditAction,
      resourceType: r.resource_type as ResourceType,
      resourceId: (r.resource_id as string) || null,
      tenantId: (r.tenant_id as string) || null,
      oldValue: r.old_value as Record<string, unknown> | null,
      newValue: r.new_value as Record<string, unknown> | null,
      ipAddress: (r.ip_address as string) || null,
      userAgent: (r.user_agent as string) || null,
      requestId: (r.request_id as string) || null,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: new Date(r.created_at as string),
    }
  })
}

/**
 * Check rate limit for a user
 *
 * @param userId - User ID to check
 * @param bucket - Rate limit bucket (e.g., 'api', 'sensitive')
 * @param limit - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 * @returns True if request is allowed, false if rate limited
 */
export async function checkRateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  // Get current rate limit record
  const result = await sql`
    SELECT request_count, window_start, window_seconds
    FROM public.super_admin_rate_limits
    WHERE user_id = ${userId} AND bucket = ${bucket}
  `

  const now = new Date()

  if (result.rows.length === 0) {
    // No record, create one
    await sql`
      INSERT INTO public.super_admin_rate_limits (user_id, bucket, request_count, window_start, window_seconds)
      VALUES (${userId}, ${bucket}, 1, ${now.toISOString()}, ${windowSeconds})
    `
    return true
  }

  const row = result.rows[0] as Record<string, unknown>
  const windowStart = new Date(row.window_start as string)
  const currentWindowSeconds = row.window_seconds as number
  const requestCount = row.request_count as number

  // Check if window has expired
  const windowEnd = new Date(windowStart.getTime() + currentWindowSeconds * 1000)
  if (now > windowEnd) {
    // Reset window
    await sql`
      UPDATE public.super_admin_rate_limits
      SET request_count = 1, window_start = ${now.toISOString()}, window_seconds = ${windowSeconds}
      WHERE user_id = ${userId} AND bucket = ${bucket}
    `
    return true
  }

  // Check if under limit
  if (requestCount < limit) {
    // Increment counter
    await sql`
      UPDATE public.super_admin_rate_limits
      SET request_count = request_count + 1
      WHERE user_id = ${userId} AND bucket = ${bucket}
    `
    return true
  }

  // Rate limited
  return false
}

/**
 * Check if an IP is in the allowlist
 *
 * Returns true if no allowlist entries exist (allowlist disabled)
 * or if the IP is in the allowlist.
 *
 * @param ipAddress - IP address to check
 * @returns True if allowed, false if blocked
 */
export async function checkIpAllowlist(ipAddress: string): Promise<boolean> {
  // Check if allowlist has any entries
  const countResult = await sql`
    SELECT COUNT(*) as count FROM public.super_admin_ip_allowlist WHERE is_active = TRUE
  `

  // COUNT(*) returns bigint which becomes string in JS - convert to number
  const countRaw = (countResult.rows[0] as Record<string, unknown>).count
  const count = Number(countRaw)

  if (count === 0) {
    // No allowlist entries, allow all
    return true
  }

  // Check if IP is in allowlist
  const result = await sql`
    SELECT id FROM public.super_admin_ip_allowlist
    WHERE ip_address = ${ipAddress}::inet
      AND is_active = TRUE
  `

  return result.rows.length > 0
}

/**
 * Clean up expired sessions
 *
 * Should be run periodically by a background job.
 *
 * @returns Number of sessions cleaned up
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await sql`
    UPDATE public.super_admin_sessions
    SET revoked_at = NOW(), revoke_reason = 'expired'
    WHERE revoked_at IS NULL
      AND (
        expires_at <= NOW()
        OR last_activity_at <= NOW() - (inactivity_timeout_minutes || ' minutes')::interval
      )
    RETURNING id
  `

  return result.rows.length
}
