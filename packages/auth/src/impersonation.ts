/**
 * User Impersonation System
 *
 * Provides secure impersonation capabilities for super admins to access
 * tenant admin views with full audit trail and session limits.
 *
 * SECURITY CONSTRAINTS:
 * - Impersonation REQUIRES a reason (cannot be empty)
 * - Sessions expire after 1 hour (hard limit, no extension)
 * - All impersonated actions include `impersonator` in audit log
 * - Email notification sent to target user
 * - Cannot impersonate another super admin
 */

import * as jose from 'jose'

import { sql } from '@cgk/db'

import { generateSecureToken } from './crypto'
import { logAuditAction, getSuperAdminUser, isSuperAdmin } from './super-admin'
import type { OrgContext, UserRole } from './types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
)

// Impersonation session limit: 1 hour (no extension allowed)
const IMPERSONATION_EXPIRATION_HOURS = 1
const IMPERSONATION_TOKEN_LENGTH = 48

/**
 * Impersonation session record
 */
export interface ImpersonationSession {
  id: string
  superAdminId: string
  targetUserId: string
  targetTenantId: string
  reason: string
  createdAt: Date
  expiresAt: Date
  endedAt: Date | null
  endReason: string | null
  ipAddress: string | null
  userAgent: string | null
}

/**
 * Impersonation JWT payload (extends regular JWT)
 */
export interface ImpersonationJWTPayload {
  sub: string           // targetUserId (the user being impersonated)
  sid: string           // impersonation session ID
  email: string         // target user email
  org: string           // target org slug
  orgId: string         // target org ID
  role: UserRole        // target user's role in the org
  orgs: OrgContext[]    // target user's accessible orgs
  impersonator: {
    userId: string
    email: string
    sessionId: string   // original super admin session ID
  }
  iat: number
  exp: number
}

/**
 * Result of creating an impersonation session
 */
export interface ImpersonationResult {
  session: ImpersonationSession
  token: string         // JWT for impersonated access
  targetUser: {
    id: string
    email: string
    name: string | null
  }
}

/**
 * Error for impersonation-related failures
 */
export class ImpersonationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'REASON_REQUIRED'
      | 'NOT_SUPER_ADMIN'
      | 'TARGET_NOT_FOUND'
      | 'CANNOT_IMPERSONATE_SUPER_ADMIN'
      | 'SESSION_EXPIRED'
      | 'SESSION_NOT_FOUND'
      | 'NO_TENANT_ACCESS'
  ) {
    super(message)
    this.name = 'ImpersonationError'
  }
}

/**
 * Generate a secure random token (Edge-compatible)
 */
function generateToken(length: number = IMPERSONATION_TOKEN_LENGTH): string {
  return generateSecureToken(length)
}

/**
 * Map database row to ImpersonationSession
 */
function mapRowToSession(row: Record<string, unknown>): ImpersonationSession {
  return {
    id: row.id as string,
    superAdminId: row.super_admin_id as string,
    targetUserId: row.target_user_id as string,
    targetTenantId: row.target_tenant_id as string,
    reason: row.reason as string,
    createdAt: new Date(row.created_at as string),
    expiresAt: new Date(row.expires_at as string),
    endedAt: row.ended_at ? new Date(row.ended_at as string) : null,
    endReason: (row.end_reason as string) || null,
    ipAddress: (row.ip_address as string) || null,
    userAgent: (row.user_agent as string) || null,
  }
}

/**
 * Start an impersonation session
 *
 * Allows a super admin to impersonate a target user in their tenant context.
 *
 * @param superAdminId - ID of the super admin initiating impersonation
 * @param superAdminSessionId - Super admin's current session ID
 * @param targetUserId - ID of the user to impersonate
 * @param targetTenantId - ID of the tenant to access
 * @param reason - Mandatory reason for impersonation
 * @param req - Request object for IP and user agent extraction
 * @returns Impersonation session and JWT token
 * @throws ImpersonationError if validation fails
 */
export async function startImpersonation(
  superAdminId: string,
  superAdminSessionId: string,
  targetUserId: string,
  targetTenantId: string,
  reason: string,
  req?: Request
): Promise<ImpersonationResult> {
  // Validate reason is provided
  const trimmedReason = reason?.trim()
  if (!trimmedReason) {
    throw new ImpersonationError(
      'Reason is required for impersonation',
      'REASON_REQUIRED'
    )
  }

  // Verify super admin has impersonation permissions
  const superAdmin = await getSuperAdminUser(superAdminId)
  if (!superAdmin || !superAdmin.canImpersonate) {
    throw new ImpersonationError(
      'User does not have impersonation privileges',
      'NOT_SUPER_ADMIN'
    )
  }

  // Get super admin email for JWT
  const superAdminUserResult = await sql`
    SELECT email FROM users WHERE id = ${superAdminId}
  `
  const superAdminEmail = (superAdminUserResult.rows[0]?.email as string) || ''

  // Verify target user exists and get their details
  const targetUserResult = await sql`
    SELECT u.id, u.email, u.name
    FROM users u
    WHERE u.id = ${targetUserId}
  `

  if (targetUserResult.rows.length === 0) {
    throw new ImpersonationError('Target user not found', 'TARGET_NOT_FOUND')
  }

  const targetUser = targetUserResult.rows[0] as Record<string, unknown>

  // Cannot impersonate another super admin
  const targetIsSuperAdmin = await isSuperAdmin(targetUserId)
  if (targetIsSuperAdmin) {
    throw new ImpersonationError(
      'Cannot impersonate another super admin',
      'CANNOT_IMPERSONATE_SUPER_ADMIN'
    )
  }

  // Verify target user has access to the specified tenant
  const membershipResult = await sql`
    SELECT om.role, o.slug, o.name
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = ${targetUserId}
      AND om.organization_id = ${targetTenantId}
      AND o.status = 'active'
  `

  if (membershipResult.rows.length === 0) {
    throw new ImpersonationError(
      'Target user does not have access to the specified tenant',
      'NO_TENANT_ACCESS'
    )
  }

  const membership = membershipResult.rows[0] as Record<string, unknown>
  const targetRole = membership.role as UserRole
  const tenantSlug = membership.slug as string

  // Get all orgs the target user has access to
  const allOrgsResult = await sql`
    SELECT o.id, o.slug, om.role
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = ${targetUserId}
      AND o.status = 'active'
  `

  const orgs: OrgContext[] = allOrgsResult.rows.map((row) => ({
    id: (row as Record<string, unknown>).id as string,
    slug: (row as Record<string, unknown>).slug as string,
    role: (row as Record<string, unknown>).role as UserRole,
  }))

  // End any existing impersonation sessions for this super admin
  await sql`
    UPDATE impersonation_sessions
    SET ended_at = NOW(), end_reason = 'new_session_started'
    WHERE super_admin_id = ${superAdminId}
      AND ended_at IS NULL
  `

  // Calculate expiration (1 hour, hard limit)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + IMPERSONATION_EXPIRATION_HOURS)

  // Extract request metadata
  const ipAddress =
    req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req?.headers.get('x-real-ip') ||
    null
  const userAgent = req?.headers.get('user-agent') || null

  // Create impersonation session
  const sessionId = generateToken(16)
  const result = await sql`
    INSERT INTO impersonation_sessions (
      id, super_admin_id, target_user_id, target_tenant_id,
      reason, expires_at, ip_address, user_agent
    )
    VALUES (
      ${sessionId},
      ${superAdminId},
      ${targetUserId},
      ${targetTenantId},
      ${trimmedReason},
      ${expiresAt.toISOString()},
      ${ipAddress},
      ${userAgent}
    )
    RETURNING *
  `

  const session = mapRowToSession(result.rows[0] as Record<string, unknown>)

  // Create impersonation JWT
  const jwtPayload: Omit<ImpersonationJWTPayload, 'iat' | 'exp'> = {
    sub: targetUserId,
    sid: session.id,
    email: targetUser.email as string,
    org: tenantSlug,
    orgId: targetTenantId,
    role: targetRole,
    orgs,
    impersonator: {
      userId: superAdminId,
      email: superAdminEmail,
      sessionId: superAdminSessionId,
    },
  }

  const token = await new jose.SignJWT(jwtPayload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${IMPERSONATION_EXPIRATION_HOURS}h`)
    .sign(JWT_SECRET)

  // Log the impersonation action
  await logAuditAction({
    userId: superAdminId,
    action: 'impersonate_user',
    resourceType: 'user',
    resourceId: targetUserId,
    tenantId: targetTenantId,
    ipAddress,
    userAgent,
    metadata: {
      reason: trimmedReason,
      sessionId: session.id,
      targetEmail: targetUser.email,
      expiresAt: expiresAt.toISOString(),
    },
  })

  return {
    session,
    token,
    targetUser: {
      id: targetUserId,
      email: targetUser.email as string,
      name: (targetUser.name as string) || null,
    },
  }
}

/**
 * End an impersonation session
 *
 * @param sessionId - Impersonation session ID to end
 * @param endReason - Reason for ending the session
 * @param superAdminId - Super admin ending the session (for audit)
 */
export async function endImpersonation(
  sessionId: string,
  endReason: string = 'manual_end',
  superAdminId?: string
): Promise<void> {
  const result = await sql`
    UPDATE impersonation_sessions
    SET ended_at = NOW(), end_reason = ${endReason}
    WHERE id = ${sessionId}
      AND ended_at IS NULL
    RETURNING super_admin_id, target_user_id, target_tenant_id
  `

  if (result.rows.length > 0 && superAdminId) {
    const row = result.rows[0] as Record<string, unknown>
    await logAuditAction({
      userId: superAdminId,
      action: 'end_impersonation',
      resourceType: 'user',
      resourceId: row.target_user_id as string,
      tenantId: row.target_tenant_id as string,
      metadata: {
        sessionId,
        endReason,
      },
    })
  }
}

/**
 * Validate an impersonation session
 *
 * @param sessionId - Session ID to validate
 * @returns Session if valid, null otherwise
 */
export async function validateImpersonationSession(
  sessionId: string
): Promise<ImpersonationSession | null> {
  const result = await sql`
    SELECT * FROM impersonation_sessions
    WHERE id = ${sessionId}
      AND expires_at > NOW()
      AND ended_at IS NULL
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToSession(result.rows[0] as Record<string, unknown>)
}

/**
 * Get impersonation session by ID
 *
 * @param sessionId - Session ID
 * @returns Session or null
 */
export async function getImpersonationSession(
  sessionId: string
): Promise<ImpersonationSession | null> {
  const result = await sql`
    SELECT * FROM impersonation_sessions
    WHERE id = ${sessionId}
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToSession(result.rows[0] as Record<string, unknown>)
}

/**
 * Get active impersonation sessions for a super admin
 *
 * @param superAdminId - Super admin user ID
 * @returns Array of active sessions
 */
export async function getActiveImpersonationSessions(
  superAdminId: string
): Promise<ImpersonationSession[]> {
  const result = await sql`
    SELECT * FROM impersonation_sessions
    WHERE super_admin_id = ${superAdminId}
      AND expires_at > NOW()
      AND ended_at IS NULL
    ORDER BY created_at DESC
  `

  return result.rows.map((row) =>
    mapRowToSession(row as Record<string, unknown>)
  )
}

/**
 * Get impersonation history for audit purposes
 *
 * @param options - Query options
 * @returns Array of impersonation sessions
 */
export async function getImpersonationHistory(options: {
  superAdminId?: string
  targetUserId?: string
  targetTenantId?: string
  limit?: number
  offset?: number
}): Promise<ImpersonationSession[]> {
  const limit = options.limit || 100
  const offset = options.offset || 0

  let result

  if (options.superAdminId) {
    result = await sql`
      SELECT * FROM impersonation_sessions
      WHERE super_admin_id = ${options.superAdminId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else if (options.targetUserId) {
    result = await sql`
      SELECT * FROM impersonation_sessions
      WHERE target_user_id = ${options.targetUserId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else if (options.targetTenantId) {
    result = await sql`
      SELECT * FROM impersonation_sessions
      WHERE target_tenant_id = ${options.targetTenantId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else {
    result = await sql`
      SELECT * FROM impersonation_sessions
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }

  return result.rows.map((row) =>
    mapRowToSession(row as Record<string, unknown>)
  )
}

/**
 * Clean up expired impersonation sessions
 *
 * Should be run periodically by a background job.
 *
 * @returns Number of sessions cleaned up
 */
export async function cleanupExpiredImpersonationSessions(): Promise<number> {
  const result = await sql`
    UPDATE impersonation_sessions
    SET ended_at = NOW(), end_reason = 'expired'
    WHERE ended_at IS NULL
      AND expires_at <= NOW()
    RETURNING id
  `

  return result.rows.length
}

/**
 * Verify an impersonation JWT and extract payload
 *
 * @param token - JWT token to verify
 * @returns Payload if valid
 * @throws Error if invalid
 */
export async function verifyImpersonationJWT(
  token: string
): Promise<ImpersonationJWTPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET)
  return payload as unknown as ImpersonationJWTPayload
}

/**
 * Check if a JWT is an impersonation token
 *
 * @param token - JWT token to check
 * @returns True if this is an impersonation token
 */
export function isImpersonationToken(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'impersonator' in payload &&
    typeof (payload as { impersonator: unknown }).impersonator === 'object'
  )
}

/**
 * Get remaining time in an impersonation session
 *
 * @param session - Impersonation session
 * @returns Remaining milliseconds, or 0 if expired
 */
export function getRemainingSessionTime(session: ImpersonationSession): number {
  const now = Date.now()
  const expiresAt = session.expiresAt.getTime()
  return Math.max(0, expiresAt - now)
}

/**
 * Format remaining time as human-readable string
 *
 * @param session - Impersonation session
 * @returns Formatted string like "45 minutes" or "expired"
 */
export function formatRemainingTime(session: ImpersonationSession): string {
  const remaining = getRemainingSessionTime(session)

  if (remaining === 0) {
    return 'expired'
  }

  const minutes = Math.ceil(remaining / 60000)
  if (minutes >= 60) {
    return '1 hour'
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}
