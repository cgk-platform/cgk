export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { retryEmailQueueItems } from '@/lib/reviews/db'

interface RetryRequest {
  queue_ids: string[]
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: RetryRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.queue_ids || !Array.isArray(body.queue_ids) || body.queue_ids.length === 0) {
    return NextResponse.json({ error: 'queue_ids must be a non-empty array' }, { status: 400 })
  }

  const retried = await retryEmailQueueItems(tenantSlug, body.queue_ids)

  return NextResponse.json({ success: true, retried })
}
