/**
 * Smart Inbox Contact Service
 * PHASE-2H-WORKFLOWS
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  Contact,
  ContactFilters,
  ContactStats,
  CreateContactInput,
  UpdateContactInput,
} from './types'

// ============================================================
// Contact CRUD
// ============================================================

/**
 * Get contacts with optional filters
 */
export async function getContacts(
  tenantId: string,
  filters?: ContactFilters
): Promise<{ contacts: Contact[]; total: number }> {
  return withTenant(tenantId, async () => {
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    // Build query based on filters
    if (filters?.contactType && filters?.search) {
      const searchPattern = `%${filters.search}%`
      const countResult = await sql`
        SELECT COUNT(*) as count FROM inbox_contacts
        WHERE contact_type = ${filters.contactType}
          AND (name ILIKE ${searchPattern} OR email ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR company_name ILIKE ${searchPattern})
      `
      const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

      const result = await sql`
        SELECT * FROM inbox_contacts
        WHERE contact_type = ${filters.contactType}
          AND (name ILIKE ${searchPattern} OR email ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR company_name ILIKE ${searchPattern})
        ORDER BY updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return { contacts: result.rows.map((row) => mapContactFromDb(row as Record<string, unknown>)), total }
    }

    if (filters?.contactType) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM inbox_contacts
        WHERE contact_type = ${filters.contactType}
      `
      const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

      const result = await sql`
        SELECT * FROM inbox_contacts
        WHERE contact_type = ${filters.contactType}
        ORDER BY updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return { contacts: result.rows.map((row) => mapContactFromDb(row as Record<string, unknown>)), total }
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`
      const countResult = await sql`
        SELECT COUNT(*) as count FROM inbox_contacts
        WHERE name ILIKE ${searchPattern} OR email ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR company_name ILIKE ${searchPattern}
      `
      const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

      const result = await sql`
        SELECT * FROM inbox_contacts
        WHERE name ILIKE ${searchPattern} OR email ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR company_name ILIKE ${searchPattern}
        ORDER BY updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return { contacts: result.rows.map((row) => mapContactFromDb(row as Record<string, unknown>)), total }
    }

    // No filters
    const countResult = await sql`SELECT COUNT(*) as count FROM inbox_contacts`
    const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

    const result = await sql`
      SELECT * FROM inbox_contacts
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return { contacts: result.rows.map((row) => mapContactFromDb(row as Record<string, unknown>)), total }
  })
}

/**
 * Get a single contact by ID
 */
export async function getContact(
  tenantId: string,
  contactId: string
): Promise<Contact | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM inbox_contacts WHERE id = ${contactId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapContactFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Get contact by external ID (creator_id, customer_id, etc.)
 */
export async function getContactByExternalId(
  tenantId: string,
  contactType: string,
  externalId: string
): Promise<Contact | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM inbox_contacts
      WHERE contact_type = ${contactType}
        AND external_id = ${externalId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapContactFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Get contact by email
 */
export async function getContactByEmail(
  tenantId: string,
  email: string
): Promise<Contact | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM inbox_contacts
      WHERE email = ${email.toLowerCase()}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapContactFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Create a new contact
 */
export async function createContact(
  tenantId: string,
  input: CreateContactInput
): Promise<Contact> {
  return withTenant(tenantId, async () => {
    const tags = input.tags || []
    const tagsArray = `{${tags.map((t) => `"${t}"`).join(',')}}`

    const result = await sql`
      INSERT INTO inbox_contacts (
        contact_type, external_id, name, email, phone,
        company_name, company_role, avatar_url,
        preferred_channel, timezone, tags,
        sms_consent, sms_consented_at
      ) VALUES (
        ${input.contactType},
        ${input.externalId || null},
        ${input.name},
        ${input.email?.toLowerCase() || null},
        ${input.phone || null},
        ${input.companyName || null},
        ${input.companyRole || null},
        ${input.avatarUrl || null},
        ${input.preferredChannel || 'email'},
        ${input.timezone || null},
        ${tagsArray}::text[],
        ${input.smsConsent || false},
        ${input.smsConsent ? new Date().toISOString() : null}
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create contact')
    }
    return mapContactFromDb(row as Record<string, unknown>)
  })
}

/**
 * Update a contact
 */
export async function updateContact(
  tenantId: string,
  contactId: string,
  input: UpdateContactInput
): Promise<Contact | null> {
  return withTenant(tenantId, async () => {
    // Fetch current contact first
    const current = await sql`SELECT * FROM inbox_contacts WHERE id = ${contactId}`
    if (current.rows.length === 0) {
      return null
    }

    const row = current.rows[0] as Record<string, unknown>

    // Build updated values
    const contactType = input.contactType ?? (row.contact_type as string)
    const externalId = input.externalId !== undefined ? input.externalId : (row.external_id as string | null)
    const name = input.name ?? (row.name as string)
    const email = input.email !== undefined ? (input.email?.toLowerCase() || null) : (row.email as string | null)
    const phone = input.phone !== undefined ? input.phone : (row.phone as string | null)
    const companyName = input.companyName !== undefined ? input.companyName : (row.company_name as string | null)
    const companyRole = input.companyRole !== undefined ? input.companyRole : (row.company_role as string | null)
    const avatarUrl = input.avatarUrl !== undefined ? input.avatarUrl : (row.avatar_url as string | null)
    const preferredChannel = input.preferredChannel ?? (row.preferred_channel as string)
    const timezone = input.timezone !== undefined ? input.timezone : (row.timezone as string | null)
    const smsConsent = input.smsConsent !== undefined ? input.smsConsent : (row.sms_consent as boolean)
    const smsConsentedAt = input.smsConsent === true ? new Date().toISOString() : (row.sms_consented_at as string | null)

    const tags = input.tags ?? (row.tags as string[] || [])
    const tagsArray = `{${tags.map((t: string) => `"${t}"`).join(',')}}`

    const result = await sql`
      UPDATE inbox_contacts
      SET
        contact_type = ${contactType},
        external_id = ${externalId},
        name = ${name},
        email = ${email},
        phone = ${phone},
        company_name = ${companyName},
        company_role = ${companyRole},
        avatar_url = ${avatarUrl},
        preferred_channel = ${preferredChannel},
        timezone = ${timezone},
        tags = ${tagsArray}::text[],
        sms_consent = ${smsConsent},
        sms_consented_at = ${smsConsentedAt},
        updated_at = NOW()
      WHERE id = ${contactId}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapContactFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Delete a contact
 */
export async function deleteContact(
  tenantId: string,
  contactId: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM inbox_contacts
      WHERE id = ${contactId}
      RETURNING id
    `

    return result.rows.length > 0
  })
}

/**
 * Get or create contact (upsert)
 */
export async function getOrCreateContact(
  tenantId: string,
  input: CreateContactInput
): Promise<Contact> {
  // Try to find by external ID first
  if (input.externalId) {
    const existing = await getContactByExternalId(
      tenantId,
      input.contactType,
      input.externalId
    )
    if (existing) {
      return existing
    }
  }

  // Try to find by email
  if (input.email) {
    const existing = await getContactByEmail(tenantId, input.email)
    if (existing) {
      return existing
    }
  }

  // Create new contact
  return createContact(tenantId, input)
}

// ============================================================
// Contact Stats
// ============================================================

/**
 * Get contact statistics
 */
export async function getContactStats(tenantId: string): Promise<ContactStats> {
  return withTenant(tenantId, async () => {
    // Total and by type
    const typeResult = await sql`
      SELECT
        contact_type,
        COUNT(*) as count
      FROM inbox_contacts
      GROUP BY contact_type
    `

    const byType: Record<string, number> = {}
    let total = 0

    for (const row of typeResult.rows) {
      const count = parseInt(String(row.count), 10)
      byType[row.contact_type as string] = count
      total += count
    }

    // Recently active (updated in last 30 days)
    const recentResult = await sql`
      SELECT COUNT(*) as count
      FROM inbox_contacts
      WHERE updated_at > NOW() - INTERVAL '30 days'
    `
    const recentlyActive = parseInt(String(recentResult.rows[0]?.count || '0'), 10)

    return {
      totalContacts: total,
      byType: byType as ContactStats['byType'],
      recentlyActive,
    }
  })
}

// ============================================================
// Mappers
// ============================================================

function mapContactFromDb(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    contactType: row.contact_type as Contact['contactType'],
    externalId: row.external_id as string | null,
    name: row.name as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    companyName: row.company_name as string | null,
    companyRole: row.company_role as string | null,
    avatarUrl: row.avatar_url as string | null,
    preferredChannel: row.preferred_channel as Contact['preferredChannel'],
    timezone: row.timezone as string | null,
    tags: (row.tags as string[]) || [],
    smsConsent: row.sms_consent as boolean,
    smsConsentedAt: row.sms_consented_at ? new Date(row.sms_consented_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}
