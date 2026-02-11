export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getKeywordHistory, exportKeywordHistoryToCSV } from '@/lib/seo/keyword-tracker'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const keywordId = searchParams.get('keywordId')
  const days = parseInt(searchParams.get('days') || '90', 10)

  if (!keywordId) {
    return NextResponse.json({ error: 'Keyword ID is required' }, { status: 400 })
  }

  // Check if export is requested
  if (searchParams.get('export') === 'csv') {
    try {
      const csv = await withTenant(tenantSlug, () => exportKeywordHistoryToCSV(keywordId))
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="keyword-history-${keywordId}.csv"`,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const history = await withTenant(tenantSlug, () => getKeywordHistory(keywordId, days))

  return NextResponse.json({ history })
}
