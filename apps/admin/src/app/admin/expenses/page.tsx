import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { DollarSign, FileText, Settings } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { ExpensesClient } from './expenses-client'

import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { getExpenses, getExpenseSummary } from '@/lib/expenses/db'
import { EXPENSE_CATEGORIES } from '@/lib/expenses/types'
import { formatMoney } from '@/lib/format'
import { parseExpenseFilters, buildFilterUrl } from '@/lib/search-params'


export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseExpenseFilters(params as Record<string, string | undefined>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/expenses/manual"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
          >
            Add Expense
          </Link>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/expenses/categories"
          className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted text-sm"
        >
          <Settings className="h-4 w-4" />
          Categories
        </Link>
        <Link
          href="/admin/expenses/budgets"
          className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted text-sm"
        >
          <DollarSign className="h-4 w-4" />
          Budgets
        </Link>
        <Link
          href="/admin/expenses/pl-statement"
          className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted text-sm"
        >
          <FileText className="h-4 w-4" />
          P&L Statement
        </Link>
      </div>

      <Suspense fallback={<SummarySkeleton />}>
        <ExpenseSummaryLoader />
      </Suspense>

      <ExpenseFilterBar filters={filters} />

      <Suspense fallback={<ExpensesListSkeleton />}>
        <ExpensesLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function ExpenseSummaryLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const summary = await getExpenseSummary(tenantSlug)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {formatMoney(Number(summary.total_this_month_cents))}
          </div>
          <div className="text-sm text-muted-foreground">This Month</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {formatMoney(Number(summary.total_this_year_cents))}
          </div>
          <div className="text-sm text-muted-foreground">This Year</div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium text-muted-foreground">Top Categories (YTD)</h4>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {summary.by_category.slice(0, 4).map((cat) => (
              <div
                key={cat.category}
                className="rounded-md border px-2 py-1 text-sm"
              >
                <span className="capitalize">{cat.category.replace(/_/g, ' ')}</span>:{' '}
                <span className="font-medium">{formatMoney(Number(cat.total_cents))}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ExpenseFilterBar({ filters }: { filters: ReturnType<typeof parseExpenseFilters> }) {
  const base = '/admin/expenses'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    category: filters.category || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search expenses..." />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Category:</span>
        <div className="flex flex-wrap gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, category: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {EXPENSE_CATEGORIES.slice(0, 5).map((category) => (
            <Link
              key={category}
              href={buildFilterUrl(base, { ...filterParams, category, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs capitalize ${filters.category === category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {category.replace(/_/g, ' ')}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function ExpensesLoader({ filters }: { filters: ReturnType<typeof parseExpenseFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getExpenses(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/expenses'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    category: filters.category || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }

  return (
    <div className="space-y-4">
      <ExpensesClient expenses={rows} />
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

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ExpensesListSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
