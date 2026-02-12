export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getConnections, type GDriveConnection } from '@cgk/dam'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const connections = await withTenant(tenantSlug, () => getConnections(tenantSlug))

  // Remove encrypted tokens from response
  const safeConnections = (connections as GDriveConnection[]).map((c: GDriveConnection) => ({
    id: c.id,
    name: c.name,
    folder_id: c.folder_id,
    folder_name: c.folder_name,
    sync_mode: c.sync_mode,
    auto_sync: c.auto_sync,
    last_sync_at: c.last_sync_at,
    last_sync_status: c.last_sync_status,
    is_active: c.is_active,
    needs_reauth: c.needs_reauth,
    last_error: c.last_error,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }))

  return NextResponse.json({ connections: safeConnections })
}
