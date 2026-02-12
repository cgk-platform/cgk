import { Badge, Button, Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { Pagination } from '@/components/commerce/pagination'
import { formatMoney } from '@/lib/format'

// Annual Payments Report Page

export default async function AnnualPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const taxYear = Number(params.tax_year) || new Date().getFullYear()
  const payeeType = (params.payee_type as string) || 'creator'
  const threshold = params.threshold as string

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Annual Payments</h2>
          <p className="text-sm text-muted-foreground">
            Payment breakdown by payee for tax year {taxYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            Export CSV
          </Button>
          <Button variant="outline">
            Download Report
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <YearFilter taxYear={taxYear} payeeType={payeeType} />
        <PayeeTypeFilter taxYear={taxYear} payeeType={payeeType} />
        <ThresholdFilter taxYear={taxYear} payeeType={payeeType} threshold={threshold} />
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <PaymentStatsLoader taxYear={taxYear} payeeType={payeeType} />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <PaymentsListLoader
          page={page}
          taxYear={taxYear}
          payeeType={payeeType}
          threshold={threshold}
        />
      </Suspense>
    </div>
  )
}

function YearFilter({ taxYear, payeeType }: { taxYear: number; payeeType: string }) {
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Year:</span>
      <div className="flex gap-1">
        {years.map((year) => (
          <Link
            key={year}
            href={`/admin/tax/annual-payments?tax_year=${year}&payee_type=${payeeType}`}
          >
            <Button
              variant={taxYear === year ? 'default' : 'outline'}
              size="sm"
            >
              {year}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}

function PayeeTypeFilter({ taxYear, payeeType }: { taxYear: number; payeeType: string }) {
  const types = [
    { value: 'creator', label: 'Creators' },
    { value: 'contractor', label: 'Contractors' },
    { value: 'vendor', label: 'Vendors' },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Type:</span>
      <div className="flex gap-1">
        {types.map((t) => (
          <Link
            key={t.value}
            href={`/admin/tax/annual-payments?tax_year=${taxYear}&payee_type=${t.value}`}
          >
            <Button
              variant={payeeType === t.value ? 'default' : 'outline'}
              size="sm"
            >
              {t.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ThresholdFilter({
  taxYear,
  payeeType,
  threshold,
}: {
  taxYear: number
  payeeType: string
  threshold?: string
}) {
  const options = [
    { value: '', label: 'All' },
    { value: 'above', label: '>= $600' },
    { value: 'approaching', label: '50-99%' },
    { value: 'below', label: '< 50%' },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Threshold:</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <Link
            key={o.value}
            href={`/admin/tax/annual-payments?tax_year=${taxYear}&payee_type=${payeeType}${o.value ? `&threshold=${o.value}` : ''}`}
          >
            <Button
              variant={threshold === o.value || (!threshold && o.value === '') ? 'default' : 'outline'}
              size="sm"
            >
              {o.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}

async function PaymentStatsLoader({
  taxYear,
}: {
  taxYear: number
  payeeType: string
}) {
  // Headers available for future tenant context
  void (await headers())

  // Mock stats
  const stats = {
    totalPayees: 150,
    totalAmountCents: 45000000,
    aboveThreshold: 45,
    approachingThreshold: 20,
    belowThreshold: 85,
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.totalPayees}</div>
          <div className="text-sm text-muted-foreground">Total Payees</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {formatMoney(stats.totalAmountCents)}
          </div>
          <div className="text-sm text-muted-foreground">Total Paid ({taxYear})</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{stats.aboveThreshold}</div>
          <div className="text-sm text-muted-foreground">Above $600</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-yellow-600">{stats.approachingThreshold}</div>
          <div className="text-sm text-muted-foreground">Approaching</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-muted-foreground">{stats.belowThreshold}</div>
          <div className="text-sm text-muted-foreground">Below 50%</div>
        </CardContent>
      </Card>
    </div>
  )
}

async function PaymentsListLoader({
  page,
  taxYear,
  payeeType,
  threshold,
}: {
  page: number
  taxYear: number
  payeeType: string
  threshold?: string
}) {
  // Headers available for future tenant context
  void (await headers())

  // Mock data
  const payees = [
    {
      id: '1',
      payeeId: 'creator_123',
      name: 'John Creator',
      email: 'john@example.com',
      totalCents: 125000,
      percentOfThreshold: 208,
      hasW9: true,
      formStatus: 'approved',
    },
    {
      id: '2',
      payeeId: 'creator_456',
      name: 'Jane Smith',
      email: 'jane@example.com',
      totalCents: 85000,
      percentOfThreshold: 141,
      hasW9: true,
      formStatus: 'draft',
    },
    {
      id: '3',
      payeeId: 'creator_789',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      totalCents: 45000,
      percentOfThreshold: 75,
      hasW9: false,
      formStatus: null,
    },
    {
      id: '4',
      payeeId: 'creator_012',
      name: 'Alice Williams',
      email: 'alice@example.com',
      totalCents: 15000,
      percentOfThreshold: 25,
      hasW9: false,
      formStatus: null,
    },
  ]

  let filteredPayees = payees
  if (threshold === 'above') {
    filteredPayees = filteredPayees.filter((p) => p.totalCents >= 60000)
  } else if (threshold === 'approaching') {
    filteredPayees = filteredPayees.filter(
      (p) => p.percentOfThreshold >= 50 && p.percentOfThreshold < 100
    )
  } else if (threshold === 'below') {
    filteredPayees = filteredPayees.filter((p) => p.percentOfThreshold < 50)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Payee</th>
              <th className="px-4 py-3 text-right font-medium">Total ({taxYear})</th>
              <th className="px-4 py-3 text-left font-medium">% of $600</th>
              <th className="px-4 py-3 text-left font-medium">W-9</th>
              <th className="px-4 py-3 text-left font-medium">1099 Status</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPayees.map((payee) => (
              <tr key={payee.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{payee.name}</div>
                  <div className="text-xs text-muted-foreground">{payee.email}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(payee.totalCents)}
                </td>
                <td className="px-4 py-3">
                  <ThresholdBadge percent={payee.percentOfThreshold} />
                </td>
                <td className="px-4 py-3">
                  {payee.hasW9 ? (
                    <Badge variant="default">Complete</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {payee.formStatus ? (
                    <Badge variant="secondary">{payee.formStatus}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      View Details
                    </Button>
                    {!payee.hasW9 && payee.totalCents >= 30000 && (
                      <Button size="sm" variant="outline">
                        Request W-9
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={1}
        totalCount={filteredPayees.length}
        limit={50}
        basePath="/admin/tax/annual-payments"
        currentFilters={{ tax_year: taxYear, payee_type: payeeType, threshold }}
      />
    </div>
  )
}

function ThresholdBadge({ percent }: { percent: number }) {
  if (percent >= 100) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-16 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-green-600">{percent}%</span>
      </div>
    )
  }
  if (percent >= 50) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative h-2 w-16 rounded-full bg-muted">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-yellow-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-sm font-medium text-yellow-600">{percent}%</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-16 rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gray-400"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground">{percent}%</span>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
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
