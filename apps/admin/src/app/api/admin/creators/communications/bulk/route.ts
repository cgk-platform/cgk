export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createBulkSend,
  getBulkSends,
} from '@/lib/creator-communications/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)

  const { rows, totalCount } = await getBulkSends(tenantSlug, page, limit)

  return NextResponse.json({
    bulkSends: rows,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const {
    name,
    subject,
    content_html,
    content_text,
    recipient_filter,
    recipient_ids,
    scheduled_for,
    personalize,
    include_unsubscribe,
    send_as_separate_threads,
  } = body

  if (!subject || !content_html) {
    return NextResponse.json(
      { error: 'subject and content_html are required' },
      { status: 400 },
    )
  }

  if (!recipient_filter && (!recipient_ids || recipient_ids.length === 0)) {
    return NextResponse.json(
      { error: 'Either recipient_filter or recipient_ids is required' },
      { status: 400 },
    )
  }

  const bulkSend = await createBulkSend(
    tenantSlug,
    {
      name,
      subject,
      content_html,
      content_text,
      recipient_filter,
      recipient_ids,
      scheduled_for,
      personalize,
      include_unsubscribe,
      send_as_separate_threads,
    },
    userId,
  )

  return NextResponse.json({
    success: true,
    bulkSend,
    recipientCount: bulkSend.recipient_count,
  })
}
