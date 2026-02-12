/**
 * Customer Session Management
 *
 * Handles customer session storage and retrieval using HTTP-only cookies.
 */

import { cookies } from 'next/headers'
import { sql } from '@cgk/db'
import { encryptToken, decryptToken } from '@cgk/shopify'
import type { CustomerSessionData, CustomerTokens, CustomerFromToken } from './types'
import { refreshCustomerToken } from './oauth'

const SESSION_COOKIE_NAME = 'cgk_customer_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000 // 5 minutes before expiry

/**
 * Create a new customer session
 */
export async function createCustomerSession(
  tenantId: string,
  customer: CustomerFromToken,
  tokens: CustomerTokens
): Promise<string> {
  const sessionId = crypto.randomUUID()
  const expiresAt = Date.now() + tokens.expiresIn * 1000

  // Encrypt tokens for storage
  const encryptedAccessToken = await encryptToken(tokens.accessToken)
  const encryptedRefreshToken = await encryptToken(tokens.refreshToken)

  // Store session in database
  await sql`
    INSERT INTO public.customer_sessions (
      id,
      tenant_id,
      customer_id,
      access_token_encrypted,
      refresh_token_encrypted,
      expires_at,
      customer_email,
      customer_first_name,
      customer_last_name,
      customer_phone,
      created_at,
      last_active_at
    ) VALUES (
      ${sessionId},
      ${tenantId},
      ${customer.id},
      ${encryptedAccessToken},
      ${encryptedRefreshToken},
      ${new Date(expiresAt).toISOString()},
      ${customer.email},
      ${customer.firstName},
      ${customer.lastName},
      ${customer.phone},
      NOW(),
      NOW()
    )
  `

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return sessionId
}

/**
 * Get current customer session
 * Automatically refreshes tokens if they're about to expire
 */
export async function getCustomerSession(): Promise<CustomerSessionData | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionId) {
    return null
  }

  const result = await sql<{
    id: string
    tenant_id: string
    customer_id: string
    access_token_encrypted: string
    refresh_token_encrypted: string
    expires_at: string
    customer_email: string
    customer_first_name: string | null
    customer_last_name: string | null
    customer_phone: string | null
  }>`
    SELECT
      id, tenant_id, customer_id,
      access_token_encrypted, refresh_token_encrypted,
      expires_at, customer_email, customer_first_name,
      customer_last_name, customer_phone
    FROM public.customer_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `

  const row = result.rows[0]
  if (!row) {
    // Session not found, clear cookie
    await clearSessionCookie()
    return null
  }

  const expiresAt = new Date(row.expires_at).getTime()
  const now = Date.now()

  // Check if tokens need refresh
  if (expiresAt - now < TOKEN_REFRESH_BUFFER) {
    const refreshed = await refreshSession(
      sessionId,
      row.tenant_id,
      row.refresh_token_encrypted
    )
    if (!refreshed) {
      // Refresh failed, session is invalid
      await deleteSession(sessionId)
      await clearSessionCookie()
      return null
    }
    // Use refreshed data
    return refreshed
  }

  // Decrypt access token
  const accessToken = await decryptToken(row.access_token_encrypted)
  const refreshToken = await decryptToken(row.refresh_token_encrypted)

  // Update last active timestamp
  await sql`
    UPDATE public.customer_sessions
    SET last_active_at = NOW()
    WHERE id = ${sessionId}
  `

  return {
    customerId: row.customer_id,
    tenantId: row.tenant_id,
    accessToken,
    refreshToken,
    expiresAt,
    customerInfo: {
      id: row.customer_id,
      email: row.customer_email,
      firstName: row.customer_first_name,
      lastName: row.customer_last_name,
      phone: row.customer_phone,
    },
  }
}

/**
 * Refresh session tokens
 */
async function refreshSession(
  sessionId: string,
  tenantId: string,
  encryptedRefreshToken: string
): Promise<CustomerSessionData | null> {
  try {
    const refreshToken = await decryptToken(encryptedRefreshToken)
    const newTokens = await refreshCustomerToken(tenantId, refreshToken)

    if (!newTokens) {
      return null
    }

    const newExpiresAt = Date.now() + newTokens.expiresIn * 1000
    const newEncryptedAccessToken = await encryptToken(newTokens.accessToken)
    const newEncryptedRefreshToken = await encryptToken(newTokens.refreshToken)

    // Update session in database
    const result = await sql<{
      customer_id: string
      customer_email: string
      customer_first_name: string | null
      customer_last_name: string | null
      customer_phone: string | null
    }>`
      UPDATE public.customer_sessions
      SET
        access_token_encrypted = ${newEncryptedAccessToken},
        refresh_token_encrypted = ${newEncryptedRefreshToken},
        expires_at = ${new Date(newExpiresAt).toISOString()},
        last_active_at = NOW()
      WHERE id = ${sessionId}
      RETURNING customer_id, customer_email, customer_first_name, customer_last_name, customer_phone
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return {
      customerId: row.customer_id,
      tenantId,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newExpiresAt,
      customerInfo: {
        id: row.customer_id,
        email: row.customer_email,
        firstName: row.customer_first_name,
        lastName: row.customer_last_name,
        phone: row.customer_phone,
      },
    }
  } catch (error) {
    console.error('Failed to refresh session:', error)
    return null
  }
}

/**
 * Delete customer session (logout)
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (sessionId) {
    await deleteSession(sessionId)
  }

  await clearSessionCookie()
}

/**
 * Delete session from database
 */
async function deleteSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM public.customer_sessions WHERE id = ${sessionId}`
}

/**
 * Clear session cookie
 */
async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await sql`
    DELETE FROM public.customer_sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
  `
  return result.rowCount ?? 0
}

/**
 * Check if user has an active session
 */
export async function hasActiveSession(): Promise<boolean> {
  const session = await getCustomerSession()
  return session !== null
}
