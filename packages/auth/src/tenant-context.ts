/**
 * Tenant Context Switching Service
 *
 * Provides functionality for users to switch between their
 * accessible tenants/organizations.
 */

import { sql } from '@cgk-platform/db'

import { signJWT } from './jwt'
import { updateSessionOrganization } from './session'
import type { OrgContext, UserRole } from './types'
import { logUserActivity } from './user-admin'

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
  // Get user email and role
  const userResult = await sql`
    SELECT email, role FROM public.users WHERE id = ${userId}
  `

  if (userResult.rows.length === 0) {
    throw new TenantAccessError('User not found')
  }

  const user = userResult.rows[0] as { email: string; role: UserRole }
  const userEmail = user.email

  // Validate user has access to target tenant
  let membershipResult: { rows: Array<Record<string, unknown>> }

  if (user.role === 'super_admin') {
    // Super admins can access any active organization
    membershipResult = await sql`
      SELECT
        o.id,
        o.slug,
        o.name,
        o.settings->>'logo_url' as logo_url,
        o.status
      FROM public.organizations o
      WHERE o.slug = ${targetTenantSlug}
    `
  } else {
    // Regular users need membership
    membershipResult = await sql`
      SELECT
        uo.role,
        uo.is_default,
        o.id,
        o.slug,
        o.name,
        o.settings->>'logo_url' as logo_url,
        o.status
      FROM public.user_organizations uo
      JOIN public.organizations o ON o.id = uo.organization_id
      WHERE uo.user_id = ${userId}
        AND o.slug = ${targetTenantSlug}
    `
  }

  if (membershipResult.rows.length === 0) {
    throw new TenantAccessError('User does not have access to this tenant')
  }

  const row = membershipResult.rows[0] as Record<string, unknown>

  // Check tenant is active
  if (row.status !== 'active') {
    throw new TenantAccessError('Cannot switch to suspended or disabled tenant')
  }

  // Get all user's organizations for JWT
  let orgsResult: { rows: Array<Record<string, unknown>> }

  if (user.role === 'super_admin') {
    // Super admins get all organizations
    orgsResult = await sql`
      SELECT o.id, o.slug
      FROM public.organizations o
      WHERE o.status = 'active'
    `
  } else {
    // Regular users get their memberships
    orgsResult = await sql`
      SELECT uo.role, o.id, o.slug
      FROM public.user_organizations uo
      JOIN public.organizations o ON o.id = uo.organization_id
      WHERE uo.user_id = ${userId}
        AND o.status = 'active'
    `
  }

  const orgs: OrgContext[] = orgsResult.rows.map((r) => ({
    id: (r as Record<string, unknown>).id as string,
    slug: (r as Record<string, unknown>).slug as string,
    role: user.role === 'super_admin' ? 'super_admin' : ((r as Record<string, unknown>).role as UserRole),
  }))

  const tenantId = row.id as string
  const tenantRole = user.role === 'super_admin' ? 'super_admin' : (row.role as UserRole)

  // Update session organization
  await updateSessionOrganization(sessionId, tenantId)

  // Update last_active_at for membership (only for regular users)
  if (user.role !== 'super_admin') {
    await sql`
      UPDATE public.user_organizations
      SET last_active_at = NOW()
      WHERE user_id = ${userId}
        AND organization_id = ${tenantId}
    `
  }

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
    isDefault: user.role === 'super_admin' ? false : Boolean(row.is_default),
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
  // Fetch user to check if super admin
  const userResult = await sql`
    SELECT role FROM public.users WHERE id = ${userId}
  `

  if (userResult.rows.length === 0) {
    return []
  }

  const user = userResult.rows[0] as { role: UserRole }

  // Super admins get ALL organizations
  if (user.role === 'super_admin') {
    const orgsResult = await sql`
      SELECT
        o.id,
        o.slug,
        o.name,
        o.settings->>'logo_url' as logo_url
      FROM public.organizations o
      WHERE o.status = 'active'
      ORDER BY o.name ASC
    `

    return orgsResult.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: r.id as string,
        slug: r.slug as string,
        name: r.name as string,
        logoUrl: (r.logo_url as string) || null,
        role: 'super_admin' as UserRole,
        isDefault: false,
        lastActiveAt: null,
      }
    })
  }

  // Regular users get only their memberships
  const result = await sql`
    SELECT
      o.id,
      o.slug,
      o.name,
      o.settings->>'logo_url' as logo_url,
      uo.role,
      uo.is_default,
      uo.last_active_at
    FROM public.user_organizations uo
    JOIN public.organizations o ON o.id = uo.organization_id
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
    SELECT 1 FROM public.user_organizations
    WHERE user_id = ${userId} AND organization_id = ${tenantId}
  `

  if (membershipResult.rows.length === 0) {
    throw new TenantAccessError('User does not have access to this tenant')
  }

  // Clear any existing default
  await sql`
    UPDATE public.user_organizations
    SET is_default = FALSE
    WHERE user_id = ${userId} AND is_default = TRUE
  `

  // Set new default
  await sql`
    UPDATE public.user_organizations
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
    FROM public.user_organizations uo
    JOIN public.organizations o ON o.id = uo.organization_id
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
    UPDATE public.user_organizations
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
    FROM public.user_organizations uo
    JOIN public.organizations o ON o.id = uo.organization_id
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
