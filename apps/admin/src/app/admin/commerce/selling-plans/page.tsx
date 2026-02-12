import { withTenant, sql } from '@cgk/db'
import { Button, Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { SellingPlanStatusBadge, DiscountTypeBadge } from '@/components/commerce/status-badge'
import { parseSellingPlanFilters, buildFilterUrl } from '@/lib/search-params'
import { formatInterval, formatDiscount } from '@/lib/selling-plans/types'
import type { SellingPlanIntervalUnit, SellingPlanDiscountType } from '@/lib/selling-plans/types'

interface SellingPlanRow {
  id: string
  name: string
  internal_name: string | null
  selector_title: string
  priority: number
  interval_unit: SellingPlanIntervalUnit
  interval_count: number
  discount_type: SellingPlanDiscountType
  discount_value: number
  discount_after_payment: number | null
  discount_after_value: number | null
  shopify_selling_plan_id: string | null
  is_active: boolean
  created_at: string
  product_count: number
}

export default async function SellingPlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseSellingPlanFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Selling Plans</h1>
          <p className="text-muted-foreground">
            Configure subscription intervals and discount structures
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/commerce/selling-plans/new">Create Plan</Link>
        </Button>
      </div>

      <SellingPlanFilterBar filters={filters} />

      <Suspense fallback={<SellingPlansTableSkeleton />}>
        <SellingPlansLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function SellingPlanFilterBar({
  filters,
}: {
  filters: ReturnType<typeof parseSellingPlanFilters>
}) {
  const base = '/admin/commerce/selling-plans'
  const filterParams: Record<string, string | number | undefined> = {
    activeOnly: filters.activeOnly ? 'true' : undefined,
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        <Link
          href={buildFilterUrl(base, { ...filterParams, activeOnly: undefined })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !filters.activeOnly
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          All Plans
        </Link>
        <Link
          href={buildFilterUrl(base, { ...filterParams, activeOnly: 'true' })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            filters.activeOnly
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          Active Only
        </Link>
      </div>
    </div>
  )
}

async function SellingPlansLoader({
  filters,
}: {
  filters: ReturnType<typeof parseSellingPlanFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug)
    return <p className="text-muted-foreground">No tenant configured.</p>

  const rows = await withTenant(tenantSlug, async () => {
    const whereClause = filters.activeOnly ? 'WHERE sp.is_active = true' : ''

    const result = await sql.query(
      `SELECT
        sp.id, sp.name, sp.internal_name, sp.selector_title, sp.priority,
        sp.interval_unit, sp.interval_count,
        sp.discount_type, sp.discount_value,
        sp.discount_after_payment, sp.discount_after_value,
        sp.shopify_selling_plan_id, sp.is_active, sp.created_at,
        COUNT(spp.id)::integer as product_count
       FROM selling_plans sp
       LEFT JOIN selling_plan_products spp ON spp.selling_plan_id = sp.id
       ${whereClause}
       GROUP BY sp.id
       ORDER BY sp.priority ASC, sp.name ASC
       LIMIT $1 OFFSET $2`,
      [filters.limit, filters.offset],
    )

    return result.rows as SellingPlanRow[]
  })

  const basePath = '/admin/commerce/selling-plans'
  const currentFilters: Record<string, string | number | undefined> = {
    activeOnly: filters.activeOnly ? 'true' : undefined,
  }

  const columns: Column<SellingPlanRow>[] = [
    {
      key: 'priority',
      header: '#',
      className: 'w-12',
      render: (row) => (
        <span className="text-muted-foreground">{row.priority}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <Link
            href={`/admin/commerce/selling-plans/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.name}
          </Link>
          {row.internal_name && (
            <p className="text-xs text-muted-foreground">{row.internal_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'selector_title',
      header: 'Customer Label',
      render: (row) => row.selector_title,
    },
    {
      key: 'interval',
      header: 'Interval',
      render: (row) => formatInterval(row.interval_unit, row.interval_count),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (row) => (
        <div className="flex items-center gap-2">
          <DiscountTypeBadge type={row.discount_type} />
          <span>{formatDiscount(row.discount_type, row.discount_value)}</span>
        </div>
      ),
    },
    {
      key: 'discount_window',
      header: 'After Window',
      render: (row) =>
        row.discount_after_payment && row.discount_after_value ? (
          <span className="text-sm">
            After {row.discount_after_payment} payments:{' '}
            {formatDiscount(row.discount_type, row.discount_after_value)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'product_count',
      header: 'Products',
      className: 'text-right',
      render: (row) => row.product_count.toLocaleString(),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => <SellingPlanStatusBadge isActive={row.is_active} />,
    },
    {
      key: 'shopify',
      header: 'Synced',
      render: (row) =>
        row.shopify_selling_plan_id ? (
          <span className="text-green-600">Yes</span>
        ) : (
          <span className="text-muted-foreground">No</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/commerce/selling-plans/${row.id}`}>Edit</Link>
        </Button>
      ),
    },
  ]

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="mb-2 text-lg font-medium">No selling plans yet</h3>
          <p className="mb-4 text-muted-foreground">
            Create selling plans to offer subscription options to customers.
          </p>
          <Button asChild>
            <Link href="/admin/commerce/selling-plans/new">
              Create Your First Plan
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <DataTable
      columns={columns}
      rows={rows}
      keyFn={(r) => r.id}
      basePath={basePath}
      currentFilters={currentFilters}
      currentSort="priority"
      currentDir="asc"
    />
  )
}

function SellingPlansTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
