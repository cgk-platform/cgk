export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk/db'

interface TemplateRecord {
  id: string
  tenantId: string
  notificationType: string
  blocks: unknown
  fallbackText: string
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * GET /api/admin/notifications/slack/templates
 * Lists all custom templates
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<TemplateRecord>`
        SELECT
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          blocks,
          fallback_text as "fallbackText",
          version,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_slack_templates
        WHERE is_active = true
        ORDER BY notification_type
      `
    })

    return NextResponse.json({ templates: result.rows })
  } catch (error) {
    console.error('Failed to get Slack templates:', error)
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 },
    )
  }
}
