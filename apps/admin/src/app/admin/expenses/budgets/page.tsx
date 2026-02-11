import { Card, CardContent, CardHeader } from '@cgk/ui'
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { getBudgetComparison, getBudgetSummary } from '@/lib/expenses/db/budgets'
import { formatMoney } from '@/lib/format'
import type { ExpenseCategoryType } from '@/lib/expenses/types'

interface PageProps {
  searchParams: Promise<{
    year?: string
    month?: string
  }>
}

const typeLabels: Record<ExpenseCategoryType, string> = {
  cogs: 'COGS',
  variable: 'Variable',
  marketing: 'Marketing',
  operating: 'Operating',
  other: 'Other',
}

const typeColors: Record<ExpenseCategoryType, string> = {
  cogs: 'bg-red-50',
  variable: 'bg-orange-50',
  marketing: 'bg-purple-50',
  operating: 'bg-blue-50',
  other: 'bg-gray-50',
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const now = new Date()
  const year = parseInt(params.year || String(now.getFullYear()), 10)
  const month = parseInt(params.month || String(now.getMonth() + 1), 10)

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/expenses" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Budget Management</h1>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Link
          href={`/admin/expenses/budgets?year=${prevYear}&month=${prevMonth}`}
          className="p-2 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-xl font-semibold min-w-[200px] text-center">{monthName}</h2>
        <Link
          href={`/admin/expenses/budgets?year=${nextYear}&month=${nextMonth}`}
          className="p-2 rounded-full hover:bg-muted"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      <Suspense fallback={<BudgetsSkeleton />}>
        <BudgetsLoader year={year} month={month} />
      </Suspense>
    </div>
  )
}

async function BudgetsLoader({ year, month }: { year: number; month: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const [comparison, summary] = await Promise.all([
    getBudgetComparison(tenantSlug, year, month),
    getBudgetSummary(tenantSlug, year, month),
  ])

  // Group by expense type
  const byType = comparison.reduce(
    (acc, item) => {
      if (!acc[item.expense_type]) {
        acc[item.expense_type] = []
      }
      acc[item.expense_type].push(item)
      return acc
    },
    {} as Record<ExpenseCategoryType, typeof comparison>
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatMoney(summary.total_budgeted_cents)}</div>
            <div className="text-sm text-muted-foreground">Total Budgeted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatMoney(summary.total_actual_cents)}</div>
            <div className="text-sm text-muted-foreground">Total Actual</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div
              className={`text-2xl font-bold ${
                summary.total_variance_cents > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {summary.total_variance_cents > 0 ? '+' : ''}
              {formatMoney(summary.total_variance_cents)}
            </div>
            <div className="text-sm text-muted-foreground">Variance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div>
                <div className="text-xl font-bold text-red-600">{summary.categories_over_budget}</div>
                <div className="text-xs text-muted-foreground">Over</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {summary.categories_under_budget}
                </div>
                <div className="text-xs text-muted-foreground">Under</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual by Type */}
      {(Object.keys(typeLabels) as ExpenseCategoryType[]).map((type) => {
        const items = byType[type] || []
        if (items.length === 0) return null

        const typeTotal = items.reduce(
          (acc, item) => ({
            budgeted: acc.budgeted + Number(item.budgeted_cents),
            actual: acc.actual + Number(item.actual_cents),
          }),
          { budgeted: 0, actual: 0 }
        )

        return (
          <Card key={type} className={typeColors[type]}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{typeLabels[type]}</h3>
                <div className="text-sm text-muted-foreground">
                  {formatMoney(typeTotal.actual)} / {formatMoney(typeTotal.budgeted)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                        Category
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Budgeted
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Actual
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Variance
                      </th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item) => (
                      <tr key={item.category_id} className="hover:bg-white/50">
                        <td className="px-4 py-3 font-medium">{item.category_name}</td>
                        <td className="px-4 py-3 text-right">
                          {Number(item.budgeted_cents) > 0
                            ? formatMoney(Number(item.budgeted_cents))
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatMoney(Number(item.actual_cents))}
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${
                            Number(item.variance_cents) > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {Number(item.budgeted_cents) > 0 ? (
                            <>
                              {Number(item.variance_cents) > 0 ? '+' : ''}
                              {formatMoney(Number(item.variance_cents))}
                              <span className="text-xs ml-1">
                                ({Number(item.variance_percent) > 0 ? '+' : ''}
                                {item.variance_percent}%)
                              </span>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {Number(item.budgeted_cents) === 0 ? (
                            <Minus className="h-4 w-4 text-gray-400 inline" />
                          ) : item.is_over_budget ? (
                            <TrendingUp className="h-4 w-4 text-red-600 inline" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-600 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* How to Set Budgets */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Setting Budgets</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set budgets via the API endpoint. You can set budgets individually or in batch:
          </p>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            {`POST /api/admin/expenses/budgets
{
  "category_id": "op_software",
  "year": ${year},
  "month": ${month},
  "budgeted_cents": 50000
}`}
          </pre>
          <p className="text-sm text-muted-foreground mt-4">
            Or copy budgets from a previous month:
          </p>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            {`PATCH /api/admin/expenses/budgets
{
  "action": "copy",
  "from_year": ${year},
  "from_month": ${month - 1 || 12},
  "to_year": ${year},
  "to_month": ${month}
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function BudgetsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex gap-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
