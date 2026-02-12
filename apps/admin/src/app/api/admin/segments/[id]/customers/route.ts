/**
 * Segment Customers API
 * GET: List customers in a specific segment (Shopify or RFM)
 */
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCachedSegmentById, getRfmCustomers, getSegmentMembers } from '@/lib/segments/db'
import { RFM_SEGMENT_INFO, type RfmSegmentType } from '@/lib/segments/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id } = await params
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const type = url.searchParams.get('type') || 'auto' // 'shopify', 'rfm', or 'auto'

  try {
    const result = await withTenant(tenantSlug, async () => {
      // Check if this is an RFM segment type (by name)
      const rfmSegmentTypes = Object.keys(RFM_SEGMENT_INFO)
      const isRfmSegment = type === 'rfm' || (type === 'auto' && rfmSegmentTypes.includes(id))

      if (isRfmSegment) {
        // Get RFM customers for this segment
        const customers = await getRfmCustomers({
          page,
          limit,
          offset: (page - 1) * limit,
          search: '',
          segment: id as RfmSegmentType,
          minRfmScore: null,
          maxRfmScore: null,
          sort: 'rfm_score',
          dir: 'desc',
        })

        const info = RFM_SEGMENT_INFO[id as RfmSegmentType]

        return {
          segmentId: id,
          segmentType: 'rfm' as const,
          segmentName: info?.label || id,
          segmentDescription: info?.description || '',
          customers: customers.rows.map((row) => ({
            id: row.id,
            customerId: row.customer_id,
            email: row.customer_email,
            name: row.customer_name,
            rfmScore: row.rfm_score,
            rScore: row.r_score,
            fScore: row.f_score,
            mScore: row.m_score,
            monetaryTotal: row.monetary_total_cents ? row.monetary_total_cents / 100 : null,
            currency: row.currency,
            lastOrderAt: row.last_order_at,
          })),
          totalCount: customers.totalCount,
          page,
          limit,
          totalPages: Math.ceil(customers.totalCount / limit),
        }
      }

      // Otherwise, treat as Shopify segment
      const segment = await getCachedSegmentById(id)
      if (!segment) {
        return null
      }

      // Get cached segment members
      const members = await getSegmentMembers(id, limit, (page - 1) * limit)

      return {
        segmentId: id,
        segmentType: 'shopify' as const,
        segmentName: segment.name,
        segmentQuery: segment.query,
        shopifySegmentId: segment.shopify_segment_id,
        customers: members.rows.map((row) => ({
          id: row.id,
          customerId: row.customer_id,
          email: row.customer_email,
          cachedAt: row.cached_at,
        })),
        totalCount: members.totalCount,
        page,
        limit,
        totalPages: Math.ceil(members.totalCount / limit),
        note: members.totalCount === 0
          ? 'Customer membership data may need to be synced from Shopify.'
          : undefined,
      }
    })

    if (!result) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch segment customers:', error)
    return NextResponse.json({ error: 'Failed to fetch segment customers' }, { status: 500 })
  }
}
