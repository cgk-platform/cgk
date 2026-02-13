export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk-platform/db'

/**
 * POST /api/admin/notifications/slack/templates/[type]/reset
 * Resets a template to default (deletes custom template)
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    await withTenant(tenantSlug, async () => {
      // Soft delete by marking inactive
      await sql`
        UPDATE tenant_slack_templates
        SET is_active = false, updated_at = NOW()
        WHERE notification_type = ${type}
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reset Slack template:', error)
    return NextResponse.json(
      { error: 'Failed to reset template' },
      { status: 500 },
    )
  }
}
