export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getBulkCampaign, deleteBulkCampaign, cancelBulkCampaign } from '@/lib/reviews/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const campaign = await getBulkCampaign(tenantSlug, id)

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  return NextResponse.json({ campaign })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const cancel = url.searchParams.get('cancel') === 'true'

  if (cancel) {
    const cancelled = await cancelBulkCampaign(tenantSlug, id)
    if (!cancelled) {
      return NextResponse.json({ error: 'Campaign not found or cannot be cancelled' }, { status: 404 })
    }
    return NextResponse.json({ success: true, cancelled: true })
  }

  const deleted = await deleteBulkCampaign(tenantSlug, id)

  if (!deleted) {
    return NextResponse.json({ error: 'Campaign not found or cannot be deleted (only draft campaigns can be deleted)' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
