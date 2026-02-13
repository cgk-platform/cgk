export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getReviews, createReview } from '@/lib/reviews/db'
import type { ReviewFilters, CreateReviewInput } from '@/lib/reviews/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const filters: ReviewFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))),
    offset: 0,
    status: url.searchParams.get('status') || 'all',
    rating: url.searchParams.get('rating') || '',
    verified: url.searchParams.get('verified') || '',
    product_id: url.searchParams.get('product_id') || undefined,
    search: url.searchParams.get('search') || undefined,
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await getReviews(tenantSlug, filters)

  return NextResponse.json({
    reviews: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / filters.limit),
    },
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateReviewInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.product_id || !body.author_name || !body.author_email || !body.rating) {
    return NextResponse.json(
      { error: 'Missing required fields: product_id, author_name, author_email, rating' },
      { status: 400 },
    )
  }

  if (body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }

  const review = await withTenant(tenantSlug, () => createReview(tenantSlug, body))

  return NextResponse.json({ review }, { status: 201 })
}
