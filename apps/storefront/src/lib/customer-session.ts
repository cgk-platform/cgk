/**
 * Customer Session Management
 *
 * Handles customer authentication for the storefront.
 * Customer sessions are stored via cookies (cgk_session_id).
 */

import { cookies } from 'next/headers'
import { sql, withTenant } from '@cgk-platform/db'
import { getTenantConfig } from './tenant'

/**
 * Cookie name for customer session
 */
const SESSION_COOKIE = 'cgk_session_id'

/**
 * Customer session data
 */
export interface CustomerSession {
  customerId: string
  email: string
  firstName: string | null
  lastName: string | null
  tenantId: string
}

/**
 * Parse session ID from request cookies (server-side)
 */
export function parseSessionIdFromHeaders(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const sessionCookies = cookieHeader.split(';')
  for (const cookie of sessionCookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === SESSION_COOKIE && value) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Get current customer session from cookies
 * Returns null if no valid session
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const tenantConfig = await getTenantConfig()
  if (!tenantConfig) {
    return null
  }

  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value

  if (!sessionId) {
    return null
  }

  try {
    // Look up session in database
    const result = await withTenant(tenantConfig.slug, async () => {
      return sql<{
        customer_id: string
        email: string
        first_name: string | null
        last_name: string | null
        expires_at: Date
      }>`
        SELECT
          cs.customer_id,
          c.email,
          c.first_name,
          c.last_name,
          cs.expires_at
        FROM customer_sessions cs
        JOIN customers c ON c.id = cs.customer_id
        WHERE cs.session_token = ${sessionId}
          AND cs.expires_at > NOW()
        LIMIT 1
      `
    })

    const session = result.rows[0]
    if (!session) {
      return null
    }

    return {
      customerId: session.customer_id,
      email: session.email,
      firstName: session.first_name,
      lastName: session.last_name,
      tenantId: tenantConfig.id,
    }
  } catch (error) {
    // Table might not exist yet, return null gracefully
    console.error('Failed to get customer session:', error)
    return null
  }
}

/**
 * Require customer session - throws if not authenticated
 */
export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession()

  if (!session) {
    throw new Error('Customer authentication required')
  }

  return session
}

/**
 * Get customer context (session + tenant)
 * Returns null for both if either is missing
 */
export async function getCustomerContext(): Promise<{
  session: CustomerSession
  tenantSlug: string
} | null> {
  const tenantConfig = await getTenantConfig()
  if (!tenantConfig) {
    return null
  }

  const session = await getCustomerSession()
  if (!session) {
    return null
  }

  return {
    session,
    tenantSlug: tenantConfig.slug,
  }
}
