import { withTenant, sql } from '@cgk-platform/db'
import { Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { formatDate, formatMoney } from '@/lib/format'
import { parseCustomerFilters } from '@/lib/search-params'

interface CustomerRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  orders_count: number
  total_spent_cents: number
  currency: string
  created_at: string
}

const CUSTOMER_SORT_COLUMNS: Record<string, string> = {
  total_spent_cents: 'total_spent_cents',
  orders_count: 'orders_count',
  created_at: 'created_at',
  email: 'email',
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseCustomerFilters(params)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>

      <div className="w-64">
        <SearchInput placeholder="Search customers..." />
      </div>

      <Suspense fallback={<CustomersTableSkeleton />}>
        <CustomersLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function CustomersLoader({ filters }: { filters: ReturnType<typeof parseCustomerFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.search) {
      paramIndex++
      conditions.push(
        `(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`,
      )
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortCol = CUSTOMER_SORT_COLUMNS[filters.sort] || 'total_spent_cents'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT id, first_name, last_name, email, phone, orders_count, total_spent_cents, currency, created_at
       FROM customers ${whereClause}
       ORDER BY ${sortCol} ${sortDir} NULLS LAST
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM customers ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as CustomerRow[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/commerce/customers'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    sort: filters.sort !== 'total_spent_cents' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => {
        const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unknown'
        return (
          <Link href={`/admin/commerce/customers/${row.id}`} className="font-medium text-primary hover:underline">
            {name}
          </Link>
        )
      },
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (row) => row.email || <span className="text-muted-foreground">N/A</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => row.phone || <span className="text-muted-foreground">N/A</span>,
    },
    {
      key: 'orders_count',
      header: 'Orders',
      sortable: true,
      className: 'text-right',
      render: (row) => row.orders_count,
    },
    {
      key: 'total_spent_cents',
      header: 'Lifetime Value',
      sortable: true,
      className: 'text-right',
      render: (row) => <span className="font-medium">{formatMoney(row.total_spent_cents, row.currency)}</span>,
    },
    {
      key: 'created_at',
      header: 'Since',
      sortable: true,
      render: (row) => formatDate(row.created_at),
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

function CustomersTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
