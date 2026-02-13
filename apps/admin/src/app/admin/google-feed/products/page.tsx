import { withTenant, sql } from '@cgk-platform/db'
import { Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { formatMoney } from '@/lib/format'

interface ProductRow {
  id: string
  shopifyProductId: string
  title: string
  handle: string
  thumbnail: string | null
  priceCents: number
  currency: string
  inventoryQuantity: number | null
  feedStatus: 'included' | 'excluded' | 'error'
  syncStatus: string | null
  merchantStatus: string | null
  issueCount: number
  updatedAt: string
}

const FEED_STATUSES = ['all', 'included', 'excluded', 'errors']

function parseFilters(params: Record<string, string | string[] | undefined>) {
  return {
    page: parseInt(String(params.page || '1'), 10),
    limit: Math.min(parseInt(String(params.limit || '20'), 10), 100),
    status: String(params.status || 'all'),
    search: String(params.search || ''),
    sort: String(params.sort || 'updated_at'),
    dir: String(params.dir || 'desc') as 'asc' | 'desc',
  }
}

export default async function GoogleFeedProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feed Products</h1>
          <p className="text-muted-foreground">
            Manage products in your Google Shopping feed
          </p>
        </div>
        <Link
          href="/admin/google-feed"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Overview
        </Link>
      </div>

      <FilterBar filters={filters} />

      <Suspense fallback={<TableSkeleton />}>
        <ProductsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function FilterBar({ filters }: { filters: ReturnType<typeof parseFilters> }) {
  const base = '/admin/google-feed/products'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search products..." />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          {FEED_STATUSES.map((status) => (
            <Link
              key={status}
              href={`${base}?status=${status === 'all' ? '' : status}&search=${filters.search}`}
              className={`rounded-md px-2 py-1 text-xs capitalize ${
                (filters.status === status || (filters.status === 'all' && status === 'all'))
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function ProductsLoader({ filters }: { filters: ReturnType<typeof parseFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    const conditions: string[] = ["p.status = 'active'"]
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.search) {
      paramIndex++
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.handle ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    if (filters.status === 'excluded') {
      conditions.push('gfp.is_excluded = true')
    } else if (filters.status === 'included') {
      conditions.push('(gfp.is_excluded IS NULL OR gfp.is_excluded = false)')
    } else if (filters.status === 'errors') {
      conditions.push(`(gfp.merchant_status = 'disapproved' OR gfp.sync_status = 'error')`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const sortColumns: Record<string, string> = {
      title: 'p.title',
      price: 'p.price_cents',
      updated_at: 'COALESCE(gfp.updated_at, p.updated_at)',
    }
    const sortCol = sortColumns[filters.sort] || 'p.updated_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, (filters.page - 1) * filters.limit)

    const dataResult = await sql.query(
      `SELECT
        p.id,
        p.shopify_product_id as "shopifyProductId",
        p.title,
        p.handle,
        p.featured_image_url as thumbnail,
        p.price_cents as "priceCents",
        p.currency,
        p.inventory_quantity as "inventoryQuantity",
        p.updated_at as "updatedAt",
        gfp.is_excluded as "isExcluded",
        gfp.sync_status as "syncStatus",
        gfp.merchant_status as "merchantStatus",
        COALESCE(jsonb_array_length(gfp.merchant_issues), 0) as "issueCount"
      FROM products p
      LEFT JOIN google_feed_products gfp ON gfp.shopify_product_id = p.shopify_product_id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    const countResult = await sql.query(
      `SELECT COUNT(*) as count
       FROM products p
       LEFT JOIN google_feed_products gfp ON gfp.shopify_product_id = p.shopify_product_id
       ${whereClause}`,
      values.slice(0, -2)
    )

    interface RawRow {
      id: string
      shopifyProductId: string
      title: string
      handle: string
      thumbnail: string | null
      priceCents: number
      currency: string
      inventoryQuantity: number | null
      updatedAt: string
      isExcluded: boolean | null
      syncStatus: string | null
      merchantStatus: string | null
      issueCount: number
    }

    return {
      rows: (dataResult.rows as RawRow[]).map((row): ProductRow => ({
        ...row,
        feedStatus: row.isExcluded
          ? 'excluded'
          : row.syncStatus === 'error' || row.merchantStatus === 'disapproved'
            ? 'error'
            : 'included',
      })),
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })

  const totalPages = Math.ceil(totalCount / filters.limit)

  const columns: Column<ProductRow>[] = [
    {
      key: 'thumbnail',
      header: '',
      className: 'w-12',
      render: (row) =>
        row.thumbnail ? (
          <img
            src={row.thumbnail}
            alt={row.title}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-muted" />
        ),
    },
    {
      key: 'title',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <Link
          href={`/admin/google-feed/products/${row.handle}`}
          className="font-medium text-primary hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'priceCents',
      header: 'Price',
      sortable: true,
      className: 'text-right',
      render: (row) => formatMoney(row.priceCents, row.currency),
    },
    {
      key: 'inventoryQuantity',
      header: 'Stock',
      className: 'text-right',
      render: (row) => (row.inventoryQuantity ?? 0) > 0 ? row.inventoryQuantity : 'Out of stock',
    },
    {
      key: 'feedStatus',
      header: 'Feed Status',
      render: (row) => <FeedStatusBadge status={row.feedStatus} />,
    },
    {
      key: 'merchantStatus',
      header: 'Merchant Status',
      render: (row) =>
        row.merchantStatus ? (
          <MerchantStatusBadge status={row.merchantStatus} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'issueCount',
      header: 'Issues',
      className: 'text-right',
      render: (row) =>
        row.issueCount > 0 ? (
          <span className="text-red-600">{row.issueCount}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(r) => r.id}
        basePath="/admin/google-feed/products"
        currentFilters={{ status: filters.status, search: filters.search }}
        currentSort={filters.sort}
        currentDir={filters.dir}
      />
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={filters.limit}
        basePath="/admin/google-feed/products"
        currentFilters={{ status: filters.status, search: filters.search }}
      />
    </div>
  )
}

function FeedStatusBadge({ status }: { status: 'included' | 'excluded' | 'error' }) {
  const styles: Record<string, string> = {
    included: 'bg-green-100 text-green-800',
    excluded: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function MerchantStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    disapproved: 'bg-red-100 text-red-800',
    warning: 'bg-orange-100 text-orange-800',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 animate-pulse rounded bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
