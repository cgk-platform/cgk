/**
 * Organization Service
 *
 * Creates and manages organizations during onboarding.
 */

import { sql } from '@cgk/db'
import { createTenantSchema } from '@cgk/db/migrations'
import { createLogger } from '@cgk/logging'

import type { BasicInfoData, OrganizationSummary } from './types.js'

const logger = createLogger({
  meta: { service: 'onboarding', component: 'organization' },
})

/**
 * Slug validation pattern
 */
const SLUG_PATTERN = /^[a-z0-9_]+$/

/**
 * Reserved slugs that cannot be used
 */
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'billing',
  'blog',
  'cdn',
  'dashboard',
  'docs',
  'help',
  'login',
  'logout',
  'mail',
  'platform',
  'public',
  'settings',
  'status',
  'support',
  'www',
])

/**
 * Check if a slug is valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 50) {
    return false
  }
  if (!SLUG_PATTERN.test(slug)) {
    return false
  }
  if (RESERVED_SLUGS.has(slug)) {
    return false
  }
  return true
}

/**
 * Generate a slug from a brand name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '') // Remove special chars
    .replace(/[\s-]+/g, '_') // Replace spaces and hyphens with underscores
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Trim underscores from ends
    .substring(0, 50)
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) {
    return false
  }

  const result = await sql`
    SELECT id FROM organizations
    WHERE slug = ${slug}
  `

  return result.rows.length === 0
}

/**
 * Create an organization
 */
export async function createOrganization(data: BasicInfoData): Promise<{
  id: string
  slug: string
}> {
  logger.info('Creating organization', { slug: data.slug })

  // Validate slug
  if (!isValidSlug(data.slug)) {
    throw new Error(`Invalid slug: ${data.slug}`)
  }

  // Check availability
  const available = await isSlugAvailable(data.slug)
  if (!available) {
    throw new Error(`Slug already taken: ${data.slug}`)
  }

  // Create organization record
  const result = await sql`
    INSERT INTO organizations (
      name, slug, status, primary_color, logo_url, custom_domain, settings
    )
    VALUES (
      ${data.brandName},
      ${data.slug},
      'onboarding',
      ${data.primaryColor || '#000000'},
      ${data.logoUrl || null},
      ${data.customDomain || null},
      '{}'::jsonb
    )
    RETURNING id, slug
  `

  const org = result.rows[0] as { id: string; slug: string }

  // Create tenant schema with all migrations
  logger.info('Creating tenant schema', { slug: data.slug })
  await createTenantSchema(data.slug)

  logger.info('Organization created', { id: org.id, slug: org.slug })

  return org
}

/**
 * Update organization settings
 */
export async function updateOrganization(
  organizationId: string,
  updates: Partial<{
    name: string
    primaryColor: string
    logoUrl: string
    customDomain: string
    customDomainVerified: boolean
    settings: Record<string, unknown>
    enabledFeatures: string[]
    shopifyStoreDomain: string
    shopifyAccessTokenEncrypted: string
    stripeAccountId: string
    status: 'onboarding' | 'active' | 'suspended'
    onboardingStatus: string
    onboardingCompletedAt: Date | null
    setupChecklist: Record<string, unknown>
  }>
): Promise<void> {
  logger.info('Updating organization', { organizationId, fields: Object.keys(updates) })

  // Build update query dynamically based on provided fields
  await sql`
    UPDATE organizations
    SET
      name = COALESCE(${updates.name || null}, name),
      primary_color = COALESCE(${updates.primaryColor || null}, primary_color),
      logo_url = COALESCE(${updates.logoUrl || null}, logo_url),
      custom_domain = COALESCE(${updates.customDomain || null}, custom_domain),
      custom_domain_verified = COALESCE(${updates.customDomainVerified ?? null}, custom_domain_verified),
      settings = COALESCE(${updates.settings ? JSON.stringify(updates.settings) : null}::jsonb, settings),
      enabled_features = COALESCE(${updates.enabledFeatures ? JSON.stringify(updates.enabledFeatures) : null}::jsonb, enabled_features),
      shopify_store_domain = COALESCE(${updates.shopifyStoreDomain || null}, shopify_store_domain),
      shopify_access_token_encrypted = COALESCE(${updates.shopifyAccessTokenEncrypted || null}, shopify_access_token_encrypted),
      stripe_account_id = COALESCE(${updates.stripeAccountId || null}, stripe_account_id),
      status = COALESCE(${updates.status || null}::organization_status, status),
      onboarding_status = COALESCE(${updates.onboardingStatus || null}, onboarding_status),
      onboarding_completed_at = COALESCE(${updates.onboardingCompletedAt?.toISOString() || null}::timestamptz, onboarding_completed_at),
      setup_checklist = COALESCE(${updates.setupChecklist ? JSON.stringify(updates.setupChecklist) : null}::jsonb, setup_checklist),
      updated_at = NOW()
    WHERE id = ${organizationId}
  `
}

/**
 * Get organization by ID
 */
export async function getOrganization(organizationId: string): Promise<OrganizationSummary | null> {
  const result = await sql`
    SELECT
      o.id,
      o.name,
      o.slug,
      o.status,
      o.shopify_store_domain,
      o.custom_domain,
      o.enabled_features,
      (SELECT COUNT(*) FROM user_organizations WHERE organization_id = o.id) as user_count
    FROM organizations o
    WHERE o.id = ${organizationId}
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0] as Record<string, unknown>

  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as string,
    shopifyDomain: (row.shopify_store_domain as string) || undefined,
    customDomain: (row.custom_domain as string) || undefined,
    enabledFeatures: (row.enabled_features as string[]) || [],
    productCount: 0, // Would need to query tenant schema
    userCount: parseInt((row.user_count as string) || '0', 10),
  }
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string): Promise<OrganizationSummary | null> {
  const result = await sql`
    SELECT id FROM organizations WHERE slug = ${slug}
  `

  if (result.rows.length === 0) {
    return null
  }

  return getOrganization((result.rows[0] as { id: string }).id)
}

/**
 * Launch organization (set status to active)
 */
export async function launchOrganization(organizationId: string): Promise<void> {
  logger.info('Launching organization', { organizationId })

  await sql`
    UPDATE organizations
    SET
      status = 'active',
      onboarding_status = 'completed',
      onboarding_completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${organizationId}
  `
}

/**
 * Add user to organization
 */
export async function addUserToOrganization(
  userId: string,
  organizationId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<void> {
  await sql`
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (${userId}, ${organizationId}, ${role})
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = ${role}
  `
}
