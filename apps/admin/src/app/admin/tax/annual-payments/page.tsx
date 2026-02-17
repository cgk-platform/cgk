import { Badge, Button, Card, CardContent } from '@cgk-platform/ui'
import { sql, withTenant } from '@cgk-platform/db'
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
  payeeType,
}: {
  taxYear: number
  payeeType: string
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">No tenant configured</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Query payouts for the tax year, aggregated by payee
  const stats = await withTenant(tenantSlug, async () => {
    // Get stats based on payee type
    // For creators, use the payouts table which references creators
    // For contractors/vendors, use their respective payout tables
    if (payeeType === 'creator') {
      const result = await sql`
        SELECT
          COUNT(DISTINCT p.creator_id) as total_payees,
          COALESCE(SUM(p.amount_cents), 0) as total_amount_cents,
          COUNT(DISTINCT CASE WHEN creator_totals.total_cents >= 60000 THEN p.creator_id END) as above_threshold,
          COUNT(DISTINCT CASE WHEN creator_totals.total_cents >= 30000 AND creator_totals.total_cents < 60000 THEN p.creator_id END) as approaching_threshold,
          COUNT(DISTINCT CASE WHEN creator_totals.total_cents < 30000 THEN p.creator_id END) as below_threshold
        FROM payouts p
        JOIN (
          SELECT creator_id, SUM(amount_cents) as total_cents
          FROM payouts
          WHERE EXTRACT(YEAR FROM created_at) = ${taxYear}
            AND status = 'completed'
          GROUP BY creator_id
        ) creator_totals ON p.creator_id = creator_totals.creator_id
        WHERE EXTRACT(YEAR FROM p.created_at) = ${taxYear}
          AND p.status = 'completed'
      `
      const row = result.rows[0]
      return {
        totalPayees: Number(row?.total_payees || 0),
        totalAmountCents: Number(row?.total_amount_cents || 0),
        aboveThreshold: Number(row?.above_threshold || 0),
        approachingThreshold: Number(row?.approaching_threshold || 0),
        belowThreshold: Number(row?.below_threshold || 0),
      }
    } else if (payeeType === 'contractor') {
      const result = await sql`
        SELECT
          COUNT(DISTINCT cp.contractor_id) as total_payees,
          COALESCE(SUM(cp.amount_cents), 0) as total_amount_cents,
          COUNT(DISTINCT CASE WHEN contractor_totals.total_cents >= 60000 THEN cp.contractor_id END) as above_threshold,
          COUNT(DISTINCT CASE WHEN contractor_totals.total_cents >= 30000 AND contractor_totals.total_cents < 60000 THEN cp.contractor_id END) as approaching_threshold,
          COUNT(DISTINCT CASE WHEN contractor_totals.total_cents < 30000 THEN cp.contractor_id END) as below_threshold
        FROM contractor_payouts cp
        JOIN (
          SELECT contractor_id, SUM(amount_cents) as total_cents
          FROM contractor_payouts
          WHERE EXTRACT(YEAR FROM created_at) = ${taxYear}
            AND status = 'completed'
          GROUP BY contractor_id
        ) contractor_totals ON cp.contractor_id = contractor_totals.contractor_id
        WHERE EXTRACT(YEAR FROM cp.created_at) = ${taxYear}
          AND cp.status = 'completed'
      `
      const row = result.rows[0]
      return {
        totalPayees: Number(row?.total_payees || 0),
        totalAmountCents: Number(row?.total_amount_cents || 0),
        aboveThreshold: Number(row?.above_threshold || 0),
        approachingThreshold: Number(row?.approaching_threshold || 0),
        belowThreshold: Number(row?.below_threshold || 0),
      }
    } else {
      // Vendor payouts
      const result = await sql`
        SELECT
          COUNT(DISTINCT vp.vendor_id) as total_payees,
          COALESCE(SUM(vp.amount_cents), 0) as total_amount_cents,
          COUNT(DISTINCT CASE WHEN vendor_totals.total_cents >= 60000 THEN vp.vendor_id END) as above_threshold,
          COUNT(DISTINCT CASE WHEN vendor_totals.total_cents >= 30000 AND vendor_totals.total_cents < 60000 THEN vp.vendor_id END) as approaching_threshold,
          COUNT(DISTINCT CASE WHEN vendor_totals.total_cents < 30000 THEN vp.vendor_id END) as below_threshold
        FROM vendor_payouts vp
        JOIN (
          SELECT vendor_id, SUM(amount_cents) as total_cents
          FROM vendor_payouts
          WHERE EXTRACT(YEAR FROM payment_date) = ${taxYear}
          GROUP BY vendor_id
        ) vendor_totals ON vp.vendor_id = vendor_totals.vendor_id
        WHERE EXTRACT(YEAR FROM vp.payment_date) = ${taxYear}
      `
      const row = result.rows[0]
      return {
        totalPayees: Number(row?.total_payees || 0),
        totalAmountCents: Number(row?.total_amount_cents || 0),
        aboveThreshold: Number(row?.above_threshold || 0),
        approachingThreshold: Number(row?.approaching_threshold || 0),
        belowThreshold: Number(row?.below_threshold || 0),
      }
    }
  })

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

interface PayeeData {
  id: string
  payeeId: string
  name: string
  email: string
  totalCents: number
  percentOfThreshold: number
  hasW9: boolean
  formStatus: string | null
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
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const limit = 50
  const offset = (page - 1) * limit

  // Build threshold filter conditions
  // $600 = 60000 cents threshold
  // above: >= 60000, approaching: 30000-59999 (50-99%), below: < 30000
  let minCents = 0
  let maxCents = Number.MAX_SAFE_INTEGER
  if (threshold === 'above') {
    minCents = 60000
  } else if (threshold === 'approaching') {
    minCents = 30000
    maxCents = 59999
  } else if (threshold === 'below') {
    maxCents = 29999
  }

  const { payees, totalCount } = await withTenant(tenantSlug, async () => {
    if (payeeType === 'creator') {
      // Query creators with their payout totals
      const countResult = await sql`
        SELECT COUNT(DISTINCT p.creator_id) as count
        FROM payouts p
        WHERE EXTRACT(YEAR FROM p.created_at) = ${taxYear}
          AND p.status = 'completed'
        GROUP BY p.creator_id
        HAVING SUM(p.amount_cents) >= ${minCents} AND SUM(p.amount_cents) <= ${maxCents}
      `

      const result = await sql`
        SELECT
          c.id,
          c.id as payee_id,
          CONCAT(c.first_name, ' ', c.last_name) as name,
          c.email,
          COALESCE(payouts.total_cents, 0) as total_cents,
          ROUND((COALESCE(payouts.total_cents, 0)::numeric / 600) * 100) as percent_of_threshold,
          EXISTS(SELECT 1 FROM tax_payees tp WHERE tp.payee_id = c.id AND tp.payee_type = 'creator') as has_w9,
          (SELECT tf.status FROM tax_forms tf WHERE tf.payee_id = c.id AND tf.payee_type = 'creator' AND tf.tax_year = ${taxYear} LIMIT 1) as form_status
        FROM creators c
        JOIN (
          SELECT creator_id, SUM(amount_cents) as total_cents
          FROM payouts
          WHERE EXTRACT(YEAR FROM created_at) = ${taxYear}
            AND status = 'completed'
          GROUP BY creator_id
          HAVING SUM(amount_cents) >= ${minCents} AND SUM(amount_cents) <= ${maxCents}
        ) payouts ON c.id = payouts.creator_id
        ORDER BY payouts.total_cents DESC
        OFFSET ${offset} LIMIT ${limit}
      `

      return {
        payees: result.rows.map((row) => ({
          id: String(row.id),
          payeeId: String(row.payee_id),
          name: String(row.name || ''),
          email: String(row.email || ''),
          totalCents: Number(row.total_cents || 0),
          percentOfThreshold: Number(row.percent_of_threshold || 0),
          hasW9: Boolean(row.has_w9),
          formStatus: row.form_status ? String(row.form_status) : null,
        })) as PayeeData[],
        totalCount: countResult.rows.length,
      }
    } else if (payeeType === 'contractor') {
      const countResult = await sql`
        SELECT COUNT(DISTINCT cp.contractor_id) as count
        FROM contractor_payouts cp
        WHERE EXTRACT(YEAR FROM cp.created_at) = ${taxYear}
          AND cp.status = 'completed'
        GROUP BY cp.contractor_id
        HAVING SUM(cp.amount_cents) >= ${minCents} AND SUM(cp.amount_cents) <= ${maxCents}
      `

      const result = await sql`
        SELECT
          con.id,
          con.id as payee_id,
          con.name,
          con.email,
          COALESCE(payouts.total_cents, 0) as total_cents,
          ROUND((COALESCE(payouts.total_cents, 0)::numeric / 600) * 100) as percent_of_threshold,
          EXISTS(SELECT 1 FROM tax_payees tp WHERE tp.payee_id = con.id AND tp.payee_type = 'contractor') as has_w9,
          (SELECT tf.status FROM tax_forms tf WHERE tf.payee_id = con.id AND tf.payee_type = 'contractor' AND tf.tax_year = ${taxYear} LIMIT 1) as form_status
        FROM contractors con
        JOIN (
          SELECT contractor_id, SUM(amount_cents) as total_cents
          FROM contractor_payouts
          WHERE EXTRACT(YEAR FROM created_at) = ${taxYear}
            AND status = 'completed'
          GROUP BY contractor_id
          HAVING SUM(amount_cents) >= ${minCents} AND SUM(amount_cents) <= ${maxCents}
        ) payouts ON con.id = payouts.contractor_id
        ORDER BY payouts.total_cents DESC
        OFFSET ${offset} LIMIT ${limit}
      `

      return {
        payees: result.rows.map((row) => ({
          id: String(row.id),
          payeeId: String(row.payee_id),
          name: String(row.name || ''),
          email: String(row.email || ''),
          totalCents: Number(row.total_cents || 0),
          percentOfThreshold: Number(row.percent_of_threshold || 0),
          hasW9: Boolean(row.has_w9),
          formStatus: row.form_status ? String(row.form_status) : null,
        })) as PayeeData[],
        totalCount: countResult.rows.length,
      }
    } else {
      // Vendor payouts - vendors don't have a dedicated table, use vendor_payouts
      const countResult = await sql`
        SELECT COUNT(DISTINCT vp.vendor_id) as count
        FROM vendor_payouts vp
        WHERE EXTRACT(YEAR FROM vp.payment_date) = ${taxYear}
        GROUP BY vp.vendor_id
        HAVING SUM(vp.amount_cents) >= ${minCents} AND SUM(vp.amount_cents) <= ${maxCents}
      `

      const result = await sql`
        SELECT
          vp.vendor_id as id,
          vp.vendor_id as payee_id,
          vp.vendor_name as name,
          '' as email,
          COALESCE(payouts.total_cents, 0) as total_cents,
          ROUND((COALESCE(payouts.total_cents, 0)::numeric / 600) * 100) as percent_of_threshold,
          EXISTS(SELECT 1 FROM tax_payees tp WHERE tp.payee_id = vp.vendor_id AND tp.payee_type = 'vendor') as has_w9,
          (SELECT tf.status FROM tax_forms tf WHERE tf.payee_id = vp.vendor_id AND tf.payee_type = 'vendor' AND tf.tax_year = ${taxYear} LIMIT 1) as form_status
        FROM vendor_payouts vp
        JOIN (
          SELECT vendor_id, SUM(amount_cents) as total_cents
          FROM vendor_payouts
          WHERE EXTRACT(YEAR FROM payment_date) = ${taxYear}
          GROUP BY vendor_id
          HAVING SUM(amount_cents) >= ${minCents} AND SUM(amount_cents) <= ${maxCents}
        ) payouts ON vp.vendor_id = payouts.vendor_id
        GROUP BY vp.vendor_id, vp.vendor_name, payouts.total_cents
        ORDER BY payouts.total_cents DESC
        OFFSET ${offset} LIMIT ${limit}
      `

      return {
        payees: result.rows.map((row) => ({
          id: String(row.id || ''),
          payeeId: String(row.payee_id || ''),
          name: String(row.name || ''),
          email: String(row.email || ''),
          totalCents: Number(row.total_cents || 0),
          percentOfThreshold: Number(row.percent_of_threshold || 0),
          hasW9: Boolean(row.has_w9),
          formStatus: row.form_status ? String(row.form_status) : null,
        })) as PayeeData[],
        totalCount: countResult.rows.length,
      }
    }
  })

  const totalPages = Math.ceil(totalCount / limit)

  if (payees.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          No payees found for tax year {taxYear} with the selected filters.
        </p>
      </div>
    )
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
            {payees.map((payee) => (
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
        totalPages={totalPages}
        totalCount={totalCount}
        limit={limit}
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
