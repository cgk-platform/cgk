import { withTenant } from '@cgk-platform/db'
import { Card, CardContent, Button } from '@cgk-platform/ui'
import { CreditCard, RotateCcw } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import {
  TransactionStatusBadge,
  SourceBadge,
} from '@/components/admin/gift-cards/status-badge'
import { getGiftCardTransactions, type GiftCardTransaction } from '@/lib/gift-card'
import { formatMoney, formatDateTime } from '@/lib/format'
import { buildFilterUrl } from '@/lib/search-params'

const TRANSACTION_STATUSES = ['pending', 'credited', 'failed']
const TRANSACTION_SOURCES = ['bundle_builder', 'manual', 'promotion']

interface TransactionFilters {
  status: string
  source: string
  search: string
  page: number
  limit: number
  offset: number
}

function parseFilters(params: Record<string, string | string[] | undefined>): TransactionFilters {
  const str = (val: string | string[] | undefined): string =>
    Array.isArray(val) ? val[0] || '' : val || ''

  const page = Math.max(1, parseInt(str(params.page), 10) || 1)
  const limit = 20
  return {
    status: str(params.status),
    source: str(params.source),
    search: str(params.search),
    page,
    limit,
    offset: (page - 1) * limit,
  }
}

export default async function TransactionsPage({
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
          <h1 className="text-2xl font-bold">Gift Card Transactions</h1>
          <p className="text-muted-foreground">
            Track store credit issuance and redemption
          </p>
        </div>
      </div>

      <FilterBar filters={filters} />

      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function FilterBar({ filters }: { filters: TransactionFilters }) {
  const base = '/admin/gift-cards/transactions'

  const filterParams: Record<string, string | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    source: filters.source || undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search by order or email..." />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, status: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {TRANSACTION_STATUSES.map((status) => (
            <Link
              key={status}
              href={buildFilterUrl(base, { ...filterParams, status, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs capitalize ${filters.status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Source:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, source: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.source ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {TRANSACTION_SOURCES.map((source) => (
            <Link
              key={source}
              href={buildFilterUrl(base, { ...filterParams, source, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs ${filters.source === source ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {source.replace(/_/g, ' ')}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function TransactionsLoader({ filters }: { filters: TransactionFilters }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    return getGiftCardTransactions({
      status: filters.status as 'pending' | 'credited' | 'failed' | undefined,
      source: filters.source as 'bundle_builder' | 'manual' | 'promotion' | undefined,
      search: filters.search || undefined,
      page: filters.page,
      limit: filters.limit,
      offset: filters.offset,
    })
  })

  if (rows.length === 0 && !filters.search && !filters.status && !filters.source) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No transactions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Gift card transactions will appear here when orders with gift cards are
              processed.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/gift-cards/transactions'
  const currentFilters: Record<string, string | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    source: filters.source || undefined,
  }

  const columns: Column<GiftCardTransaction>[] = [
    {
      key: 'shopify_order_name',
      header: 'Order',
      render: (row) => (
        <span className="font-medium">{row.shopify_order_name}</span>
      ),
    },
    {
      key: 'customer_email',
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="truncate max-w-[200px]">{row.customer_email}</div>
          {row.customer_name && (
            <div className="text-xs text-muted-foreground">{row.customer_name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount_cents',
      header: 'Amount',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">{formatMoney(row.amount_cents)}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => <SourceBadge source={row.source} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <TransactionStatusBadge status={row.status} />,
    },
    {
      key: 'credited_at',
      header: 'Credited',
      render: (row) =>
        row.credited_at ? formatDateTime(row.credited_at) : <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'failed' ? (
          <RetryButton transactionId={row.id} />
        ) : null,
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
        currentSort="created_at"
        currentDir="desc"
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

function RetryButton({ transactionId }: { transactionId: string }) {
  return (
    <form
      action={`/api/admin/gift-cards/transactions/${transactionId}/retry`}
      method="POST"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        window.location.reload()
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </form>
  )
}

function TransactionsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
