export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCreativeSavedViews,
  saveCreativeSavedView,
  deleteCreativeSavedView,
} from '@/lib/attribution'
import type { CreativeFilters } from '@/lib/attribution'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const savedViews = await withTenant(tenantSlug, () => getCreativeSavedViews(tenantId))

  return NextResponse.json({ savedViews })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = (await request.json()) as { name: string; filters: CreativeFilters }

  if (!body.name || !body.filters) {
    return NextResponse.json({ error: 'Name and filters are required' }, { status: 400 })
  }

  const savedView = await withTenant(tenantSlug, () =>
    saveCreativeSavedView(tenantId, body.name, body.filters)
  )

  return NextResponse.json({ savedView }, { status: 201 })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'View ID is required' }, { status: 400 })
  }

  await withTenant(tenantSlug, () => deleteCreativeSavedView(tenantId, id))

  return NextResponse.json({ success: true })
}
