export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getConnectionById,
  updateConnectionSettings,
  deleteConnection,
  type GDriveConnection,
} from '@cgk/dam'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const connection = await withTenant(tenantSlug, () => getConnectionById(tenantSlug, id))

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  // Remove encrypted tokens from response
  const conn = connection as GDriveConnection
  return NextResponse.json({
    connection: {
      id: conn.id,
      name: conn.name,
      folder_id: conn.folder_id,
      folder_name: conn.folder_name,
      sync_mode: conn.sync_mode,
      auto_sync: conn.auto_sync,
      last_sync_at: conn.last_sync_at,
      last_sync_status: conn.last_sync_status,
      is_active: conn.is_active,
      needs_reauth: conn.needs_reauth,
      last_error: conn.last_error,
      created_at: conn.created_at,
      updated_at: conn.updated_at,
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { name?: string; auto_sync?: boolean; sync_mode?: 'one_way' | 'two_way' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const connection = await withTenant(tenantSlug, () =>
    updateConnectionSettings(tenantSlug, id, body)
  )

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const connPatch = connection as GDriveConnection
  return NextResponse.json({
    connection: {
      id: connPatch.id,
      name: connPatch.name,
      folder_id: connPatch.folder_id,
      folder_name: connPatch.folder_name,
      sync_mode: connPatch.sync_mode,
      auto_sync: connPatch.auto_sync,
      last_sync_at: connPatch.last_sync_at,
      last_sync_status: connPatch.last_sync_status,
      is_active: connPatch.is_active,
      needs_reauth: connPatch.needs_reauth,
      last_error: connPatch.last_error,
      created_at: connPatch.created_at,
      updated_at: connPatch.updated_at,
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const success = await withTenant(tenantSlug, () => deleteConnection(tenantSlug, id))

  if (!success) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
