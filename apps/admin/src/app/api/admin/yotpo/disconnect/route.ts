export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/admin/yotpo/disconnect
 *
 * Disconnects Yotpo integration.
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
      WHERE integration_type = 'yotpo'
    `
  })

  return NextResponse.json({ success: true })
}
