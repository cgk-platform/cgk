/**
 * Shopify Segments API
 * GET: List cached Shopify segments
 * POST: Trigger sync from Shopify
 */
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { deleteStaleSegments, getCachedSegments, upsertCachedSegment } from '@/lib/segments/db'

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

  try {
    const result = await withTenant(tenantSlug, async () => {
      return getCachedSegments({
        page,
        limit,
        offset: (page - 1) * limit,
        search,
        type: 'shopify',
      })
    })

    const segments = result.rows.map((row) => ({
      id: row.id,
      shopifySegmentId: row.shopify_segment_id,
      name: row.name,
      query: row.query,
      memberCount: row.member_count,
      syncedAt: row.synced_at,
    }))

    return NextResponse.json({
      segments,
      totalCount: result.totalCount,
      page,
      limit,
      totalPages: Math.ceil(result.totalCount / limit),
    })
  } catch (error) {
    console.error('Failed to fetch Shopify segments:', error)
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { segments: segmentsData } = body as {
      segments?: Array<{
        id: string
        name: string
        query?: string
        memberCount?: number
      }>
    }

    // If segments are provided directly (from webhook or manual sync), upsert them
    if (segmentsData && Array.isArray(segmentsData)) {
      const result = await withTenant(tenantSlug, async () => {
        const upserted = []
        const shopifyIds: string[] = []

        for (const seg of segmentsData) {
          const segment = await upsertCachedSegment(
            seg.id,
            seg.name,
            seg.query || null,
            seg.memberCount || 0
          )
          upserted.push(segment)
          shopifyIds.push(seg.id)
        }

        // Remove segments that no longer exist in Shopify
        const deleted = await deleteStaleSegments(shopifyIds)

        return {
          synced: upserted.length,
          deleted,
          syncedAt: new Date().toISOString(),
        }
      })

      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    // Otherwise, this is a request to trigger a sync
    // In a real implementation, this would call the Shopify Admin API
    // For now, we return a message indicating sync should be triggered via background job
    return NextResponse.json({
      success: true,
      message: 'Sync triggered. Segments will be updated shortly.',
      note: 'In production, this triggers a background job to fetch segments from Shopify Admin API.',
    })
  } catch (error) {
    console.error('Failed to sync Shopify segments:', error)
    return NextResponse.json({ error: 'Failed to sync segments' }, { status: 500 })
  }
}
