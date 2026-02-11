/**
 * Treasury Communications API
 *
 * GET /api/admin/communications/treasury/communications - List treasury communications
 *
 * @ai-pattern api-route
 * @ai-note Tenant-isolated via x-tenant-slug header
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk/db'
import type {
  TreasuryCommunication,
  ApprovalStatus,
  ApprovalConfidence,
} from '@cgk/communications'

/**
 * Map database row to TreasuryCommunication
 */
function mapRowToCommunication(row: Record<string, unknown>): TreasuryCommunication {
  return {
    id: row.id as string,
    treasuryRequestId: row.treasury_request_id as string | null,
    direction: row.direction as 'inbound' | 'outbound',
    channel: row.channel as 'email' | 'slack' | 'manual',
    fromAddress: row.from_address as string | null,
    toAddress: row.to_address as string | null,
    subject: row.subject as string | null,
    body: row.body as string | null,
    parsedApprovalStatus: row.parsed_approval_status as ApprovalStatus | null,
    parsedConfidence: row.parsed_confidence as ApprovalConfidence | null,
    matchedKeywords: row.matched_keywords as string[] | null,
    messageId: row.message_id as string | null,
    inReplyTo: row.in_reply_to as string | null,
    inboundEmailId: row.inbound_email_id as string | null,
    processedAt: row.processed_at ? new Date(row.processed_at as string) : null,
    processedBy: row.processed_by as string | null,
    createdAt: new Date(row.created_at as string),
  }
}

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Parse query parameters
  const treasuryRequestId = url.searchParams.get('requestId') || undefined
  const direction = url.searchParams.get('direction') as 'inbound' | 'outbound' | undefined
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
  const offset = (page - 1) * limit

  const result = await withTenant(tenantSlug, async () => {
    let communicationsResult
    let countResult

    if (treasuryRequestId) {
      // Filter by request ID
      [communicationsResult, countResult] = await Promise.all([
        sql`
          SELECT * FROM treasury_communications
          WHERE treasury_request_id = ${treasuryRequestId}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM treasury_communications
          WHERE treasury_request_id = ${treasuryRequestId}
        `,
      ])
    } else if (direction) {
      // Filter by direction
      [communicationsResult, countResult] = await Promise.all([
        sql`
          SELECT * FROM treasury_communications
          WHERE direction = ${direction}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM treasury_communications
          WHERE direction = ${direction}
        `,
      ])
    } else {
      // No filters
      [communicationsResult, countResult] = await Promise.all([
        sql`
          SELECT * FROM treasury_communications
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM treasury_communications
        `,
      ])
    }

    return {
      communications: communicationsResult.rows.map((row) =>
        mapRowToCommunication(row as Record<string, unknown>)
      ),
      total: parseInt(countResult.rows[0]?.total as string, 10) || 0,
    }
  })

  return NextResponse.json({
    communications: result.communications,
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  })
}

/**
 * POST /api/admin/communications/treasury/communications
 * Manually create a treasury communication (e.g., manual approval override)
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    treasuryRequestId?: string
    direction: 'inbound' | 'outbound'
    channel: 'email' | 'slack' | 'manual'
    subject?: string
    body?: string
    parsedApprovalStatus?: ApprovalStatus
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.direction || !body.channel) {
    return NextResponse.json(
      { error: 'Missing required fields: direction, channel' },
      { status: 400 }
    )
  }

  const result = await withTenant(tenantSlug, async () => {
    const insertResult = await sql`
      INSERT INTO treasury_communications (
        treasury_request_id, direction, channel,
        subject, body,
        parsed_approval_status, parsed_confidence,
        processed_at, processed_by
      ) VALUES (
        ${body.treasuryRequestId || null},
        ${body.direction},
        ${body.channel},
        ${body.subject || null},
        ${body.body || null},
        ${body.parsedApprovalStatus || null},
        ${body.parsedApprovalStatus ? 'high' : null},
        NOW(),
        ${userId}
      )
      RETURNING *
    `

    return mapRowToCommunication(insertResult.rows[0] as Record<string, unknown>)
  })

  return NextResponse.json({ communication: result })
}
