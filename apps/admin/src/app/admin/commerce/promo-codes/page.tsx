import { withTenant, sql } from '@cgk-platform/db'
import { Button, Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { PromoCodeStatusBadge } from '@/components/commerce/status-badge'
import { formatMoney, formatDateTime } from '@/lib/format'
import { parsePromoCodeFilters, buildFilterUrl } from '@/lib/search-params'

interface PromoCodeRow {
  id: string
  code: string
  shopify_discount_id: string | null
  creator_id: string | null
  creator_name: string | null
  commission_percent: number | null
  redirect_target: string
  uses_count: number
  revenue_generated_cents: number
  created_at: string
}

const PROMO_CODE_STATUSES = ['active', 'scheduled', 'expired', 'disabled']

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parsePromoCodeFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/commerce/promo-codes/bulk">Bulk Generate</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/commerce/promo-codes/new">Create Code</Link>
          </Button>
        </div>
      </div>

      <PromoCodeFilterBar filters={filters} />

      <Suspense fallback={<PromoCodesTableSkeleton />}>
        <PromoCodesLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function PromoCodeFilterBar({
  filters,
}: {
  filters: ReturnType<typeof parsePromoCodeFilters>
}) {
  const base = '/admin/commerce/promo-codes'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search codes..." />
      </div>
      <FilterSelect
        label="Status"
        value={filters.status}
        options={PROMO_CODE_STATUSES}
        paramName="status"
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
  filters: ReturnType<typeof parsePromoCodeFilters>
  basePath: string
}) {
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    type: filters.type || undefined,
    creatorId: filters.creatorId || undefined,
    sort: filters.sort !== 'created_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <div className="flex gap-1">
        <Link
          href={buildFilterUrl(basePath, { ...filterParams, [paramName]: undefined })}
          className={`rounded-md px-2 py-1 text-xs ${
            !value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          All
        </Link>
        {options.map((opt) => (
          <Link
            key={opt}
            href={buildFilterUrl(basePath, {
              ...filterParams,
              [paramName]: opt,
              page: undefined,
            })}
            className={`rounded-md px-2 py-1 text-xs capitalize ${
              value === opt
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {opt.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>
    </div>
  )
}

async function PromoCodesLoader({
  filters,
}: {
  filters: ReturnType<typeof parsePromoCodeFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug)
    return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.search) {
      paramIndex++
      conditions.push(`p.code ILIKE $${paramIndex}`)
      values.push(`%${filters.search}%`)
    }

    if (filters.creatorId) {
      paramIndex++
      conditions.push(`p.creator_id = $${paramIndex}`)
      values.push(filters.creatorId)
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sortCol = filters.sort === 'uses_count' ? 'uses_count' : 'created_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        p.id, p.code, p.shopify_discount_id, p.creator_id,
        c.display_name as creator_name,
        p.commission_percent, p.redirect_target,
        p.uses_count, p.revenue_generated_cents, p.created_at
       FROM promo_code_metadata p
       LEFT JOIN creators c ON c.id = p.creator_id
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir} NULLS LAST
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM promo_code_metadata p ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as PromoCodeRow[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/commerce/promo-codes'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    type: filters.type || undefined,
    creatorId: filters.creatorId || undefined,
    sort: filters.sort !== 'created_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<PromoCodeRow>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-medium">{row.code}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <PromoCodeStatusBadge status={row.shopify_discount_id ? 'active' : 'disabled'} />
      ),
    },
    {
      key: 'creator_name',
      header: 'Creator',
      render: (row) =>
        row.creator_name ? (
          <Link
            href={buildFilterUrl(basePath, {
              ...currentFilters,
              creatorId: row.creator_id || undefined,
            })}
            className="text-primary hover:underline"
          >
            {row.creator_name}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'commission_percent',
      header: 'Commission',
      className: 'text-right',
      render: (row) =>
        row.commission_percent ? (
          <span>{row.commission_percent}%</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'uses_count',
      header: 'Uses',
      sortable: true,
      className: 'text-right',
      render: (row) => row.uses_count.toLocaleString(),
    },
    {
      key: 'revenue_generated_cents',
      header: 'Revenue',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">
          {formatMoney(row.revenue_generated_cents)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <CopyLinkButton code={row.code} />
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/commerce/promo-codes/${row.code}`}>Edit</Link>
          </Button>
        </div>
      ),
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

function CopyLinkButton({ code: _code }: { code: string }) {
  return (
    <Button variant="outline" size="sm" className="text-xs">
      Copy Link
    </Button>
  )
}

function PromoCodesTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
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
