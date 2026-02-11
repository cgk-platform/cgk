/**
 * Creator authentication functions
 *
 * Handles email/password authentication and loading brand memberships.
 */

import { sql } from '@cgk/db'

import type { BrandMembership, Creator, MembershipStatus, ShippingAddress, TaxFormStatus } from '../types'
import { verifyPassword } from './password'

/**
 * Map database row to Creator object
 */
function mapRowToCreator(row: Record<string, unknown>): Omit<Creator, 'brandMemberships'> {
  const shippingAddress: ShippingAddress = {
    addressLine1: (row.address_line1 as string) || null,
    addressLine2: (row.address_line2 as string) || null,
    city: (row.city as string) || null,
    state: (row.state as string) || null,
    postalCode: (row.postal_code as string) || null,
    countryCode: (row.country_code as string) || 'US',
  }

  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    bio: (row.bio as string) || null,
    phone: (row.phone as string) || null,
    avatarUrl: (row.avatar_url as string) || null,
    shippingAddress,
    taxFormStatus: (row.tax_form_status as TaxFormStatus) || 'pending',
    taxFormSubmittedAt: row.tax_form_submitted_at
      ? new Date(row.tax_form_submitted_at as string)
      : null,
    status: row.status as Creator['status'],
    emailVerified: row.email_verified as boolean,
    onboardingCompleted: row.onboarding_completed as boolean,
    guidedTourCompleted: row.guided_tour_completed as boolean,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Map database row to BrandMembership object
 */
function mapRowToMembership(row: Record<string, unknown>): BrandMembership {
  return {
    id: row.id as string,
    brandId: row.organization_id as string,
    brandName: row.org_name as string,
    brandSlug: row.org_slug as string,
    brandLogo: (row.org_logo as string) || null,
    status: row.status as MembershipStatus,
    commissionPercent: parseFloat(row.commission_percent as string),
    discountCode: (row.discount_code as string) || null,
    balanceCents: parseInt(row.balance_cents as string, 10),
    pendingCents: parseInt(row.pending_cents as string, 10),
    lifetimeEarningsCents: parseInt(row.lifetime_earnings_cents as string, 10),
    contractSigned: row.contract_signed as boolean,
    contractSignedAt: row.contract_signed_at
      ? new Date(row.contract_signed_at as string)
      : null,
    activeProjectsCount: parseInt(row.active_projects_count as string, 10),
    completedProjectsCount: parseInt(row.completed_projects_count as string, 10),
    lastProjectAt: row.last_project_at
      ? new Date(row.last_project_at as string)
      : null,
    lastPayoutAt: row.last_payout_at
      ? new Date(row.last_payout_at as string)
      : null,
    joinedAt: new Date(row.joined_at as string),
  }
}

/**
 * Get a creator by email
 *
 * @param email - Email address to look up
 * @returns Creator data without memberships, or null if not found
 */
export async function getCreatorByEmail(
  email: string
): Promise<(Omit<Creator, 'brandMemberships'> & { passwordHash: string | null }) | null> {
  const normalizedEmail = email.toLowerCase().trim()

  const result = await sql`
    SELECT * FROM creators
    WHERE email = ${normalizedEmail}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  const creator = mapRowToCreator(row as Record<string, unknown>)
  return {
    ...creator,
    passwordHash: (row.password_hash as string) || null,
  }
}

/**
 * Get a creator by ID
 *
 * @param creatorId - Creator ID to look up
 * @returns Creator data without memberships, or null if not found
 */
export async function getCreatorById(
  creatorId: string
): Promise<Omit<Creator, 'brandMemberships'> | null> {
  const result = await sql`
    SELECT * FROM creators
    WHERE id = ${creatorId}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToCreator(row as Record<string, unknown>)
}

/**
 * Load brand memberships for a creator
 *
 * @param creatorId - Creator ID to load memberships for
 * @returns Array of brand memberships
 */
export async function loadBrandMemberships(creatorId: string): Promise<BrandMembership[]> {
  const result = await sql`
    SELECT
      cbm.*,
      o.name as org_name,
      o.slug as org_slug,
      o.logo_url as org_logo
    FROM creator_brand_memberships cbm
    INNER JOIN organizations o ON o.id = cbm.organization_id
    WHERE cbm.creator_id = ${creatorId}
    ORDER BY cbm.balance_cents DESC, o.name ASC
  `

  return result.rows.map((row) => mapRowToMembership(row as Record<string, unknown>))
}

/**
 * Authenticate a creator with email and password
 *
 * @param email - Email address
 * @param password - Plain text password
 * @returns Creator with memberships if authentication successful
 * @throws Error if authentication fails
 */
export async function authenticateCreator(
  email: string,
  password: string
): Promise<Creator> {
  const creator = await getCreatorByEmail(email)

  if (!creator) {
    throw new Error('Invalid email or password')
  }

  if (!creator.passwordHash) {
    throw new Error('Password login not enabled. Please use magic link.')
  }

  if (creator.status === 'suspended') {
    throw new Error('Your account has been suspended. Please contact support.')
  }

  if (creator.status === 'inactive') {
    throw new Error('Your account is inactive. Please contact support.')
  }

  const isValid = await verifyPassword(password, creator.passwordHash)
  if (!isValid) {
    throw new Error('Invalid email or password')
  }

  // Load brand memberships
  const memberships = await loadBrandMemberships(creator.id)

  // Update last login
  await sql`
    UPDATE creators
    SET last_login_at = NOW()
    WHERE id = ${creator.id}
  `

  // Remove passwordHash from response
  const { passwordHash: _, ...creatorData } = creator

  return {
    ...creatorData,
    brandMemberships: memberships,
  }
}

/**
 * Get a full creator profile with memberships
 *
 * @param creatorId - Creator ID to fetch
 * @returns Full creator object with memberships
 */
export async function getFullCreator(creatorId: string): Promise<Creator | null> {
  const creator = await getCreatorById(creatorId)
  if (!creator) {
    return null
  }

  const memberships = await loadBrandMemberships(creatorId)

  return {
    ...creator,
    brandMemberships: memberships,
  }
}

/**
 * Update creator's last login timestamp
 *
 * @param creatorId - Creator ID to update
 */
export async function updateCreatorLastLogin(creatorId: string): Promise<void> {
  await sql`
    UPDATE creators
    SET last_login_at = NOW()
    WHERE id = ${creatorId}
  `
}

/**
 * Mark first login and trigger onboarding tour
 *
 * @param creatorId - Creator ID
 */
export async function markFirstLogin(creatorId: string): Promise<void> {
  await sql`
    UPDATE creators
    SET first_login_at = COALESCE(first_login_at, NOW()),
        last_login_at = NOW()
    WHERE id = ${creatorId}
  `
}
