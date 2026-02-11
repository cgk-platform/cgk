export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/klaviyo/status
 *
 * Returns Klaviyo connection status for the current tenant.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check for environment variables first
  if (process.env.KLAVIYO_PRIVATE_KEY) {
    return NextResponse.json({
      connected: true,
      authSource: 'env',
      smsListId: process.env.KLAVIYO_SMS_LIST_ID,
      emailListId: process.env.KLAVIYO_EMAIL_LIST_ID,
    })
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
        authSource: 'database' as const,
      }
    }

    // Fetch Klaviyo credentials
    const credResult = await sql`
      SELECT status, metadata
      FROM integration_credentials
      WHERE integration_type = 'klaviyo'
    `

    const row = credResult.rows[0]
    if (!row) {
      return {
        connected: false,
        authSource: 'database' as const,
      }
    }

    const metadata = row.metadata as Record<string, unknown> | null

    return {
      connected: row.status === 'active',
      companyName: metadata?.companyName as string | undefined,
      smsListId: metadata?.smsListId as string | undefined,
      emailListId: metadata?.emailListId as string | undefined,
      authSource: 'database' as const,
    }
  })

  return NextResponse.json(result)
}
