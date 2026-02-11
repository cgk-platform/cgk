export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getEmailLogs } from '@/lib/reviews/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const queueId = url.searchParams.get('queue_id') || undefined
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10))

  const result = await getEmailLogs(tenantSlug, queueId, limit, offset)

  return NextResponse.json({
    logs: result.rows,
    totalCount: result.totalCount,
  })
}
