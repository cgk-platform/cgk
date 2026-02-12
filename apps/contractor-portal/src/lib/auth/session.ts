/**
 * Contractor session management
 *
 * Handles session creation, validation, and revocation for contractors.
 * Sessions are stored in tenant schema (contractor_sessions table).
 */

import { createHash, randomBytes } from 'crypto'

import { sql, withTenant } from '@cgk/db'

import type { ContractorSession } from '../types'

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
 * Map database row to ContractorSession object
 */
function mapRowToSession(row: Record<string, unknown>): ContractorSession {
  return {
    id: row.id as string,
    contractorId: row.contractor_id as string,
    tenantId: row.tenant_id as string,
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
 * Create a new session for a contractor
 *
 * @param contractorId - Contractor ID to create session for
 * @param tenantId - Tenant ID for the contractor
 * @param tenantSlug - Tenant slug for schema access
 * @param req - Request object to extract IP and user agent
 * @returns Session object and raw token (only returned on create)
 */
export async function createContractorSession(
  contractorId: string,
  tenantId: string,
  tenantSlug: string,
  req?: Request
): Promise<{ session: ContractorSession; token: string }> {
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

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO contractor_sessions (
        contractor_id, tenant_id, token_hash, device_info, device_type,
        ip_address, user_agent, expires_at
      )
      VALUES (
        ${contractorId}, ${tenantId}, ${tokenHash}, ${deviceInfo}, ${deviceType},
        ${ipAddress}, ${userAgent}, ${expiresAt.toISOString()}
      )
      RETURNING *
    `
  })

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create contractor session')
  }

  const session = mapRowToSession(row as Record<string, unknown>)
  return { session, token }
}

/**
 * Validate a contractor session token
 *
 * @param token - Raw session token to validate
 * @param tenantSlug - Tenant slug for schema access
 * @returns Session if valid and not revoked, null otherwise
 */
export async function validateContractorSession(
  token: string,
  tenantSlug: string
): Promise<ContractorSession | null> {
  const tokenHash = hashToken(token)

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractor_sessions
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND revoked_at IS NULL
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToSession(row as Record<string, unknown>)
}

/**
 * Validate a contractor session by session ID
 *
 * @param sessionId - Session ID to validate
 * @param tenantSlug - Tenant slug for schema access
 * @returns Session if valid and not revoked, null otherwise
 */
export async function validateContractorSessionById(
  sessionId: string,
  tenantSlug: string
): Promise<ContractorSession | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractor_sessions
      WHERE id = ${sessionId}
        AND expires_at > NOW()
        AND revoked_at IS NULL
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToSession(row as Record<string, unknown>)
}

/**
 * Revoke a specific contractor session
 *
 * @param sessionId - Session ID to revoke
 * @param tenantSlug - Tenant slug for schema access
 */
export async function revokeContractorSession(
  sessionId: string,
  tenantSlug: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractor_sessions
      SET revoked_at = NOW()
      WHERE id = ${sessionId}
    `
  })
}

/**
 * Revoke all sessions for a contractor
 *
 * @param contractorId - Contractor ID to revoke all sessions for
 * @param tenantSlug - Tenant slug for schema access
 */
export async function revokeAllContractorSessions(
  contractorId: string,
  tenantSlug: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractor_sessions
      SET revoked_at = NOW()
      WHERE contractor_id = ${contractorId}
        AND revoked_at IS NULL
    `
  })
}

/**
 * Get all active sessions for a contractor
 *
 * @param contractorId - Contractor ID to get sessions for
 * @param tenantSlug - Tenant slug for schema access
 * @param currentSessionId - Current session ID to mark
 * @returns Array of active sessions
 */
export async function getContractorSessions(
  contractorId: string,
  tenantSlug: string,
  currentSessionId?: string
): Promise<ContractorSession[]> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractor_sessions
      WHERE contractor_id = ${contractorId}
        AND expires_at > NOW()
        AND revoked_at IS NULL
      ORDER BY last_active_at DESC
    `
  })

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
 * @param tenantSlug - Tenant slug for schema access
 */
export async function updateContractorSessionActivity(
  sessionId: string,
  tenantSlug: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractor_sessions
      SET last_active_at = NOW()
      WHERE id = ${sessionId}
    `
  })
}
