/**
 * Creator authentication middleware
 *
 * Validates JWT tokens and provides creator context for API routes.
 */

import type { CreatorJWTPayload, MembershipStatus } from '../types'
import { getTokenFromRequest } from './cookies'
import { verifyCreatorJWT } from './jwt'
import { validateCreatorSessionById } from './session'

/**
 * Creator authentication context
 */
export interface CreatorAuthContext {
  creatorId: string
  email: string
  name: string
  sessionId: string
  memberships: {
    brandId: string
    brandSlug: string
    status: MembershipStatus
  }[]
}

/**
 * Custom error for authentication failures
 */
export class CreatorAuthError extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, code: string = 'UNAUTHORIZED', statusCode: number = 401) {
    super(message)
    this.name = 'CreatorAuthError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * Get creator context from request (does not require auth)
 *
 * @param req - Request object
 * @returns Creator auth context or null if not authenticated
 */
export async function getCreatorContext(req: Request): Promise<CreatorAuthContext | null> {
  const token = getTokenFromRequest(req)
  if (!token) {
    return null
  }

  try {
    const payload = await verifyCreatorJWT(token)

    // Validate session is still active
    const session = await validateCreatorSessionById(payload.sid)
    if (!session) {
      return null
    }

    return {
      creatorId: payload.sub,
      email: payload.email,
      name: payload.name,
      sessionId: payload.sid,
      memberships: payload.memberships,
    }
  } catch {
    return null
  }
}

/**
 * Require creator authentication
 *
 * @param req - Request object
 * @returns Creator auth context
 * @throws CreatorAuthError if not authenticated
 */
export async function requireCreatorAuth(req: Request): Promise<CreatorAuthContext> {
  const token = getTokenFromRequest(req)

  if (!token) {
    throw new CreatorAuthError('Authentication required', 'NO_TOKEN', 401)
  }

  let payload: CreatorJWTPayload

  try {
    payload = await verifyCreatorJWT(token)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token'
    throw new CreatorAuthError(message, 'INVALID_TOKEN', 401)
  }

  // Validate session is still active
  const session = await validateCreatorSessionById(payload.sid)
  if (!session) {
    throw new CreatorAuthError('Session expired or revoked', 'SESSION_INVALID', 401)
  }

  return {
    creatorId: payload.sub,
    email: payload.email,
    name: payload.name,
    sessionId: payload.sid,
    memberships: payload.memberships,
  }
}

/**
 * Check if creator has access to a specific brand
 *
 * @param context - Creator auth context
 * @param brandId - Brand ID to check access for
 * @returns True if creator has active membership
 */
export function hasBrandAccess(context: CreatorAuthContext, brandId: string): boolean {
  return context.memberships.some(
    (m) => m.brandId === brandId && m.status === 'active'
  )
}

/**
 * Require access to a specific brand
 *
 * @param context - Creator auth context
 * @param brandId - Brand ID to require access for
 * @throws CreatorAuthError if no access
 */
export function requireBrandAccess(context: CreatorAuthContext, brandId: string): void {
  if (!hasBrandAccess(context, brandId)) {
    throw new CreatorAuthError(
      'You do not have access to this brand',
      'BRAND_ACCESS_DENIED',
      403
    )
  }
}

/**
 * Get brand IDs the creator has access to
 */
export function getAccessibleBrandIds(context: CreatorAuthContext): string[] {
  return context.memberships
    .filter((m) => m.status === 'active')
    .map((m) => m.brandId)
}

/**
 * Create error response for auth failures
 */
export function authErrorResponse(error: CreatorAuthError): Response {
  return Response.json(
    { error: error.message, code: error.code },
    { status: error.statusCode }
  )
}

/**
 * Wrapper for protected API routes
 */
export async function withCreatorAuth<T>(
  req: Request,
  handler: (context: CreatorAuthContext) => Promise<T>
): Promise<Response> {
  try {
    const context = await requireCreatorAuth(req)
    const result = await handler(context)
    return Response.json(result)
  } catch (error) {
    if (error instanceof CreatorAuthError) {
      return authErrorResponse(error)
    }
    console.error('API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
