export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getGiftCardEmails, getEmailStats, type GiftCardEmailStatus } from '@/lib/gift-card'

/**
 * GET /api/admin/gift-cards/emails
 * Get gift card emails with filters
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as GiftCardEmailStatus | null
  const search = searchParams.get('search') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit
  const includeStats = searchParams.get('include_stats') === 'true'

  const result = await withTenant(tenantSlug, async () => {
    const { rows, totalCount } = await getGiftCardEmails({
      status: status || undefined,
      search,
      page,
      limit,
      offset,
    })

    const response: {
      emails: typeof rows
      pagination: {
        page: number
        limit: number
        total_count: number
        total_pages: number
      }
      stats?: Awaited<ReturnType<typeof getEmailStats>>
    } = {
      emails: rows,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    }

    if (includeStats) {
      response.stats = await getEmailStats()
    }

    return response
  })

  return NextResponse.json(result)
}
