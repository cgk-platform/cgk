import { nanoid } from 'nanoid'

import { sql } from '@cgk-platform/db'

import { sha256 } from './crypto'
import type { Session, SessionCreateResult } from './types'

const SESSION_TOKEN_LENGTH = 32
const SESSION_EXPIRATION_DAYS = 30

/**
 * Map database row to Session object
 */
function mapRowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    organizationId: (row.organization_id as string) || null,
    tokenHash: row.token_hash as string,
    expiresAt: new Date(row.expires_at as string),
    ipAddress: (row.ip_address as string) || null,
    userAgent: (row.user_agent as string) || null,
    createdAt: new Date(row.created_at as string),
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
  }
}

/**
 * Create a new session for a user
 *
 * @param userId - User ID to create session for
 * @param orgId - Organization ID for session context (null for super admin)
 * @param req - Request object to extract IP and user agent
 * @returns Session object and raw token (only returned on create)
 */
export async function createSession(
  userId: string,
  orgId: string | null,
  req?: Request
): Promise<SessionCreateResult> {
  const token = nanoid(SESSION_TOKEN_LENGTH)
  const tokenHash = await sha256(token)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS)

  const ipAddress = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req?.headers.get('x-real-ip') ||
    null
  const userAgent = req?.headers.get('user-agent') || null

  const result = await sql`
    INSERT INTO public.sessions (user_id, organization_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (${userId}, ${orgId}, ${tokenHash}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create session')
  }
  const session = mapRowToSession(row as Record<string, unknown>)

  return { session, token }
}

/**
 * Validate a session token
 *
 * @param token - Raw session token to validate
 * @returns Session if valid and not revoked, null otherwise
 */
export async function validateSession(token: string): Promise<Session | null> {
  const tokenHash = await sha256(token)

  const result = await sql`
    SELECT * FROM public.sessions
    WHERE token_hash = ${tokenHash}
      AND expires_at > NOW()
      AND revoked_at IS NULL
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToSession(row as Record<string, unknown>)
}

/**
 * Validate a session by session ID (used by middleware after JWT verification)
 *
 * @param sessionId - Session ID to validate
 * @returns Session if valid and not revoked, null otherwise
 */
export async function validateSessionById(sessionId: string): Promise<Session | null> {
  const result = await sql`
    SELECT * FROM public.sessions
    WHERE id = ${sessionId}
      AND expires_at > NOW()
      AND revoked_at IS NULL
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToSession(row as Record<string, unknown>)
}

/**
 * Revoke a session (logout)
 *
 * @param sessionId - Session ID to revoke
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await sql`
    UPDATE public.sessions
    SET revoked_at = NOW()
    WHERE id = ${sessionId}
  `
}

/**
 * Revoke all sessions for a user (logout everywhere)
 *
 * @param userId - User ID to revoke all sessions for
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await sql`
    UPDATE public.sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
  `
}

/**
 * Get all active sessions for a user
 *
 * @param userId - User ID to get sessions for
 * @returns Array of active sessions
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const result = await sql`
    SELECT * FROM public.sessions
    WHERE user_id = ${userId}
      AND expires_at > NOW()
      AND revoked_at IS NULL
    ORDER BY created_at DESC
  `

  return result.rows.map((row) => mapRowToSession(row as Record<string, unknown>))
}

/**
 * Update session organization context (for tenant switching)
 *
 * @param sessionId - Session ID to update
 * @param orgId - New organization ID
 */
export async function updateSessionOrganization(
  sessionId: string,
  orgId: string | null
): Promise<void> {
  await sql`
    UPDATE public.sessions
    SET organization_id = ${orgId}
    WHERE id = ${sessionId}
  `
}
