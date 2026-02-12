export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCollectionById,
  updateCollection,
  deleteCollection,
  getCollectionAssets,
  type UpdateCollectionInput,
} from '@cgk/dam'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeAssets = url.searchParams.get('assets') === 'true'
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10))
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const collection = await withTenant(tenantSlug, () => getCollectionById(tenantSlug, id))

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  if (includeAssets) {
    const { assets, totalCount } = await withTenant(tenantSlug, () =>
      getCollectionAssets(tenantSlug, id, limit, offset)
    )
    return NextResponse.json({ collection, assets, totalCount })
  }

  return NextResponse.json({ collection })
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

  let body: Partial<UpdateCollectionInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input: UpdateCollectionInput = {
    id,
    ...body,
  }

  const collection = await withTenant(tenantSlug, () => updateCollection(tenantSlug, input))

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  return NextResponse.json({ collection })
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

  const success = await withTenant(tenantSlug, () => deleteCollection(tenantSlug, id))

  if (!success) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
