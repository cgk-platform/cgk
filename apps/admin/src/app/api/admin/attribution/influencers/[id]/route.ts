export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getInfluencer,
  updateInfluencer,
  deleteInfluencer,
  type InfluencerUpdate,
} from '@/lib/attribution'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const influencer = await withTenant(tenantSlug, () =>
    getInfluencer(tenantId, id)
  )

  if (!influencer) {
    return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })
  }

  return NextResponse.json({ influencer })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  let body: InfluencerUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const influencer = await withTenant(tenantSlug, () =>
    updateInfluencer(tenantId, id, body)
  )

  if (!influencer) {
    return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })
  }

  return NextResponse.json({ influencer })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const deleted = await withTenant(tenantSlug, () =>
    deleteInfluencer(tenantId, id)
  )

  if (!deleted) {
    return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
