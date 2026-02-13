export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { addAssetsToCollection, removeAssetsFromCollection } from '@cgk-platform/dam'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { asset_ids: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.asset_ids || body.asset_ids.length === 0) {
    return NextResponse.json({ error: 'asset_ids is required' }, { status: 400 })
  }

  const added = await withTenant(tenantSlug, () =>
    addAssetsToCollection(tenantSlug, id, body.asset_ids)
  )

  return NextResponse.json({ added })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { asset_ids: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.asset_ids || body.asset_ids.length === 0) {
    return NextResponse.json({ error: 'asset_ids is required' }, { status: 400 })
  }

  const removed = await withTenant(tenantSlug, () =>
    removeAssetsFromCollection(tenantSlug, id, body.asset_ids)
  )

  return NextResponse.json({ removed })
}
