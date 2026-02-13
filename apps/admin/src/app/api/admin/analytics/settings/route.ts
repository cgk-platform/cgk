/**
 * Analytics Settings API
 *
 * GET /api/admin/analytics/settings - Get analytics settings
 * PUT /api/admin/analytics/settings - Update analytics settings
 */

import { requireAuth } from '@cgk-platform/auth'

import { getAnalyticsSettings, updateAnalyticsSettings } from '@/lib/analytics'
import type { AnalyticsSettingsUpdate } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const settings = await getAnalyticsSettings(tenantId)

  if (!settings) {
    // Return default settings if none exist
    return Response.json({
      settings: {
        id: '',
        dataSources: {
          shopify: { connected: false, lastSyncAt: null },
          googleAnalytics: { connected: false, lastSyncAt: null },
          meta: { connected: false, lastSyncAt: null },
          googleAds: { connected: false, lastSyncAt: null },
          tiktok: { connected: false, lastSyncAt: null },
          autoRefreshEnabled: true,
          refreshFrequency: 'hourly',
        },
        attribution: {
          defaultWindow: '30d',
          defaultModel: 'last_touch',
          crossDeviceTracking: true,
        },
        display: {
          defaultDateRange: '30d',
          currency: 'USD',
          timezone: 'America/New_York',
          fiscalYearStartMonth: 1,
        },
        export: {
          defaultFormat: 'csv',
          includeHeaders: true,
          dateFormat: 'YYYY-MM-DD',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  }

  return Response.json({ settings })
}

export async function PUT(req: Request) {
  const { tenantId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as AnalyticsSettingsUpdate

  await updateAnalyticsSettings(tenantId, body)

  return Response.json({ success: true })
}
