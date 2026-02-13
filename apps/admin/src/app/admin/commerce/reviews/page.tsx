import { withTenant, sql } from '@cgk-platform/db'
import { Badge, Card, CardContent } from '@cgk-platform/ui'
import { Star } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { ReviewActions } from './review-actions'

import { Pagination } from '@/components/commerce/pagination'
import { ReviewStatusBadge } from '@/components/commerce/status-badge'
import { formatDate } from '@/lib/format'
import { parseReviewFilters, buildFilterUrl } from '@/lib/search-params'

interface ReviewRow {
  id: string
  product_id: string
  product_title: string | null
  author_name: string
  author_email: string
  is_verified_purchase: boolean
  rating: number
  title: string | null
  body: string | null
  status: string
  response_body: string | null
  response_author: string | null
  responded_at: string | null
  created_at: string
}

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const RATINGS = ['5', '4', '3', '2', '1']

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseReviewFilters(params)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reviews</h1>

      <ReviewFilterBar filters={filters} />

      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function ReviewFilterBar({ filters }: { filters: ReturnType<typeof parseReviewFilters> }) {
  const base = '/admin/commerce/reviews'
  const filterParams: Record<string, string | number | undefined> = {
    rating: filters.rating || undefined,
    verified: filters.verified || undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex gap-1">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildFilterUrl(base, { ...filterParams, status: tab.value, page: undefined })}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filters.status === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rating:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, status: filters.status, rating: undefined, page: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.rating ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {RATINGS.map((r) => (
            <Link
              key={r}
              href={buildFilterUrl(base, { ...filterParams, status: filters.status, rating: r, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs ${filters.rating === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {r} star
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Verified:</span>
        <div className="flex gap-1">
          {[
            { label: 'All', value: '' },
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={buildFilterUrl(base, { ...filterParams, status: filters.status, verified: opt.value || undefined, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs ${filters.verified === opt.value || (!filters.verified && !opt.value) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function ReviewsLoader({ filters }: { filters: ReturnType<typeof parseReviewFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status && filters.status !== 'all') {
      paramIndex++
      conditions.push(`r.status = $${paramIndex}::review_status`)
      values.push(filters.status)
    }
    if (filters.rating) {
      paramIndex++
      conditions.push(`r.rating = $${paramIndex}`)
      values.push(parseInt(filters.rating, 10))
    }
    if (filters.verified === 'true') {
      conditions.push('r.is_verified_purchase = true')
    } else if (filters.verified === 'false') {
      conditions.push('r.is_verified_purchase = false')
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT r.id, r.product_id, p.title as product_title,
              r.author_name, r.author_email, r.is_verified_purchase,
              r.rating, r.title, r.body, r.status,
              r.response_body, r.response_author, r.responded_at,
              r.created_at
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM reviews r ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as ReviewRow[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/commerce/reviews'
  const currentFilters: Record<string, string | number | undefined> = {
    status: filters.status,
    rating: filters.rating || undefined,
    verified: filters.verified || undefined,
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No reviews found matching your filters.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={filters.limit}
        basePath={basePath}
        currentFilters={currentFilters}
      />
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewRow }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <ReviewStatusBadge status={review.status} />
              {review.is_verified_purchase && (
                <Badge variant="info">Verified Purchase</Badge>
              )}
            </div>

            {review.title && <p className="font-medium">{review.title}</p>}
            {review.body && (
              <p className="line-clamp-3 text-sm text-muted-foreground">{review.body}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{review.author_name}</span>
              {review.product_title && (
                <>
                  <span>&middot;</span>
                  <span>{review.product_title}</span>
                </>
              )}
              <span>&middot;</span>
              <span>{formatDate(review.created_at)}</span>
            </div>

            {review.response_body && (
              <div className="mt-3 rounded-md border-l-2 border-primary/30 bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Response by {review.response_author}
                </p>
                <p className="mt-1 text-sm">{review.response_body}</p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <ReviewActions reviewId={review.id} currentStatus={review.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-12 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
