export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { bulkModerateReviews } from '@/lib/reviews/db'

const VALID_ACTIONS = ['approve', 'reject', 'spam', 'verify', 'unverify', 'delete'] as const
type BulkAction = (typeof VALID_ACTIONS)[number]

interface BulkActionRequest {
  action: BulkAction
  review_ids: string[]
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: BulkActionRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    )
  }

  if (!body.review_ids || !Array.isArray(body.review_ids) || body.review_ids.length === 0) {
    return NextResponse.json({ error: 'review_ids must be a non-empty array' }, { status: 400 })
  }

  const affected = await bulkModerateReviews(tenantSlug, body.review_ids, body.action)

  return NextResponse.json({ success: true, affected })
}
