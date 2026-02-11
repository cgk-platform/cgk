import { withTenant, sql } from '@cgk/db'
import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { OrderStatusBadge, FulfillmentBadge, FinancialBadge } from '@/components/commerce/status-badge'
import { formatDateTime, formatMoney } from '@/lib/format'
import { parseOrderFilters, buildFilterUrl } from '@/lib/search-params'

interface OrderRow {
  id: string
  order_number: string
  customer_email: string | null
  status: string
  fulfillment_status: string
  financial_status: string
  total_cents: number
  currency: string
  order_placed_at: string | null
}

const ORDER_SORT_COLUMNS: Record<string, string> = {
  order_placed_at: 'order_placed_at',
  total_cents: 'total_cents',
  order_number: 'order_number',
  status: 'status',
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const FULFILLMENT_STATUSES = ['unfulfilled', 'partial', 'fulfilled']
const FINANCIAL_STATUSES = ['pending', 'authorized', 'paid', 'partially_paid', 'partially_refunded', 'refunded', 'voided']

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseOrderFilters(params)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>

      <OrderFilterBar filters={filters} />

      <Suspense fallback={<OrdersTableSkeleton />}>
        <OrdersLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function OrderFilterBar({ filters }: { filters: ReturnType<typeof parseOrderFilters> }) {
  const base = '/admin/commerce/orders'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search orders..." />
      </div>
      <FilterSelect
        label="Status"
        value={filters.status}
        options={ORDER_STATUSES}
        paramName="status"
        filters={filters}
        basePath={base}
      />
      <FilterSelect
        label="Fulfillment"
        value={filters.fulfillment}
        options={FULFILLMENT_STATUSES}
        paramName="fulfillment"
        filters={filters}
        basePath={base}
      />
      <FilterSelect
        label="Payment"
        value={filters.financial}
        options={FINANCIAL_STATUSES}
        paramName="financial"
        filters={filters}
        basePath={base}
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  paramName,
  filters,
  basePath,
}: {
  label: string
  value: string
  options: string[]
  paramName: string
  filters: ReturnType<typeof parseOrderFilters>
  basePath: string
}) {
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    fulfillment: filters.fulfillment || undefined,
    financial: filters.financial || undefined,
    sort: filters.sort !== 'order_placed_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <div className="flex gap-1">
        <Link
          href={buildFilterUrl(basePath, { ...filterParams, [paramName]: undefined })}
          className={`rounded-md px-2 py-1 text-xs ${!value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          All
        </Link>
        {options.map((opt) => (
          <Link
            key={opt}
            href={buildFilterUrl(basePath, { ...filterParams, [paramName]: opt, page: undefined })}
            className={`rounded-md px-2 py-1 text-xs capitalize ${value === opt ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {opt.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>
    </div>
  )
}

async function OrdersLoader({ filters }: { filters: ReturnType<typeof parseOrderFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.search) {
      paramIndex++
      conditions.push(`(order_number ILIKE $${paramIndex} OR customer_email ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }
    if (filters.status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}::order_status`)
      values.push(filters.status)
    }
    if (filters.fulfillment) {
      paramIndex++
      conditions.push(`fulfillment_status = $${paramIndex}::fulfillment_status`)
      values.push(filters.fulfillment)
    }
    if (filters.financial) {
      paramIndex++
      conditions.push(`financial_status = $${paramIndex}::financial_status`)
      values.push(filters.financial)
    }
    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`order_placed_at >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      paramIndex++
      conditions.push(`order_placed_at <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortCol = ORDER_SORT_COLUMNS[filters.sort] || 'order_placed_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT id, order_number, customer_email, status, fulfillment_status, financial_status,
              total_cents, currency, order_placed_at
       FROM orders ${whereClause}
       ORDER BY ${sortCol} ${sortDir} NULLS LAST
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM orders ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as OrderRow[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/commerce/orders'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    fulfillment: filters.fulfillment || undefined,
    financial: filters.financial || undefined,
    sort: filters.sort !== 'order_placed_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<OrderRow>[] = [
    {
      key: 'order_number',
      header: 'Order',
      sortable: true,
      render: (row) => (
        <Link href={`/admin/commerce/orders/${row.id}`} className="font-medium text-primary hover:underline">
          #{row.order_number}
        </Link>
      ),
    },
    {
      key: 'customer_email',
      header: 'Customer',
      render: (row) => row.customer_email || <span className="text-muted-foreground">N/A</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <OrderStatusBadge status={row.status} />,
    },
    {
      key: 'fulfillment_status',
      header: 'Fulfillment',
      render: (row) => <FulfillmentBadge status={row.fulfillment_status} />,
    },
    {
      key: 'financial_status',
      header: 'Payment',
      render: (row) => <FinancialBadge status={row.financial_status} />,
    },
    {
      key: 'total_cents',
      header: 'Total',
      sortable: true,
      className: 'text-right',
      render: (row) => <span className="font-medium">{formatMoney(row.total_cents, row.currency)}</span>,
    },
    {
      key: 'order_placed_at',
      header: 'Date',
      sortable: true,
      render: (row) => row.order_placed_at ? formatDateTime(row.order_placed_at) : '—',
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort={filters.sort}
        currentDir={filters.dir}
      />
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

function OrdersTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
