export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/tiktok-ads/status
 *
 * Returns TikTok Ads connection status for the current tenant.
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
        eventsApiConfigured: false,
      }
    }

    // Fetch TikTok Ads credentials
    const credResult = await sql`
      SELECT
        credentials,
        status,
        expires_at,
        last_synced_at,
        metadata
      FROM integration_credentials
      WHERE integration_type = 'tiktok-ads'
    `

    if (credResult.rows.length === 0) {
      return {
        connected: false,
        eventsApiConfigured: false,
      }
    }

    const row = credResult.rows[0]
    if (!row) {
      return {
        connected: false,
        eventsApiConfigured: false,
      }
    }
    const metadata = row.metadata as Record<string, unknown> | null

    return {
      connected: row.status === 'active',
      advertiserId: metadata?.advertiserId as string | undefined,
      pixelId: metadata?.pixelId as string | undefined,
      eventsApiConfigured: !!metadata?.eventsApiToken,
      lastSyncedAt: row.last_synced_at as string | undefined,
      tokenExpiresAt: row.expires_at as string | undefined,
    }
  })

  return NextResponse.json(result)
}
