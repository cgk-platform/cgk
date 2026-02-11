export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { executeBulkCampaign } from '@/lib/reviews/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const started = await executeBulkCampaign(tenantSlug, id)

  if (!started) {
    return NextResponse.json(
      { error: 'Campaign not found or cannot be started (must be in draft or scheduled status)' },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true, message: 'Campaign execution started' })
}
