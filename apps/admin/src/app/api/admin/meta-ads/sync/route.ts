export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/meta-ads/sync
 *
 * Triggers a data sync for Meta Ads.
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  await withTenant(tenantSlug, async () => {
    // Update sync status
    await sql`
      UPDATE integration_credentials
      SET
        metadata = metadata || '{"syncStatus": "syncing"}'::jsonb,
        updated_at = NOW()
      WHERE integration_type = 'meta-ads'
    `

    // In a real implementation, this would trigger a background job
    // For now, we'll simulate a sync

    try {
      // Fetch credentials
      const credResult = await sql`
        SELECT credentials, metadata
        FROM integration_credentials
        WHERE integration_type = 'meta-ads'
      `

      if (credResult.rows.length === 0) {
        return
      }

      const credentials = credResult.rows[0].credentials as Record<string, unknown>
      const metadata = credResult.rows[0].metadata as Record<string, unknown>
      const accessToken = credentials.accessToken as string
      const selectedAccountId = metadata.selectedAccountId as string

      if (!selectedAccountId) {
        await sql`
          UPDATE integration_credentials
          SET
            metadata = metadata || '{"syncStatus": "error", "syncError": "No account selected"}'::jsonb,
            updated_at = NOW()
          WHERE integration_type = 'meta-ads'
        `
        return
      }

      // Fetch spend data from Meta Marketing API
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const insightsUrl = new URL(
        `https://graph.facebook.com/v19.0/act_${selectedAccountId}/insights`
      )
      insightsUrl.searchParams.set('access_token', accessToken)
      insightsUrl.searchParams.set('fields', 'spend,impressions,clicks,cpc,cpm')
      insightsUrl.searchParams.set('time_range', JSON.stringify({
        since: thirtyDaysAgo.toISOString().split('T')[0],
        until: today.toISOString().split('T')[0],
      }))
      insightsUrl.searchParams.set('time_increment', '1')

      const insightsResponse = await fetch(insightsUrl.toString())

      if (!insightsResponse.ok) {
        await sql`
          UPDATE integration_credentials
          SET
            metadata = metadata || '{"syncStatus": "error", "syncError": "API request failed"}'::jsonb,
            updated_at = NOW()
          WHERE integration_type = 'meta-ads'
        `
        return
      }

      // Update sync status to success
      await sql`
        UPDATE integration_credentials
        SET
          metadata = metadata || '{"syncStatus": "idle"}'::jsonb,
          last_synced_at = NOW(),
          updated_at = NOW()
        WHERE integration_type = 'meta-ads'
      `
    } catch (error) {
      console.error('Meta Ads sync error:', error)
      await sql`
        UPDATE integration_credentials
        SET
          metadata = metadata || '{"syncStatus": "error", "syncError": "Sync failed"}'::jsonb,
          updated_at = NOW()
        WHERE integration_type = 'meta-ads'
      `
    }
  })

  return NextResponse.json({ success: true })
}
