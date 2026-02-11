export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  cancelQueueEntries,
  getQueueEntries,
  getQueueStats,
  retryQueueEntries,
} from '@/lib/creator-communications/db'
import type { QueueFilters, QueueStatus } from '@/lib/creator-communications/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  const statusParam = url.searchParams.get('status')
  let status: QueueStatus | QueueStatus[] | undefined
  if (statusParam) {
    status = statusParam.includes(',')
      ? (statusParam.split(',') as QueueStatus[])
      : (statusParam as QueueStatus)
  }

  const filters: QueueFilters = {
    status,
    creator_id: url.searchParams.get('creatorId') || undefined,
    template_id: url.searchParams.get('templateId') || undefined,
    date_from: url.searchParams.get('dateFrom') || undefined,
    date_to: url.searchParams.get('dateTo') || undefined,
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '20', 10),
  }

  const [{ rows, totalCount }, stats] = await Promise.all([
    getQueueEntries(tenantSlug, filters),
    getQueueStats(tenantSlug),
  ])

  return NextResponse.json({
    emails: rows,
    stats,
    totalCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / filters.limit),
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { action, emailIds } = body

  if (!action || !emailIds || !Array.isArray(emailIds)) {
    return NextResponse.json(
      { error: 'action and emailIds are required' },
      { status: 400 },
    )
  }

  let affected = 0

  switch (action) {
    case 'retry':
      affected = await retryQueueEntries(tenantSlug, emailIds)
      break
    case 'cancel':
      affected = await cancelQueueEntries(tenantSlug, emailIds)
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true, affected })
}
