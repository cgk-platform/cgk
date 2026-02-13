import { withTenant, sql } from '@cgk-platform/db'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { PromotionStatusBadge } from '@/components/commerce/status-badge'
import { formatDateTime } from '@/lib/format'
import { parsePromotionFilters, buildFilterUrl } from '@/lib/search-params'
// PROMOTION_PRESETS is available for preset dropdown functionality
import type { PromotionStatus } from '@/lib/promotions/types'

interface PromotionRow {
  id: string
  name: string
  description: string | null
  status: PromotionStatus
  starts_at: string
  ends_at: string
  sitewide_discount_percent: number | null
  subscription_discount_percent: number | null
  banner_text: string | null
  badge_text: string | null
  banner_background_color: string
  promo_code: string | null
  created_at: string
}

const PROMOTION_STATUSES = ['scheduled', 'active', 'ended', 'disabled']

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parsePromotionFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promotions</h1>
          <p className="text-muted-foreground">
            Schedule sales, discounts, and promotional campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <PresetsDropdown />
          <Button asChild>
            <Link href="/admin/commerce/promotions/new">Create Promotion</Link>
          </Button>
        </div>
      </div>

      <PromotionFilterBar filters={filters} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<PromotionsCalendarSkeleton />}>
            <PromotionsCalendar filters={filters} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<UpcomingPromotionsSkeleton />}>
            <UpcomingPromotions />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<PromotionsListSkeleton />}>
        <PromotionsListLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function PresetsDropdown() {
  return (
    <div className="relative">
      <Button variant="outline">
        Quick Presets
      </Button>
    </div>
  )
}

function PromotionFilterBar({
  filters,
}: {
  filters: ReturnType<typeof parsePromotionFilters>
}) {
  const base = '/admin/commerce/promotions'
  const filterParams: Record<string, string | number | undefined> = {
    status: filters.status || undefined,
    includeEnded: filters.includeEnded ? undefined : 'false',
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        <Link
          href={buildFilterUrl(base, { ...filterParams, status: undefined })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !filters.status
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          All
        </Link>
        {PROMOTION_STATUSES.map((status) => (
          <Link
            key={status}
            href={buildFilterUrl(base, { ...filterParams, status })}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              filters.status === status
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {status}
          </Link>
        ))}
      </div>
      <div className="ml-auto">
        <Link
          href={buildFilterUrl(base, {
            ...filterParams,
            includeEnded: filters.includeEnded ? 'false' : undefined,
          })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !filters.includeEnded ? 'bg-muted' : ''
          }`}
        >
          {filters.includeEnded ? 'Hide Ended' : 'Show Ended'}
        </Link>
      </div>
    </div>
  )
}

async function PromotionsCalendar({
  filters: _filters,
}: {
  filters: ReturnType<typeof parsePromotionFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug)
    return <p className="text-muted-foreground">No tenant configured.</p>

  // Get current month range
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const promotions = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, name, status, starts_at, ends_at,
        sitewide_discount_percent, badge_text,
        banner_background_color
      FROM scheduled_promotions
      WHERE (starts_at <= ${endOfMonth.toISOString()}::timestamptz
             AND ends_at >= ${startOfMonth.toISOString()}::timestamptz)
      ORDER BY starts_at ASC
    `
    return result.rows as Pick<
      PromotionRow,
      | 'id'
      | 'name'
      | 'status'
      | 'starts_at'
      | 'ends_at'
      | 'sitewide_discount_percent'
      | 'badge_text'
      | 'banner_background_color'
    >[]
  })

  // Generate calendar grid
  const daysInMonth = endOfMonth.getDate()
  const firstDayOfWeek = startOfMonth.getDay()
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(firstDayOfWeek).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  const monthName = startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{monthName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="bg-background p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {weeks.flat().map((day, index) => {
            if (day === null) {
              return (
                <div key={`empty-${index}`} className="min-h-[80px] bg-muted/30" />
              )
            }

            const cellDate = new Date(now.getFullYear(), now.getMonth(), day)
            const dayPromotions = promotions.filter((p) => {
              const start = new Date(p.starts_at)
              const end = new Date(p.ends_at)
              return cellDate >= start && cellDate <= end
            })

            const isToday =
              day === now.getDate() &&
              now.getMonth() === startOfMonth.getMonth()

            return (
              <div
                key={day}
                className={`min-h-[80px] bg-background p-1 ${
                  isToday ? 'ring-2 ring-primary ring-inset' : ''
                }`}
              >
                <div
                  className={`mb-1 text-xs ${
                    isToday ? 'font-bold text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayPromotions.slice(0, 2).map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/commerce/promotions/${p.id}`}
                      className="block truncate rounded px-1 py-0.5 text-[10px] text-white"
                      style={{ backgroundColor: p.banner_background_color }}
                    >
                      {p.name}
                    </Link>
                  ))}
                  {dayPromotions.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayPromotions.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

async function UpcomingPromotions() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const promotions = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, name, status, starts_at, ends_at, badge_text, banner_background_color
      FROM scheduled_promotions
      WHERE status IN ('scheduled', 'active')
      ORDER BY starts_at ASC
      LIMIT 5
    `
    return result.rows as Pick<
      PromotionRow,
      'id' | 'name' | 'status' | 'starts_at' | 'ends_at' | 'badge_text' | 'banner_background_color'
    >[]
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Sales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {promotions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming promotions</p>
        ) : (
          promotions.map((p) => (
            <Link
              key={p.id}
              href={`/admin/commerce/promotions/${p.id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                <PromotionStatusBadge status={p.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(p.starts_at)} - {formatDateTime(p.ends_at)}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

async function PromotionsListLoader({
  filters,
}: {
  filters: ReturnType<typeof parsePromotionFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug)
    return <p className="text-muted-foreground">No tenant configured.</p>

  const promotions = await withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}::promotion_status`)
      values.push(filters.status)
    }

    if (!filters.includeEnded) {
      conditions.push(`status != 'ended'`)
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const result = await sql.query(
      `SELECT
        id, name, description, status, starts_at, ends_at,
        sitewide_discount_percent, subscription_discount_percent,
        banner_text, badge_text, banner_background_color, promo_code, created_at
       FROM scheduled_promotions
       ${whereClause}
       ORDER BY starts_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    return result.rows as PromotionRow[]
  })

  if (promotions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="mb-2 text-lg font-medium">No promotions found</h3>
          <p className="mb-4 text-muted-foreground">
            Create a promotion to schedule sales and discounts.
          </p>
          <Button asChild>
            <Link href="/admin/commerce/promotions/new">
              Create Your First Promotion
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Promotions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {promotions.map((promo) => (
            <Link
              key={promo.id}
              href={`/admin/commerce/promotions/${promo.id}`}
              className="flex items-center justify-between py-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-10 w-10 rounded"
                  style={{ backgroundColor: promo.banner_background_color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{promo.name}</span>
                    <PromotionStatusBadge status={promo.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(promo.starts_at)} -{' '}
                    {formatDateTime(promo.ends_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {promo.sitewide_discount_percent && (
                  <span>{promo.sitewide_discount_percent}% sitewide</span>
                )}
                {promo.subscription_discount_percent && (
                  <span>{promo.subscription_discount_percent}% subscriptions</span>
                )}
                {promo.promo_code && (
                  <Badge variant="outline">{promo.promo_code}</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PromotionsCalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function UpcomingPromotionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </CardContent>
    </Card>
  )
}

function PromotionsListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-64 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
