/**
 * Portal Auth Middleware
 *
 * Middleware utilities for protecting portal routes.
 */

import { redirect } from 'next/navigation'
import { getCustomerSession, logout } from './session'
import type { CustomerSessionData } from './types'

/**
 * Require customer authentication
 * Redirects to login if no valid session exists
 */
export async function requireCustomerAuth(): Promise<CustomerSessionData> {
  const session = await getCustomerSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

/**
 * Get optional customer session
 * Returns null if not authenticated (doesn't redirect)
 */
export async function getOptionalCustomerAuth(): Promise<CustomerSessionData | null> {
  return getCustomerSession()
}

/**
 * Ensure user is NOT authenticated
 * Redirects to account if already logged in
 */
export async function requireNoAuth(): Promise<void> {
  const session = await getCustomerSession()

  if (session) {
    redirect('/account')
  }
}

/**
 * Handle sign out action
 */
export async function handleSignOut(): Promise<void> {
  await logout()
  redirect('/login')
}

/**
 * Validate that session tenant matches request tenant
 */
export function validateTenantMatch(
  session: CustomerSessionData,
  requestTenantId: string
): boolean {
  return session.tenantId === requestTenantId
}

export type { CustomerSessionData }
