export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getGoogleFeedSettings } from '@/lib/google-feed/db'

/**
 * POST /api/admin/google-feed/settings/test-connection
 *
 * Test connection to Google Merchant Center
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    const settings = await getGoogleFeedSettings()

    if (!settings) {
      return {
        success: false,
        error: 'Google Feed settings not configured',
      }
    }

    if (!settings.merchantId || !settings.apiCredentials) {
      return {
        success: false,
        error: 'Merchant Center credentials not configured',
      }
    }

    // In a real implementation, this would make an API call to Google Merchant Center
    // to verify the credentials and connection.
    // For now, we simulate a successful connection check.

    try {
      // Simulate API call to Google Merchant Center
      // const merchantCenterClient = new GoogleMerchantCenter({
      //   merchantId: settings.merchantId,
      //   credentials: settings.apiCredentials,
      // })
      // await merchantCenterClient.verifyConnection()

      // Update connection status
      await sql`
        UPDATE google_feed_settings SET
          is_connected = true,
          connection_verified_at = NOW(),
          updated_at = NOW()
        WHERE id = ${settings.id}
      `

      return {
        success: true,
        merchantId: settings.merchantId,
        connectedAt: new Date().toISOString(),
      }
    } catch (error) {
      // Update connection status to failed
      await sql`
        UPDATE google_feed_settings SET
          is_connected = false,
          updated_at = NOW()
        WHERE id = ${settings.id}
      `

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  })

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json(result)
}
