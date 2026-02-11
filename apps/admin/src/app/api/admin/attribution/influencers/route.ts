export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getInfluencers,
  createInfluencer,
  type InfluencerCreate,
} from '@/lib/attribution'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'active' | 'inactive' | 'all' | null
  const search = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') as 'name' | 'revenue' | 'conversions' | 'roas' | null
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const result = await withTenant(tenantSlug, () =>
    getInfluencers(tenantId, {
      status: status ?? 'all',
      search: search ?? undefined,
      sortBy: sortBy ?? undefined,
      sortOrder: sortOrder ?? undefined,
      limit: Math.min(limit, 100),
      offset,
    })
  )

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: InfluencerCreate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || body.name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const influencer = await withTenant(tenantSlug, () =>
    createInfluencer(tenantId, body)
  )

  return NextResponse.json({ influencer }, { status: 201 })
}
