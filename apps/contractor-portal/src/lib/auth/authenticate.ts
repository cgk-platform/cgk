/**
 * Contractor authentication functions
 *
 * Handles email/password authentication and contractor data loading.
 * Contractors are single-tenant (stored in tenant schema).
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { Contractor, ContractorStatus, ContractorWithStats } from '../types'
import { verifyPassword } from './password'

/**
 * Map database row to Contractor object
 */
function mapRowToContractor(row: Record<string, unknown>): Contractor {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) || null,
    status: row.status as ContractorStatus,
    tags: (row.tags as string[]) || [],
    notes: (row.notes as string) || null,
    contractUrl: (row.contract_url as string) || null,
    contractType: (row.contract_type as 'uploaded' | 'link') || null,
    contractSignedAt: row.contract_signed_at
      ? new Date(row.contract_signed_at as string)
      : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Get a contractor by email within a tenant
 *
 * @param email - Email address to look up
 * @param tenantSlug - Tenant slug for schema access
 * @returns Contractor data or null if not found
 */
export async function getContractorByEmail(
  email: string,
  tenantSlug: string
): Promise<(Contractor & { passwordHash: string | null }) | null> {
  const normalizedEmail = email.toLowerCase().trim()

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractors
      WHERE email = ${normalizedEmail}
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  const contractor = mapRowToContractor(row as Record<string, unknown>)
  return {
    ...contractor,
    passwordHash: (row.password_hash as string) || null,
  }
}

/**
 * Get a contractor by ID within a tenant
 *
 * @param contractorId - Contractor ID to look up
 * @param tenantSlug - Tenant slug for schema access
 * @returns Contractor data or null if not found
 */
export async function getContractorById(
  contractorId: string,
  tenantSlug: string
): Promise<Contractor | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT * FROM contractors
      WHERE id = ${contractorId}
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToContractor(row as Record<string, unknown>)
}

/**
 * Get contractor with stats
 *
 * @param contractorId - Contractor ID
 * @param tenantSlug - Tenant slug for schema access
 * @returns Contractor with stats or null
 */
export async function getContractorWithStats(
  contractorId: string,
  tenantSlug: string
): Promise<ContractorWithStats | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT
        c.*,
        COALESCE(active.count, 0) as active_project_count,
        COALESCE(completed.count, 0) as completed_project_count,
        COALESCE(pending_payout.total, 0) as pending_payout_cents,
        COALESCE(lifetime.total, 0) as lifetime_earnings_cents
      FROM contractors c
      LEFT JOIN (
        SELECT contractor_id, COUNT(*) as count
        FROM contractor_projects
        WHERE status IN ('pending_contractor', 'draft', 'in_progress', 'submitted', 'revision_requested')
        GROUP BY contractor_id
      ) active ON active.contractor_id = c.id
      LEFT JOIN (
        SELECT contractor_id, COUNT(*) as count
        FROM contractor_projects
        WHERE status = 'payout_approved'
        GROUP BY contractor_id
      ) completed ON completed.contractor_id = c.id
      LEFT JOIN (
        SELECT contractor_id, SUM(rate_cents) as total
        FROM contractor_projects
        WHERE status IN ('payout_ready', 'withdrawal_requested')
        GROUP BY contractor_id
      ) pending_payout ON pending_payout.contractor_id = c.id
      LEFT JOIN (
        SELECT contractor_id, SUM(rate_cents) as total
        FROM contractor_projects
        WHERE status = 'payout_approved'
        GROUP BY contractor_id
      ) lifetime ON lifetime.contractor_id = c.id
      WHERE c.id = ${contractorId}
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  const contractor = mapRowToContractor(row as Record<string, unknown>)
  return {
    ...contractor,
    activeProjectCount: parseInt(row.active_project_count as string, 10) || 0,
    completedProjectCount: parseInt(row.completed_project_count as string, 10) || 0,
    pendingPayoutCents: parseInt(row.pending_payout_cents as string, 10) || 0,
    lifetimeEarningsCents: parseInt(row.lifetime_earnings_cents as string, 10) || 0,
  }
}

/**
 * Authenticate a contractor with email and password
 *
 * @param email - Email address
 * @param password - Plain text password
 * @param tenantSlug - Tenant slug for schema access
 * @returns Contractor if authentication successful
 * @throws Error if authentication fails
 */
export async function authenticateContractor(
  email: string,
  password: string,
  tenantSlug: string
): Promise<Contractor> {
  const contractor = await getContractorByEmail(email, tenantSlug)

  if (!contractor) {
    throw new Error('Invalid email or password')
  }

  if (!contractor.passwordHash) {
    throw new Error('Password login not enabled. Please use magic link.')
  }

  if (contractor.status === 'suspended') {
    throw new Error('Your account has been suspended. Please contact support.')
  }

  if (contractor.status === 'inactive') {
    throw new Error('Your account is inactive. Please contact support.')
  }

  if (contractor.status === 'pending') {
    throw new Error('Your account is pending approval. Please wait for admin activation.')
  }

  const isValid = await verifyPassword(password, contractor.passwordHash)
  if (!isValid) {
    throw new Error('Invalid email or password')
  }

  // Update last login
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractors
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${contractor.id}
    `
  })

  // Remove passwordHash from response
  const { passwordHash: _, ...contractorData } = contractor

  return contractorData
}

/**
 * Get tenant information from slug
 *
 * @param slug - Tenant slug
 * @returns Tenant info or null
 */
export async function getTenantBySlug(
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  const result = await sql`
    SELECT id, name, slug FROM organizations
    WHERE slug = ${slug}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
  }
}

/**
 * Update contractor password
 *
 * @param contractorId - Contractor ID
 * @param passwordHash - New password hash
 * @param tenantSlug - Tenant slug for schema access
 */
export async function updateContractorPassword(
  contractorId: string,
  passwordHash: string,
  tenantSlug: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE contractors
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${contractorId}
    `
  })
}

/**
 * Create a new contractor (for signup)
 *
 * @param data - Contractor data
 * @param passwordHash - Password hash
 * @param tenantSlug - Tenant slug for schema access
 * @returns Created contractor
 */
export async function createContractor(
  data: {
    tenantId: string
    name: string
    email: string
    phone?: string
  },
  passwordHash: string,
  tenantSlug: string
): Promise<Contractor> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO contractors (
        tenant_id, name, email, phone, password_hash, status
      )
      VALUES (
        ${data.tenantId}, ${data.name}, ${data.email.toLowerCase()},
        ${data.phone || null}, ${passwordHash}, 'pending'
      )
      RETURNING *
    `
  })

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create contractor')
  }

  return mapRowToContractor(row as Record<string, unknown>)
}
