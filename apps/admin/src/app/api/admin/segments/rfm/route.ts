/**
 * RFM Segments API
 * GET: List RFM segment distribution and customers
 * POST: Trigger RFM calculation
 */
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  calculateRfmScores,
  deleteAllRfmSegments,
  getCustomerOrderAggregates,
  getRfmCustomers,
  getRfmSegmentDistribution,
  upsertRfmCustomer,
} from '@/lib/segments/db'
import { RFM_SEGMENT_INFO, type RfmSegmentType } from '@/lib/segments/types'

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
  const segment = url.searchParams.get('segment') || ''
  const sort = url.searchParams.get('sort') || 'rfm_score'
  const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  const minRfmScore = url.searchParams.get('minRfmScore')
  const maxRfmScore = url.searchParams.get('maxRfmScore')
  const view = url.searchParams.get('view') || 'distribution' // 'distribution' or 'customers'

  try {
    const result = await withTenant(tenantSlug, async () => {
      if (view === 'customers') {
        // Return paginated customer list
        const customers = await getRfmCustomers({
          page,
          limit,
          offset: (page - 1) * limit,
          search,
          segment: segment as RfmSegmentType | '',
          minRfmScore: minRfmScore ? parseInt(minRfmScore, 10) : null,
          maxRfmScore: maxRfmScore ? parseInt(maxRfmScore, 10) : null,
          sort,
          dir,
        })

        return {
          type: 'customers' as const,
          customers: customers.rows.map((row) => ({
            id: row.id,
            customerId: row.customer_id,
            email: row.customer_email,
            name: row.customer_name,
            rScore: row.r_score,
            fScore: row.f_score,
            mScore: row.m_score,
            rfmScore: row.rfm_score,
            segment: row.segment,
            segmentLabel: RFM_SEGMENT_INFO[row.segment]?.label || row.segment,
            segmentColor: RFM_SEGMENT_INFO[row.segment]?.badgeColor || '',
            recencyDays: row.recency_days,
            frequencyCount: row.frequency_count,
            monetaryTotal: row.monetary_total_cents ? row.monetary_total_cents / 100 : null,
            currency: row.currency,
            firstOrderAt: row.first_order_at,
            lastOrderAt: row.last_order_at,
            calculatedAt: row.calculated_at,
          })),
          totalCount: customers.totalCount,
          page,
          limit,
          totalPages: Math.ceil(customers.totalCount / limit),
        }
      }

      // Default: return distribution
      const distribution = await getRfmSegmentDistribution()

      return {
        type: 'distribution' as const,
        total: distribution.total,
        calculatedAt: distribution.calculatedAt,
        segments: distribution.segments.map((seg) => {
          const info = RFM_SEGMENT_INFO[seg.segment as RfmSegmentType]
          return {
            segment: seg.segment,
            label: info?.label || seg.segment,
            description: info?.description || '',
            color: info?.color || '#9CA3AF',
            badgeColor: info?.badgeColor || '',
            count: seg.count,
            percentage: distribution.total > 0 ? (seg.count / distribution.total) * 100 : 0,
            avgMonetaryValue: seg.avg_monetary / 100,
            avgFrequency: seg.avg_frequency,
            avgRecency: seg.avg_recency,
          }
        }),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch RFM data:', error)
    return NextResponse.json({ error: 'Failed to fetch RFM data' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { daysBack = 365, clearExisting = false } = body as {
      daysBack?: number
      clearExisting?: boolean
    }

    const result = await withTenant(tenantSlug, async () => {
      // Optionally clear existing RFM data
      if (clearExisting) {
        await deleteAllRfmSegments()
      }

      // Get order aggregates
      const aggregates = await getCustomerOrderAggregates(daysBack)

      if (aggregates.length === 0) {
        return {
          success: true,
          customersProcessed: 0,
          calculatedAt: new Date().toISOString(),
          message: 'No orders found in the specified time period.',
        }
      }

      // Calculate RFM scores
      const scored = calculateRfmScores(aggregates)

      // Upsert all customers
      let processed = 0
      for (const customer of scored) {
        await upsertRfmCustomer({
          customerId: customer.customerId,
          customerEmail: customer.customerEmail,
          customerName: customer.customerName,
          rScore: customer.rScore,
          fScore: customer.fScore,
          mScore: customer.mScore,
          recencyDays: customer.recencyDays,
          frequencyCount: customer.frequencyCount,
          monetaryTotalCents: customer.monetaryTotalCents,
          currency: 'USD', // Default, could be extracted from orders
          firstOrderAt: customer.firstOrderAt,
          lastOrderAt: customer.lastOrderAt,
        })
        processed++
      }

      return {
        success: true,
        customersProcessed: processed,
        calculatedAt: new Date().toISOString(),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to calculate RFM:', error)
    return NextResponse.json({ error: 'Failed to calculate RFM segments' }, { status: 500 })
  }
}
