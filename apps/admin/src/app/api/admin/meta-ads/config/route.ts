export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/meta-ads/config
 *
 * Updates Meta Ads configuration for the current tenant.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { selectedAccountId?: string; pixelId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await withTenant(tenantSlug, async () => {
    // Update metadata with new config
    await sql`
      UPDATE integration_credentials
      SET
        metadata = metadata ||
          ${JSON.stringify({
            selectedAccountId: body.selectedAccountId,
            pixelId: body.pixelId,
          })}::jsonb,
        updated_at = NOW()
      WHERE integration_type = 'meta-ads'
    `
  })

  return NextResponse.json({ success: true })
}
