import { sql } from '@cgk-platform/db'

import { getAuthCookie } from './cookies'
import { verifyJWT } from './jwt'
import { validateSessionById } from './session'
import type { AuthContext, OrgContext, User, UserRole } from './types'

/**
 * Get tenant context from request
 *
 * Extracts tenant ID and user ID from:
 * 1. x-tenant-id and x-user-id headers (set by middleware)
 * 2. JWT in auth cookie
 * 3. Subdomain
 *
 * @ai-pattern tenant-context
 * @ai-required Call this at the start of every API route
 */
export async function getTenantContext(
  req: Request
): Promise<{ tenantId: string | null; userId: string | null }> {
  // Check headers first (set by middleware)
  const headerTenantId = req.headers.get('x-tenant-id')
  const headerUserId = req.headers.get('x-user-id')

  if (headerTenantId || headerUserId) {
    return {
      tenantId: headerTenantId,
      userId: headerUserId,
    }
  }

  // Try to extract from JWT
  const token = getAuthCookie(req)
  if (token) {
    try {
      const payload = await verifyJWT(token)
      return {
        tenantId: payload.orgId || null,
        userId: payload.sub,
      }
    } catch {
      // Invalid JWT, continue to fallback
    }
  }

  // Fallback to subdomain extraction
  const tenantId = extractTenantFromSubdomain(req)

  return { tenantId, userId: null }
}

/**
 * Require authentication - throws if not authenticated
 *
 * @ai-pattern require-auth
 * @ai-required Use when route requires authenticated user
 */
export async function requireAuth(req: Request): Promise<AuthContext> {
  // Check headers first (set by middleware)
  const headerUserId = req.headers.get('x-user-id')
  const headerSessionId = req.headers.get('x-session-id')

  if (headerUserId && headerSessionId) {
    // Headers are set, fetch full context from database
    return getAuthContextFromHeaders(req)
  }

  // Try to extract from JWT
  const token = getAuthCookie(req)
  if (!token) {
    throw new AuthenticationError('Authentication required')
  }

  try {
    const payload = await verifyJWT(token)

    // Validate session still exists and is not revoked
    const session = await validateSessionById(payload.sid)
    if (!session) {
      throw new AuthenticationError('Session expired or revoked')
    }

    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sid,
      tenantId: payload.orgId || null,
      tenantSlug: payload.org || null,
      role: payload.role,
      orgs: payload.orgs,
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    throw new AuthenticationError('Invalid authentication token')
  }
}

/**
 * Get full auth context from headers (set by middleware)
 */
async function getAuthContextFromHeaders(req: Request): Promise<AuthContext> {
  const userId = req.headers.get('x-user-id')
  const sessionId = req.headers.get('x-session-id')
  const tenantId = req.headers.get('x-tenant-id')
  const tenantSlug = req.headers.get('x-tenant-slug')
  const role = req.headers.get('x-user-role') as UserRole

  if (!userId || !sessionId) {
    throw new AuthenticationError('Authentication required')
  }

  // Fetch user and orgs from database
  const userResult = await sql`
    SELECT id, email, role FROM public.users WHERE id = ${userId}
  `

  if (userResult.rows.length === 0) {
    throw new AuthenticationError('User not found')
  }

  const user = userResult.rows[0] as { id: string; email: string; role: UserRole }

  // Get user's organizations
  const orgsResult = await sql`
    SELECT uo.role, o.id, o.slug
    FROM public.user_organizations uo
    JOIN public.organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
  `

  const orgs: OrgContext[] = orgsResult.rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    role: row.role as UserRole,
  }))

  return {
    userId,
    email: user.email,
    sessionId,
    tenantId: tenantId || null,
    tenantSlug: tenantSlug || null,
    role: role || user.role,
    orgs,
  }
}

/**
 * Extract tenant slug from subdomain
 */
function extractTenantFromSubdomain(req: Request): string | null {
  try {
    const url = new URL(req.url)
    const parts = url.hostname.split('.')
    // Check for subdomain (e.g., rawdog.cgk.dev)
    if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
      return parts[0]
    }
  } catch {
    // Invalid URL
  }
  return null
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql`
    SELECT
      id, email, name, role, status,
      email_verified as "emailVerified",
      password_hash as "passwordHash",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM public.users
    WHERE email = ${email.toLowerCase()}
  `

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0] as User
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await sql`
    SELECT
      id, email, name, role, status,
      email_verified as "emailVerified",
      password_hash as "passwordHash",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM public.users
    WHERE id = ${userId}
  `

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0] as User
}

/**
 * Get user's organization memberships
 */
export async function getUserOrganizations(userId: string): Promise<OrgContext[]> {
  const result = await sql`
    SELECT uo.role, o.id, o.slug
    FROM public.user_organizations uo
    JOIN public.organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
  `

  return result.rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    role: row.role as UserRole,
  }))
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string
  name?: string
  role?: UserRole
  passwordHash?: string
}): Promise<User> {
  const result = await sql`
    INSERT INTO public.users (email, name, role, password_hash)
    VALUES (
      ${data.email.toLowerCase()},
      ${data.name || null},
      ${data.role || 'member'},
      ${data.passwordHash || null}
    )
    RETURNING
      id, email, name, role, status,
      email_verified as "emailVerified",
      password_hash as "passwordHash",
      last_login_at as "lastLoginAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create user')
  }
  return row as User
}

/**
 * Add user to organization
 */
export async function addUserToOrganization(
  userId: string,
  organizationId: string,
  role: UserRole = 'member'
): Promise<void> {
  await sql`
    INSERT INTO public.user_organizations (user_id, organization_id, role)
    VALUES (${userId}, ${organizationId}, ${role})
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = ${role}
  `
}

/**
 * Update user's last login time
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  await sql`
    UPDATE public.users
    SET last_login_at = NOW(), email_verified = TRUE
    WHERE id = ${userId}
  `
}

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}
