export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/admin/klaviyo/disconnect
 *
 * Disconnects Klaviyo integration.
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
      WHERE integration_type = 'klaviyo'
    `
  })

  return NextResponse.json({ success: true })
}
