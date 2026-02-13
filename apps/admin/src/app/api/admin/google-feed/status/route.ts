export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getGoogleFeedSettings,
  getLatestSyncHistory,
  getProductCoverage,
  getFeedHealth,
} from '@/lib/google-feed/db'
import type { GoogleFeedStatusResponse } from '@/lib/google-feed/types'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const status = await withTenant(tenantSlug, async () => {
    const [settings, lastSync, coverage, health] = await Promise.all([
      getGoogleFeedSettings(),
      getLatestSyncHistory(),
      getProductCoverage(),
      getFeedHealth(),
    ])

    // Build feed URL if settings exist
    let feedUrl: string | null = null
    if (settings?.feedToken) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.example.com'
      feedUrl = `${baseUrl}/api/feeds/google/${settings.feedToken}/products.${settings.feedFormat || 'xml'}`
    }

    // Get error summary from last sync
    const errorSummary: Array<{ error: string; count: number; severity: string }> = []
    if (lastSync?.errors && Array.isArray(lastSync.errors)) {
      const errorCounts: Record<string, { count: number; severity: string }> = {}
      for (const err of lastSync.errors) {
        const key = err.error || 'Unknown error'
        if (!errorCounts[key]) {
          errorCounts[key] = { count: 0, severity: err.severity || 'error' }
        }
        errorCounts[key].count++
      }
      for (const [error, data] of Object.entries(errorCounts)) {
        errorSummary.push({ error, count: data.count, severity: data.severity })
      }
      errorSummary.sort((a, b) => b.count - a.count)
    }

    const response: GoogleFeedStatusResponse = {
      settings,
      lastSync,
      coverage,
      health,
      errorSummary: errorSummary.slice(0, 10),
      feedUrl,
      performance: null, // Would come from Merchant Center API if connected
    }

    return response
  })

  return NextResponse.json(status)
}
