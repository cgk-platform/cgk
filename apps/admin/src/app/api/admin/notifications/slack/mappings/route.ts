export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql, createTenantCache } from '@cgk-platform/db'
import type { NotificationType } from '@cgk-platform/slack'

interface MappingRecord {
  id: string
  tenantId: string
  notificationType: string
  channelId: string
  channelName: string | null
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * GET /api/admin/notifications/slack/mappings
 * Gets all notification type to channel mappings
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<MappingRecord>`
        SELECT
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          channel_id as "channelId",
          channel_name as "channelName",
          is_enabled as "isEnabled",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_slack_channel_mappings
        ORDER BY notification_type
      `
    })

    return NextResponse.json({ mappings: result.rows })
  } catch (error) {
    console.error('Failed to get Slack mappings:', error)
    return NextResponse.json(
      { error: 'Failed to get mappings' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/admin/notifications/slack/mappings
 * Updates notification type to channel mappings
 */
export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    mappings: Array<{
      notificationType: NotificationType
      channelId: string
      channelName?: string
      isEnabled: boolean
    }>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.mappings || !Array.isArray(body.mappings)) {
    return NextResponse.json({ error: 'mappings array required' }, { status: 400 })
  }

  try {
    await withTenant(tenantSlug, async () => {
      for (const mapping of body.mappings) {
        await sql`
          INSERT INTO tenant_slack_channel_mappings (
            tenant_id,
            notification_type,
            channel_id,
            channel_name,
            is_enabled
          ) VALUES (
            ${tenantSlug},
            ${mapping.notificationType},
            ${mapping.channelId},
            ${mapping.channelName ?? null},
            ${mapping.isEnabled}
          )
          ON CONFLICT (tenant_id, notification_type) DO UPDATE SET
            channel_id = EXCLUDED.channel_id,
            channel_name = EXCLUDED.channel_name,
            is_enabled = EXCLUDED.is_enabled,
            updated_at = NOW()
        `
      }
    })

    // Invalidate cache for all updated mappings
    const cache = createTenantCache(tenantSlug)
    for (const mapping of body.mappings) {
      await cache.delete(`slack:mapping:${mapping.notificationType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update Slack mappings:', error)
    return NextResponse.json(
      { error: 'Failed to update mappings' },
      { status: 500 },
    )
  }
}
