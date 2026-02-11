export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getBulkSendPreview } from '@/lib/reviews/db'
import type { BulkCampaignFilters } from '@/lib/reviews/types'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let filters: BulkCampaignFilters
  try {
    filters = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const preview = await getBulkSendPreview(tenantSlug, filters)

  return NextResponse.json({ preview })
}
