/**
 * Contractor authentication middleware
 *
 * Validates JWT tokens and session state for protected routes.
 */

import type { ContractorJWTPayload } from '../types'
import { getAuthCookie } from './cookies'
import { verifyContractorJWT } from './jwt'
import { validateContractorSessionById } from './session'

/**
 * Authentication context returned by middleware
 */
export interface ContractorAuthContext {
  contractorId: string
  sessionId: string
  email: string
  name: string
  tenantId: string
  tenantSlug: string
}

/**
 * Get contractor auth context from request
 *
 * @param req - Request object
 * @returns Auth context if valid, null otherwise
 */
export async function getContractorAuthContext(
  req: Request
): Promise<ContractorAuthContext | null> {
  const token = getAuthCookie(req)
  if (!token) {
    return null
  }

  let payload: ContractorJWTPayload
  try {
    payload = await verifyContractorJWT(token)
  } catch {
    return null
  }

  // Validate session is still active
  const session = await validateContractorSessionById(payload.sid, payload.tenantSlug)
  if (!session) {
    return null
  }

  return {
    contractorId: payload.sub,
    sessionId: payload.sid,
    email: payload.email,
    name: payload.name,
    tenantId: payload.tenantId,
    tenantSlug: payload.tenantSlug,
  }
}

/**
 * Require contractor authentication
 *
 * @param req - Request object
 * @returns Auth context
 * @throws Error if not authenticated
 */
export async function requireContractorAuth(
  req: Request
): Promise<ContractorAuthContext> {
  const context = await getContractorAuthContext(req)
  if (!context) {
    throw new Error('Authentication required')
  }
  return context
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: 'Authentication required' },
    { status: 401 }
  )
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = 'Access denied'): Response {
  return Response.json(
    { error: message },
    { status: 403 }
  )
}
