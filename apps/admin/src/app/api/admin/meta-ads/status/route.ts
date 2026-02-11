export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/meta-ads/status
 *
 * Returns Meta Ads connection status for the current tenant.
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
        accounts: [],
        capiConfigured: false,
        syncStatus: 'idle' as const,
      }
    }

    // Fetch Meta Ads credentials
    const credResult = await sql`
      SELECT
        credentials,
        status,
        expires_at,
        last_synced_at,
        metadata
      FROM integration_credentials
      WHERE integration_type = 'meta-ads'
    `

    if (credResult.rows.length === 0) {
      return {
        connected: false,
        accounts: [],
        capiConfigured: false,
        syncStatus: 'idle' as const,
      }
    }

    const row = credResult.rows[0]
    if (!row) {
      return {
        connected: false,
        accounts: [],
        capiConfigured: false,
        syncStatus: 'idle' as const,
      }
    }
    const metadata = row.metadata as Record<string, unknown> | null

    return {
      connected: row.status === 'active',
      accounts: (metadata?.accounts as Array<{
        id: string
        name: string
        currency: string
        status: string
      }>) || [],
      selectedAccountId: metadata?.selectedAccountId as string | undefined,
      pixelId: metadata?.pixelId as string | undefined,
      capiConfigured: !!metadata?.pixelId,
      lastSyncedAt: row.last_synced_at as string | undefined,
      tokenExpiresAt: row.expires_at as string | undefined,
      syncStatus: (metadata?.syncStatus as 'idle' | 'syncing' | 'error') || 'idle',
    }
  })

  return NextResponse.json(result)
}
