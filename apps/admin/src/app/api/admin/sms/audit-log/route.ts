export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/sms/audit-log
 *
 * Returns paginated SMS consent audit log for the current tenant.
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
  const offset = (page - 1) * limit

  const search = url.searchParams.get('search') || ''
  const action = url.searchParams.get('action') || ''
  const source = url.searchParams.get('source') || ''
  const dateFrom = url.searchParams.get('dateFrom') || ''
  const dateTo = url.searchParams.get('dateTo') || ''

  const result = await withTenant(tenantSlug, async () => {
    // Check if sms_consent_log table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sms_consent_log'
      ) as exists
    `

    if (!tableCheck.rows[0]?.exists) {
      return {
        entries: [],
        totalPages: 0,
        totalCount: 0,
      }
    }

    // Build dynamic query conditions
    const conditions: string[] = ['1=1']
    const params: unknown[] = []
    let paramIndex = 1

    if (search) {
      conditions.push(`(phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (action) {
      conditions.push(`action = $${paramIndex}`)
      params.push(action)
      paramIndex++
    }

    if (source) {
      conditions.push(`source = $${paramIndex}`)
      params.push(source)
      paramIndex++
    }

    if (dateFrom) {
      conditions.push(`created_at >= $${paramIndex}::date`)
      params.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      conditions.push(`created_at <= $${paramIndex}::date + interval '1 day'`)
      params.push(dateTo)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    // Get total count
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM sms_consent_log WHERE ${whereClause}`,
      params
    )
    const totalCount = Number(countResult.rows[0]?.count) || 0

    // Get paginated results
    const queryParams = [...params, limit, offset]
    const entriesResult = await sql.query(
      `SELECT
        id,
        phone,
        email,
        channel,
        action,
        source,
        ip_address as "ipAddress",
        created_at as "createdAt"
      FROM sms_consent_log
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    )

    return {
      entries: entriesResult.rows,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    }
  })

  return NextResponse.json(result)
}
