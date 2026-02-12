/**
 * Sample Orders API (Tag-based detection)
 * GET: List orders detected as samples (UGC + TikTok) based on tags
 */
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSamples, mapFulfillmentStatus, mapSampleType } from '@/lib/samples/db'
import type { FulfillmentStatus, SampleType } from '@/lib/samples/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const search = url.searchParams.get('search') || ''
  const type = (url.searchParams.get('type') || '') as SampleType | ''
  const fulfillmentStatus = (url.searchParams.get('fulfillmentStatus') || '') as FulfillmentStatus | ''
  const dateFrom = url.searchParams.get('dateFrom') || ''
  const dateTo = url.searchParams.get('dateTo') || ''
  const sort = url.searchParams.get('sort') || 'order_placed_at'
  const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc'

  try {
    const result = await withTenant(tenantSlug, async () => {
      return getSamples({
        page,
        limit,
        offset: (page - 1) * limit,
        search,
        type,
        fulfillmentStatus,
        dateFrom,
        dateTo,
        sort,
        dir,
      })
    })

    const samples = result.rows.map((row) => ({
      orderId: row.order_id,
      orderNumber: row.order_number,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      totalPrice: row.total_price_cents / 100,
      currency: row.currency,
      fulfillmentStatus: mapFulfillmentStatus(row.fulfillment_status),
      tags: row.tags || [],
      channel: row.channel,
      orderPlacedAt: row.order_placed_at,
      sampleType: mapSampleType(row.sample_type),
    }))

    return NextResponse.json({
      samples,
      totalCount: result.totalCount,
      page,
      limit,
      totalPages: Math.ceil(result.totalCount / limit),
    })
  } catch (error) {
    console.error('Failed to fetch sample orders:', error)
    return NextResponse.json({ error: 'Failed to fetch sample orders' }, { status: 500 })
  }
}
