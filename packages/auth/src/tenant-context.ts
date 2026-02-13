/**
 * Tenant Context Switching Service
 *
 * Provides functionality for users to switch between their
 * accessible tenants/organizations.
 */

import { sql } from '@cgk-platform/db'

import { signJWT } from './jwt'
import { updateSessionOrganization } from './session'
import { logUserActivity } from './user-admin'
import type { OrgContext, UserRole } from './types'

/**
 * Tenant context for UI display
 */
export interface TenantContext {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  role: UserRole
  isDefault: boolean
  lastActiveAt: Date | null
}

/**
 * Result of switching tenant context
 */
export interface SwitchTenantResult {
  success: boolean
  tenant: TenantContext
  token: string
}

/**
 * Switch current tenant context for a user
 *
 * @param userId - User ID
 * @param targetTenantSlug - Target tenant slug to switch to
 * @param sessionId - Current session ID
 * @param ipAddress - Client IP address for logging
 * @returns New JWT token and tenant context
 */
export async function switchTenantContext(
  userId: string,
  targetTenantSlug: string,
  sessionId: string,
  ipAddress?: string | null
): Promise<SwitchTenantResult> {
  // Validate user has access to target tenant
  const membershipResult = await sql`
    SELECT
      uo.role,
      uo.is_default,
      o.id,
      o.slug,
      o.name,
      o.logo_url,
      o.status
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
      AND o.slug = ${targetTenantSlug}
  `

  if (membershipResult.rows.length === 0) {
    throw new TenantAccessError('User does not have access to this tenant')
  }

  const row = membershipResult.rows[0] as Record<string, unknown>

  // Check tenant is active
  if (row.status !== 'active') {
    throw new TenantAccessError('Cannot switch to suspended or disabled tenant')
  }

  // Get user email for JWT
  const userResult = await sql`
    SELECT email FROM users WHERE id = ${userId}
  `

  if (userResult.rows.length === 0) {
    throw new TenantAccessError('User not found')
  }

  const userEmail = (userResult.rows[0] as Record<string, unknown>).email as string

  // Get all user's organizations for JWT
  const orgsResult = await sql`
    SELECT uo.role, o.id, o.slug
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
      AND o.status = 'active'
  `

  const orgs: OrgContext[] = orgsResult.rows.map((r) => ({
    id: (r as Record<string, unknown>).id as string,
    slug: (r as Record<string, unknown>).slug as string,
    role: (r as Record<string, unknown>).role as UserRole,
  }))

  const tenantId = row.id as string
  const tenantRole = row.role as UserRole

  // Update session organization
  await updateSessionOrganization(sessionId, tenantId)

  // Update last_active_at for membership
  await sql`
    UPDATE user_organizations
    SET last_active_at = NOW()
    WHERE user_id = ${userId}
      AND organization_id = ${tenantId}
  `

  // Create new JWT with updated context
  const token = await signJWT({
    userId,
    sessionId,
    email: userEmail,
    orgSlug: targetTenantSlug,
    orgId: tenantId,
    role: tenantRole,
    orgs,
  })

  // Log tenant switch activity
  await logUserActivity({
    userId,
    tenantId,
    action: 'tenant.switched',
    metadata: { targetTenantSlug },
    ipAddress: ipAddress ?? null,
  })

  const tenant: TenantContext = {
    id: tenantId,
    slug: row.slug as string,
    name: row.name as string,
    logoUrl: (row.logo_url as string) || null,
    role: tenantRole,
    isDefault: Boolean(row.is_default),
    lastActiveAt: null,
  }

  return { success: true, tenant, token }
}

/**
 * Get all accessible tenants for a user
 *
 * @param userId - User ID
 * @returns Array of tenant contexts
 */
export async function getUserTenants(userId: string): Promise<TenantContext[]> {
  const result = await sql`
    SELECT
      o.id,
      o.slug,
      o.name,
      o.logo_url,
      uo.role,
      uo.is_default,
      uo.last_active_at
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
      AND o.status = 'active'
    ORDER BY
      uo.is_default DESC,
      uo.last_active_at DESC NULLS LAST,
      o.name ASC
  `

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      logoUrl: (r.logo_url as string) || null,
      role: r.role as UserRole,
      isDefault: Boolean(r.is_default),
      lastActiveAt: r.last_active_at ? new Date(r.last_active_at as string) : null,
    }
  })
}

/**
 * Set user's default tenant
 *
 * @param userId - User ID
 * @param tenantId - Tenant ID to set as default
 */
export async function setDefaultTenant(userId: string, tenantId: string): Promise<void> {
  // Verify user has access to this tenant
  const membershipResult = await sql`
    SELECT 1 FROM user_organizations
    WHERE user_id = ${userId} AND organization_id = ${tenantId}
  `

  if (membershipResult.rows.length === 0) {
    throw new TenantAccessError('User does not have access to this tenant')
  }

  // Clear any existing default
  await sql`
    UPDATE user_organizations
    SET is_default = FALSE
    WHERE user_id = ${userId} AND is_default = TRUE
  `

  // Set new default
  await sql`
    UPDATE user_organizations
    SET is_default = TRUE
    WHERE user_id = ${userId} AND organization_id = ${tenantId}
  `
}

/**
 * Get user's default tenant
 *
 * @param userId - User ID
 * @returns Default tenant context or null
 */
export async function getDefaultTenant(userId: string): Promise<TenantContext | null> {
  const result = await sql`
    SELECT
      o.id,
      o.slug,
      o.name,
      o.logo_url,
      uo.role,
      uo.is_default,
      uo.last_active_at
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
      AND uo.is_default = TRUE
      AND o.status = 'active'
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return null
  }

  const r = result.rows[0] as Record<string, unknown>
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    logoUrl: (r.logo_url as string) || null,
    role: r.role as UserRole,
    isDefault: true,
    lastActiveAt: r.last_active_at ? new Date(r.last_active_at as string) : null,
  }
}

/**
 * Update last active timestamp for a membership
 * Call this from middleware on each request
 *
 * @param userId - User ID
 * @param tenantId - Tenant ID
 */
export async function updateMembershipActivity(
  userId: string,
  tenantId: string
): Promise<void> {
  await sql`
    UPDATE user_organizations
    SET last_active_at = NOW()
    WHERE user_id = ${userId} AND organization_id = ${tenantId}
  `
}

/**
 * Check if user has pending welcome modal (multiple tenants, no default)
 *
 * @param userId - User ID
 * @returns True if user should see welcome modal
 */
export async function shouldShowWelcomeModal(userId: string): Promise<boolean> {
  const result = await sql`
    SELECT
      COUNT(*) as tenant_count,
      SUM(CASE WHEN is_default = TRUE THEN 1 ELSE 0 END) as default_count
    FROM user_organizations uo
    JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.user_id = ${userId}
      AND o.status = 'active'
  `

  const row = result.rows[0] as Record<string, unknown>
  const tenantCount = Number(row.tenant_count || 0)
  const defaultCount = Number(row.default_count || 0)

  // Show welcome modal if user has multiple tenants but no default set
  return tenantCount > 1 && defaultCount === 0
}

/**
 * Error thrown when tenant access is denied
 */
export class TenantAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantAccessError'
  }
}
