export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/tiktok-ads/pixel-config
 *
 * Updates TikTok Pixel configuration for the current tenant.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { pixelId: string; eventsApiToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.pixelId) {
    return NextResponse.json({ error: 'Pixel ID required' }, { status: 400 })
  }

  // Table created by migration 072_integration_commerce.sql
  await withTenant(tenantSlug, async () => {
    // Check if record exists
    const existingResult = await sql`
      SELECT id FROM integration_credentials
      WHERE integration_type = 'tiktok-ads'
    `

    if (existingResult.rows.length > 0) {
      // Update existing record
      await sql`
        UPDATE integration_credentials
        SET
          metadata = metadata || ${JSON.stringify({
            pixelId: body.pixelId,
            eventsApiToken: body.eventsApiToken || null,
          })}::jsonb,
          updated_at = NOW()
        WHERE integration_type = 'tiktok-ads'
      `
    } else {
      // Create new record for pixel-only config
      await sql`
        INSERT INTO integration_credentials (
          integration_type,
          credentials,
          status,
          connected_at,
          metadata
        ) VALUES (
          'tiktok-ads',
          '{}'::jsonb,
          'pending',
          NOW(),
          ${JSON.stringify({
            pixelId: body.pixelId,
            eventsApiToken: body.eventsApiToken || null,
          })}
        )
      `
    }
  })

  return NextResponse.json({ success: true })
}
