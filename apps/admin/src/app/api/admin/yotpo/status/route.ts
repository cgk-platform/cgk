export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/yotpo/status
 *
 * Returns Yotpo connection status for the current tenant.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check for environment variables first
  if (process.env.YOTPO_APP_KEY && process.env.YOTPO_API_SECRET) {
    return NextResponse.json({
      connected: true,
      appKey: process.env.YOTPO_APP_KEY,
      authSource: 'env',
      productMappings: {
        cleanser: process.env.YOTPO_PRODUCT_CLEANSER,
        moisturizer: process.env.YOTPO_PRODUCT_MOISTURIZER,
        eyeCream: process.env.YOTPO_PRODUCT_EYE_CREAM,
        bundle: process.env.YOTPO_PRODUCT_BUNDLE,
      },
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

    // Fetch Yotpo credentials
    const credResult = await sql`
      SELECT credentials, status, metadata
      FROM integration_credentials
      WHERE integration_type = 'yotpo'
    `

    if (credResult.rows.length === 0) {
      return {
        connected: false,
        authSource: 'database' as const,
      }
    }

    const row = credResult.rows[0]
    const credentials = row.credentials as Record<string, unknown>
    const metadata = row.metadata as Record<string, unknown> | null

    return {
      connected: row.status === 'active',
      appKey: credentials.appKey as string | undefined,
      authSource: 'database' as const,
      productMappings: metadata?.productMappings as Record<string, string> | undefined,
    }
  })

  return NextResponse.json(result)
}
