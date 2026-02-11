export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/sms/status
 *
 * Returns SMS integration status for the current tenant.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    // Check if integration_credentials table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'integration_credentials'
      ) as exists
    `

    if (!tableCheck.rows[0]?.exists) {
      return {
        connected: false,
        provider: 'retell',
        features: {
          smsEnabled: false,
          creatorSmsEnabled: false,
          customerSmsEnabled: false,
        },
        consentStats: {
          totalOptedIn: 0,
          totalOptedOut: 0,
          optInRate: 0,
          todayMessages: 0,
          weekMessages: 0,
          monthMessages: 0,
        },
      }
    }

    // Fetch SMS credentials
    const credResult = await sql`
      SELECT status, metadata
      FROM integration_credentials
      WHERE integration_type = 'sms'
    `

    const connected = credResult.rows.length > 0 && credResult.rows[0].status === 'active'
    const metadata = credResult.rows[0]?.metadata as Record<string, unknown> || {}

    // Get consent stats - check if sms_consent table exists
    const consentTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sms_consent'
      ) as exists
    `

    let consentStats = {
      totalOptedIn: 0,
      totalOptedOut: 0,
      optInRate: 0,
      todayMessages: 0,
      weekMessages: 0,
      monthMessages: 0,
    }

    if (consentTableCheck.rows[0]?.exists) {
      const optInResult = await sql`
        SELECT COUNT(*) as count FROM sms_consent WHERE opted_in = true
      `
      const optOutResult = await sql`
        SELECT COUNT(*) as count FROM sms_consent WHERE opted_in = false
      `

      const optedIn = Number(optInResult.rows[0]?.count) || 0
      const optedOut = Number(optOutResult.rows[0]?.count) || 0
      const total = optedIn + optedOut

      consentStats = {
        totalOptedIn: optedIn,
        totalOptedOut: optedOut,
        optInRate: total > 0 ? Math.round((optedIn / total) * 100) : 0,
        todayMessages: 0,
        weekMessages: 0,
        monthMessages: 0,
      }
    }

    return {
      connected,
      provider: 'retell',
      features: {
        smsEnabled: metadata.smsEnabled !== false,
        creatorSmsEnabled: metadata.creatorSmsEnabled !== false,
        customerSmsEnabled: metadata.customerSmsEnabled !== false,
      },
      consentStats,
    }
  })

  return NextResponse.json(result)
}
