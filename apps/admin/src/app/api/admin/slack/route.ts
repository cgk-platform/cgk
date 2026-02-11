export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/slack
 *
 * Returns Slack connection status for the current tenant.
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
        channels: [],
      }
    }

    // Fetch Slack credentials
    const credResult = await sql`
      SELECT
        credentials,
        status,
        connected_at,
        metadata
      FROM integration_credentials
      WHERE integration_type = 'slack'
    `

    if (credResult.rows.length === 0) {
      return {
        connected: false,
        channels: [],
      }
    }

    const row = credResult.rows[0]
    if (!row) {
      return {
        connected: false,
        channels: [],
      }
    }
    const metadata = row.metadata as Record<string, unknown> | null

    return {
      connected: row.status === 'active',
      workspaceName: metadata?.workspaceName as string | undefined,
      channels: (metadata?.channels as { id: string; name: string }[]) || [],
      notificationConfig: metadata?.notificationConfig as Record<string, { enabled: boolean; channelId?: string }> | undefined,
      installedAt: row.connected_at as string | undefined,
    }
  })

  return NextResponse.json(result)
}

/**
 * POST /api/admin/slack
 *
 * Updates Slack notification configuration.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { notificationConfig: Record<string, { enabled: boolean; channelId?: string }> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE integration_credentials
      SET
        metadata = metadata || ${JSON.stringify({ notificationConfig: body.notificationConfig })}::jsonb,
        updated_at = NOW()
      WHERE integration_type = 'slack'
    `
  })

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/admin/slack
 *
 * Disconnects Slack integration.
 */
export async function DELETE() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  await withTenant(tenantSlug, async () => {
    await sql`
      DELETE FROM integration_credentials
      WHERE integration_type = 'slack'
    `
  })

  return NextResponse.json({ success: true })
}
