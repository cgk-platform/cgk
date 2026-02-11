export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/sms/audit-log/export
 *
 * Exports SMS consent audit log as CSV for the current tenant.
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const search = url.searchParams.get('search') || ''
  const action = url.searchParams.get('action') || ''
  const source = url.searchParams.get('source') || ''
  const dateFrom = url.searchParams.get('dateFrom') || ''
  const dateTo = url.searchParams.get('dateTo') || ''

  const csv = await withTenant(tenantSlug, async () => {
    // Check if sms_consent_log table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sms_consent_log'
      ) as exists
    `

    if (!tableCheck.rows[0]?.exists) {
      return 'Phone,Email,Channel,Action,Source,IP Address,Created At\n'
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

    // Get all matching results (no pagination for export)
    const entriesResult = await sql.query(
      `SELECT
        phone,
        email,
        channel,
        action,
        source,
        ip_address,
        created_at
      FROM sms_consent_log
      WHERE ${whereClause}
      ORDER BY created_at DESC`,
      params
    )

    // Build CSV
    const csvHeader = 'Phone,Email,Channel,Action,Source,IP Address,Created At'
    const csvRows = entriesResult.rows.map((row) => {
      const phone = (row.phone as string || '').replace(/,/g, '')
      const email = (row.email as string || '').replace(/,/g, '')
      const channel = row.channel as string
      const actionVal = row.action as string
      const sourceVal = row.source as string
      const ipAddress = (row.ip_address as string || '').replace(/,/g, '')
      const createdAt = new Date(row.created_at as string).toISOString()

      return `${phone},${email},${channel},${actionVal},${sourceVal},${ipAddress},${createdAt}`
    })

    return [csvHeader, ...csvRows].join('\n')
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="sms-audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
