/**
 * Treasury Communications database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  TreasuryCommunication,
  CreateCommunicationInput,
  CommunicationDirection,
} from '../types'

/**
 * Get communications for a draw request
 */
export async function getCommunications(
  tenantSlug: string,
  requestId: string
): Promise<TreasuryCommunication[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM treasury_communications
      WHERE request_id = ${requestId}
      ORDER BY created_at DESC
    `
    return result.rows as TreasuryCommunication[]
  })
}

/**
 * Get a single communication by ID
 */
export async function getCommunication(
  tenantSlug: string,
  communicationId: string
): Promise<TreasuryCommunication | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM treasury_communications
      WHERE id = ${communicationId}
    `
    return (result.rows[0] as TreasuryCommunication) || null
  })
}

/**
 * Create a new communication log entry
 */
export async function createCommunication(
  tenantSlug: string,
  input: CreateCommunicationInput
): Promise<TreasuryCommunication> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO treasury_communications (
        request_id, direction, channel, subject, body,
        from_email, to_email, parsed_status, parsed_confidence, matched_keywords
      ) VALUES (
        ${input.request_id},
        ${input.direction}::communication_direction,
        ${input.channel || 'email'},
        ${input.subject || null},
        ${input.body},
        ${input.from_email || null},
        ${input.to_email || null},
        ${input.parsed_status ? `${input.parsed_status}::parsed_status` : null},
        ${input.parsed_confidence ? `${input.parsed_confidence}::parsed_confidence` : null},
        ${input.matched_keywords ? `{${input.matched_keywords.map(s => `"${s}"`).join(',')}}` : '{}'}::text[]
      )
      RETURNING *
    `
    return result.rows[0] as TreasuryCommunication
  })
}

/**
 * Log an outbound email
 */
export async function logOutboundEmail(
  tenantSlug: string,
  requestId: string,
  subject: string,
  body: string,
  toEmail: string,
  fromEmail?: string
): Promise<TreasuryCommunication> {
  return createCommunication(tenantSlug, {
    request_id: requestId,
    direction: 'outbound',
    channel: 'email',
    subject,
    body,
    from_email: fromEmail || 'treasury@cgk.dev',
    to_email: toEmail,
  })
}

/**
 * Log an inbound email with parsing results
 */
export async function logInboundEmail(
  tenantSlug: string,
  requestId: string,
  subject: string | null,
  body: string,
  fromEmail: string,
  toEmail: string,
  parsedStatus: 'approved' | 'rejected' | 'unclear',
  parsedConfidence: 'high' | 'medium' | 'low',
  matchedKeywords: string[]
): Promise<TreasuryCommunication> {
  return createCommunication(tenantSlug, {
    request_id: requestId,
    direction: 'inbound',
    channel: 'email',
    subject: subject ?? undefined,
    body,
    from_email: fromEmail,
    to_email: toEmail,
    parsed_status: parsedStatus,
    parsed_confidence: parsedConfidence,
    matched_keywords: matchedKeywords,
  })
}

/**
 * Get the latest communication for a request
 */
export async function getLatestCommunication(
  tenantSlug: string,
  requestId: string,
  direction?: CommunicationDirection
): Promise<TreasuryCommunication | null> {
  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT * FROM treasury_communications
      WHERE request_id = $1
    `
    const values: unknown[] = [requestId]

    if (direction) {
      query += ` AND direction = $2::communication_direction`
      values.push(direction)
    }

    query += ` ORDER BY created_at DESC LIMIT 1`

    const result = await sql.query(query, values)
    return (result.rows[0] as TreasuryCommunication) || null
  })
}

/**
 * Count communications by type for a request
 */
export async function countCommunications(
  tenantSlug: string,
  requestId: string
): Promise<{ outbound: number; inbound: number; total: number }> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE direction = 'outbound')::int as outbound,
        COUNT(*) FILTER (WHERE direction = 'inbound')::int as inbound,
        COUNT(*)::int as total
      FROM treasury_communications
      WHERE request_id = ${requestId}
    `
    return result.rows[0] as { outbound: number; inbound: number; total: number }
  })
}

/**
 * Get all communications across all requests (for admin view)
 */
export async function getAllCommunications(
  tenantSlug: string,
  options?: {
    direction?: CommunicationDirection
    limit?: number
    offset?: number
  }
): Promise<{ communications: TreasuryCommunication[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    let query = `
      SELECT tc.*, dr.request_number
      FROM treasury_communications tc
      JOIN treasury_draw_requests dr ON dr.id = tc.request_id
    `
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (options?.direction) {
      paramIndex++
      conditions.push(`tc.direction = $${paramIndex}::communication_direction`)
      values.push(options.direction)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY tc.created_at DESC`

    // Get total count
    const countQuery = query.replace(
      'SELECT tc.*, dr.request_number',
      'SELECT COUNT(*) as count'
    )
    const countResult = await sql.query(countQuery, values)
    const totalCount = Number(countResult.rows[0]?.count || 0)

    // Get paginated results
    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)
    query += ` LIMIT $${limitParam} OFFSET $${offsetParam}`

    const result = await sql.query(query, values)

    return {
      communications: result.rows as TreasuryCommunication[],
      totalCount,
    }
  })
}
