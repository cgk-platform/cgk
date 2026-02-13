export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/admin/tiktok-ads/disconnect
 *
 * Disconnects TikTok Ads integration for the current tenant.
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
      WHERE integration_type = 'tiktok-ads'
    `
  })

  return NextResponse.json({ success: true })
}
