export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { syncKeywordsWithGSC, getGSCConnection } from '@/lib/seo/google-search-console'

export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check if GSC is connected
  const connection = await withTenant(tenantSlug, () => getGSCConnection())

  if (!connection || !connection.is_connected) {
    return NextResponse.json(
      { error: 'Google Search Console is not connected' },
      { status: 400 }
    )
  }

  try {
    const result = await withTenant(tenantSlug, () => syncKeywordsWithGSC())

    return NextResponse.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
