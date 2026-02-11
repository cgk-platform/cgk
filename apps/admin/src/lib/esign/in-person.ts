/**
 * E-Signature In-Person Signing Data Layer
 *
 * Functions for managing in-person signing sessions.
 */

import { sql, withTenant } from '@cgk/db'
import type { EsignInPersonSession, EsignInPersonSessionStatus } from './types'

/**
 * Generate a random session token
 */
function generateSessionToken(length = 32): string {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  // If we need more characters, generate another UUID
  if (length > 32) {
    return (uuid + crypto.randomUUID().replace(/-/g, '')).slice(0, length)
  }
  return uuid.slice(0, length)
}

const IN_PERSON_SESSION_DURATION_MINUTES = 30

/**
 * Create a new in-person signing session
 */
export async function createInPersonSession(
  tenantSlug: string,
  input: {
    documentId: string
    signerId: string
    startedBy: string
    pin?: string
    deviceInfo?: Record<string, unknown>
  }
): Promise<EsignInPersonSession> {
  const sessionToken = generateSessionToken(32)
  const expiresAt = new Date(Date.now() + IN_PERSON_SESSION_DURATION_MINUTES * 60 * 1000)

  return withTenant(tenantSlug, async () => {
    // Hash PIN if provided
    const pinHash = input.pin ? await hashPin(input.pin) : null

    const result = await sql`
      INSERT INTO esign_in_person_sessions (
        document_id,
        signer_id,
        session_token,
        pin_hash,
        status,
        started_by,
        device_info,
        expires_at
      ) VALUES (
        ${input.documentId},
        ${input.signerId},
        ${sessionToken},
        ${pinHash},
        'active',
        ${input.startedBy},
        ${input.deviceInfo ? JSON.stringify(input.deviceInfo) : null},
        ${expiresAt.toISOString()}
      )
      RETURNING
        id,
        document_id as "documentId",
        signer_id as "signerId",
        session_token as "sessionToken",
        pin_hash as "pinHash",
        status,
        started_by as "startedBy",
        device_info as "deviceInfo",
        started_at as "startedAt",
        completed_at as "completedAt",
        expires_at as "expiresAt"
    `
    return result.rows[0] as unknown as EsignInPersonSession
  })
}

/**
 * Get in-person session by token
 */
export async function getInPersonSessionByToken(
  tenantSlug: string,
  sessionToken: string
): Promise<EsignInPersonSession | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        document_id as "documentId",
        signer_id as "signerId",
        session_token as "sessionToken",
        pin_hash as "pinHash",
        status,
        started_by as "startedBy",
        device_info as "deviceInfo",
        started_at as "startedAt",
        completed_at as "completedAt",
        expires_at as "expiresAt"
      FROM esign_in_person_sessions
      WHERE session_token = ${sessionToken}
    `
    return result.rows.length > 0 ? (result.rows[0] as unknown as EsignInPersonSession) : null
  })
}

/**
 * Get active in-person session for a document
 */
export async function getActiveInPersonSession(
  tenantSlug: string,
  documentId: string
): Promise<EsignInPersonSession | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        document_id as "documentId",
        signer_id as "signerId",
        session_token as "sessionToken",
        pin_hash as "pinHash",
        status,
        started_by as "startedBy",
        device_info as "deviceInfo",
        started_at as "startedAt",
        completed_at as "completedAt",
        expires_at as "expiresAt"
      FROM esign_in_person_sessions
      WHERE document_id = ${documentId}
        AND status = 'active'
        AND expires_at > NOW()
      ORDER BY started_at DESC
      LIMIT 1
    `
    return result.rows.length > 0 ? (result.rows[0] as unknown as EsignInPersonSession) : null
  })
}

/**
 * Complete in-person session
 */
export async function completeInPersonSession(
  tenantSlug: string,
  sessionId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_in_person_sessions
      SET status = 'completed',
          completed_at = NOW()
      WHERE id = ${sessionId}
        AND status = 'active'
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Cancel in-person session
 */
export async function cancelInPersonSession(
  tenantSlug: string,
  sessionId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_in_person_sessions
      SET status = 'cancelled'
      WHERE id = ${sessionId}
        AND status = 'active'
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Expire old in-person sessions
 */
export async function expireOldSessions(
  tenantSlug: string
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_in_person_sessions
      SET status = 'expired'
      WHERE status = 'active'
        AND expires_at < NOW()
      RETURNING id
    `
    return result.rows.length
  })
}

/**
 * Verify PIN for exiting in-person mode
 */
export async function verifyInPersonPin(
  tenantSlug: string,
  sessionToken: string,
  pin: string
): Promise<boolean> {
  const session = await getInPersonSessionByToken(tenantSlug, sessionToken)
  if (!session || !session.pinHash) {
    return false
  }
  return await verifyPin(pin, session.pinHash)
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  tenantSlug: string,
  sessionId: string,
  status: EsignInPersonSessionStatus
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    let result
    if (status === 'completed') {
      result = await sql`
        UPDATE esign_in_person_sessions
        SET status = ${status},
            completed_at = NOW()
        WHERE id = ${sessionId}
        RETURNING id
      `
    } else {
      result = await sql`
        UPDATE esign_in_person_sessions
        SET status = ${status}
        WHERE id = ${sessionId}
        RETURNING id
      `
    }
    return result.rows.length > 0
  })
}

/**
 * Extend session expiration
 */
export async function extendSessionExpiration(
  tenantSlug: string,
  sessionId: string,
  additionalMinutes = 15
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    let result
    if (additionalMinutes === 15) {
      result = await sql`
        UPDATE esign_in_person_sessions
        SET expires_at = NOW() + INTERVAL '15 minutes'
        WHERE id = ${sessionId}
          AND status = 'active'
        RETURNING id
      `
    } else if (additionalMinutes === 30) {
      result = await sql`
        UPDATE esign_in_person_sessions
        SET expires_at = NOW() + INTERVAL '30 minutes'
        WHERE id = ${sessionId}
          AND status = 'active'
        RETURNING id
      `
    } else {
      // For custom intervals, calculate the new expiration time
      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000)
      result = await sql`
        UPDATE esign_in_person_sessions
        SET expires_at = ${newExpiresAt.toISOString()}
        WHERE id = ${sessionId}
          AND status = 'active'
        RETURNING id
      `
    }
    return result.rows.length > 0
  })
}

// Simple PIN hashing (in production, use bcrypt)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'cgk_esign_pin_salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const computed = await hashPin(pin)
  return computed === hash
}
