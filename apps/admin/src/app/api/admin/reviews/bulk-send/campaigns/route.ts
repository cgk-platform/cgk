export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getBulkCampaigns, createBulkCampaign } from '@/lib/reviews/db'
import type { CreateBulkCampaignInput } from '@/lib/reviews/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10))

  const result = await getBulkCampaigns(tenantSlug, limit, offset)

  return NextResponse.json({
    campaigns: result.rows,
    totalCount: result.totalCount,
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateBulkCampaignInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || !body.template_id || !body.filters) {
    return NextResponse.json(
      { error: 'Missing required fields: name, template_id, filters' },
      { status: 400 },
    )
  }

  const campaign = await createBulkCampaign(tenantSlug, body)

  return NextResponse.json({ campaign }, { status: 201 })
}
