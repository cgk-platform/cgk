/**
 * Creator session management
 *
 * Handles session creation, validation, and revocation for creators.
 * Sessions are stored in public.creator_sessions table.
 */

import { createHash, randomBytes } from 'crypto'

import { sql } from '@cgk/db'

import type { CreatorSession } from '../types'

const SESSION_TOKEN_LENGTH = 32
const SESSION_EXPIRATION_DAYS = 30

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return randomBytes(SESSION_TOKEN_LENGTH).toString('hex')
}

/**
 * Parse device info from user agent string
 */
function parseDeviceInfo(userAgent: string | null): { deviceInfo: string; deviceType: string } {
  if (!userAgent) {
    return { deviceInfo: 'Unknown Device', deviceType: 'unknown' }
  }

  // Simple parsing - can be enhanced with a proper UA parser
  let browser = 'Unknown Browser'
  let os = 'Unknown OS'
  let deviceType = 'desktop'

  // Detect browser
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox'
  } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari'
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge'
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    os = 'Windows'
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS'
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
    deviceType = 'mobile'
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS'
    deviceType = userAgent.includes('iPad') ? 'tablet' : 'mobile'
  }

  // Check for mobile indicators
  if (userAgent.includes('Mobile') && deviceType === 'desktop') {
    deviceType = 'mobile'
  } else if (userAgent.includes('Tablet')) {
    deviceType = 'tablet'
  }

  return {
    deviceInfo: `${browser} on ${os}`,
    deviceType,
  }
}

/**
 * Map database row to CreatorSession object
 */
function mapRowToSession(row: Record<string, unknown>): CreatorSession {
  return {
    id: row.id as string,
    creatorId: row.creator_id as string,
    tokenHash: row.token_hash as string,
    deviceInfo: (row.device_info as string) || null,
    deviceType: (row.device_type as string) || null,
    ipAddress: (row.ip_address as string) || null,
    userAgent: (row.user_agent as string) || null,
    expiresAt: new Date(row.expires_at as string),
    lastActiveAt: new Date(row.last_active_at as string),
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Create a new session for a creator
 *
 * @param creatorId - Creator ID to create session for
 * @param req - Request object to extract IP and user agent
 * @returns Session object and raw token (only returned on create)
 */
export async function createCreatorSession(
  creatorId: string,
  req?: Request
): Promise<{ session: CreatorSession; token: string }> {
  const token = generateToken()
  const tokenHash = hashToken(token)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS)

  const ipAddress =
    req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req?.headers.get('x-real-ip') ||
    null

  const userAgent = req?.headers.get('user-agent') || null
  const { deviceInfo, deviceType } = parseDeviceInfo(userAgent)

  const result = await sql`
    INSERT INTO creator_sessions (
      creator_id, token_hash, device_info, device_type,
      ip_address, user_agent, expires_at
    )
    VALUES (
      ${creatorId}, ${tokenHash}, ${deviceInfo}, ${deviceType},
      ${ipAddress}, ${userAgent}, ${expiresAt.toISOString()}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create creator session')
  }

  const session = mapRowToSession(row as Record<string, unknown>)
  return { session, token }
}

/**
 * Validate a creator session token
 *
 * @param token - Raw session token to validate
 * @returns Session if valid and not revoked, null otherwise
 */
export async function validateCreatorSession(token: string): Promise<CreatorSession | null> {
  const tokenHash = hashToken(token)

  const result = await sql`
    SELECT * FROM creator_sessions
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
 * Validate a creator session by session ID (used after JWT verification)
 *
 * @param sessionId - Session ID to validate
 * @returns Session if valid and not revoked, null otherwise
 */
export async function validateCreatorSessionById(
  sessionId: string
): Promise<CreatorSession | null> {
  const result = await sql`
    SELECT * FROM creator_sessions
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
 * Revoke a specific creator session
 *
 * @param sessionId - Session ID to revoke
 */
export async function revokeCreatorSession(sessionId: string): Promise<void> {
  await sql`
    UPDATE creator_sessions
    SET revoked_at = NOW()
    WHERE id = ${sessionId}
  `
}

/**
 * Revoke all sessions for a creator (logout everywhere)
 *
 * @param creatorId - Creator ID to revoke all sessions for
 */
export async function revokeAllCreatorSessions(creatorId: string): Promise<void> {
  await sql`
    UPDATE creator_sessions
    SET revoked_at = NOW()
    WHERE creator_id = ${creatorId}
      AND revoked_at IS NULL
  `
}

/**
 * Revoke all sessions except the current one
 *
 * @param creatorId - Creator ID
 * @param currentSessionId - Session ID to keep active
 */
export async function revokeOtherCreatorSessions(
  creatorId: string,
  currentSessionId: string
): Promise<number> {
  const result = await sql`
    UPDATE creator_sessions
    SET revoked_at = NOW()
    WHERE creator_id = ${creatorId}
      AND id != ${currentSessionId}
      AND revoked_at IS NULL
  `
  return result.rowCount ?? 0
}

/**
 * Get all active sessions for a creator
 *
 * @param creatorId - Creator ID to get sessions for
 * @param currentSessionId - Current session ID to mark
 * @returns Array of active sessions
 */
export async function getCreatorSessions(
  creatorId: string,
  currentSessionId?: string
): Promise<CreatorSession[]> {
  const result = await sql`
    SELECT * FROM creator_sessions
    WHERE creator_id = ${creatorId}
      AND expires_at > NOW()
      AND revoked_at IS NULL
    ORDER BY last_active_at DESC
  `

  return result.rows.map((row) => {
    const session = mapRowToSession(row as Record<string, unknown>)
    if (currentSessionId && session.id === currentSessionId) {
      session.isCurrent = true
    }
    return session
  })
}

/**
 * Update session last active timestamp
 *
 * @param sessionId - Session ID to update
 */
export async function updateCreatorSessionActivity(sessionId: string): Promise<void> {
  await sql`
    UPDATE creator_sessions
    SET last_active_at = NOW()
    WHERE id = ${sessionId}
  `
}

/**
 * Clean up expired sessions (call periodically)
 */
export async function cleanupExpiredCreatorSessions(): Promise<number> {
  const result = await sql`
    DELETE FROM creator_sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
    OR revoked_at < NOW() - INTERVAL '7 days'
  `
  return result.rowCount ?? 0
}
