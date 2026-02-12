/**
 * Combined Segments API
 * GET: List all segments (Shopify + RFM)
 */
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCachedSegments, getRfmSegmentDistribution } from '@/lib/segments/db'
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
  const type = url.searchParams.get('type') || 'all'

  try {
    const result = await withTenant(tenantSlug, async () => {
      const segments: {
        shopify: Array<{
          id: string
          name: string
          type: 'shopify'
          memberCount: number
          query: string | null
          syncedAt: string
        }>
        rfm: Array<{
          id: string
          name: string
          type: 'rfm'
          memberCount: number
          description: string
          color: string
        }>
        rfmDistribution: {
          total: number
          calculatedAt: string | null
        }
      } = {
        shopify: [],
        rfm: [],
        rfmDistribution: { total: 0, calculatedAt: null },
      }

      // Get Shopify segments if requested
      if (type === 'all' || type === 'shopify') {
        const { rows } = await getCachedSegments({
          page: 1,
          limit: 100,
          offset: 0,
          search: '',
          type: 'shopify',
        })
        segments.shopify = rows.map((row) => ({
          id: row.id,
          name: row.name,
          type: 'shopify' as const,
          memberCount: row.member_count,
          query: row.query,
          syncedAt: row.synced_at,
        }))
      }

      // Get RFM segment distribution if requested
      if (type === 'all' || type === 'rfm') {
        const distribution = await getRfmSegmentDistribution()
        segments.rfmDistribution = {
          total: distribution.total,
          calculatedAt: distribution.calculatedAt,
        }

        // Create segment entries from distribution
        segments.rfm = distribution.segments.map((seg) => {
          const info = RFM_SEGMENT_INFO[seg.segment as RfmSegmentType]
          return {
            id: seg.segment,
            name: info?.label || seg.segment,
            type: 'rfm' as const,
            memberCount: seg.count,
            description: info?.description || '',
            color: info?.color || '#9CA3AF',
          }
        })
      }

      return segments
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch segments:', error)
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}
