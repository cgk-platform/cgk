import { Card, CardContent, CardHeader } from '@cgk/ui'
import { ArrowLeft, Download, TrendingUp, TrendingDown, ChevronRight, HelpCircle } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import {
  calculatePLStatement,
  calculatePLComparison,
  getPresetDateRanges,
} from '@/lib/expenses/pnl-calculator'
import { formatMoney } from '@/lib/format'
import type { PLStatement } from '@/lib/expenses/types'

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    comparison?: 'previous_period' | 'year_over_year'
  }>
}

export default async function PLStatementPage({ searchParams }: PageProps) {
  const params = await searchParams
  const presets = getPresetDateRanges()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/expenses" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
        </div>
        <Link
          href={`/api/admin/expenses/pl-statement/pdf?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}&format=html`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export PDF
        </Link>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = params.startDate === preset.start_date && params.endDate === preset.end_date
          return (
            <Link
              key={preset.id}
              href={`/admin/expenses/pl-statement?startDate=${preset.start_date}&endDate=${preset.end_date}`}
              className={`px-3 py-1.5 rounded-md text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-muted'
              }`}
            >
              {preset.label}
            </Link>
          )
        })}
      </div>

      {/* Comparison Toggle */}
      <div className="flex gap-2">
        <Link
          href={`/admin/expenses/pl-statement?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}`}
          className={`px-3 py-1.5 rounded-md text-sm ${
            !params.comparison ? 'bg-muted font-medium' : 'hover:bg-muted'
          }`}
        >
          No Comparison
        </Link>
        <Link
          href={`/admin/expenses/pl-statement?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}&comparison=previous_period`}
          className={`px-3 py-1.5 rounded-md text-sm ${
            params.comparison === 'previous_period' ? 'bg-muted font-medium' : 'hover:bg-muted'
          }`}
        >
          vs Previous Period
        </Link>
        <Link
          href={`/admin/expenses/pl-statement?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}&comparison=year_over_year`}
          className={`px-3 py-1.5 rounded-md text-sm ${
            params.comparison === 'year_over_year' ? 'bg-muted font-medium' : 'hover:bg-muted'
          }`}
        >
          Year over Year
        </Link>
      </div>

      <Suspense fallback={<PLStatementSkeleton />}>
        <PLStatementLoader
          startDate={params.startDate}
          endDate={params.endDate}
          comparison={params.comparison}
        />
      </Suspense>
    </div>
  )
}

async function PLStatementLoader({
  startDate,
  endDate,
  comparison,
}: {
  startDate?: string
  endDate?: string
  comparison?: 'previous_period' | 'year_over_year'
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const now = new Date()
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] as string
  const defaultEndDate = now.toISOString().split('T')[0] as string

  const start: string = startDate || defaultStartDate
  const end: string = endDate || defaultEndDate

  let statement: PLStatement
  let comparisonData: Awaited<ReturnType<typeof calculatePLComparison>> | null = null

  if (comparison) {
    comparisonData = await calculatePLComparison(tenantSlug, start, end, comparison)
    statement = comparisonData.current
  } else {
    statement = await calculatePLStatement(tenantSlug, start, end)
  }

  const formatChange = (percent?: number) => {
    if (percent === undefined) return null
    const isPositive = percent >= 0
    return (
      <span
        className={`inline-flex items-center text-xs ml-2 ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
        {Math.abs(percent).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Period Header */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{statement.period.label}</h2>
            {statement.comparison && (
              <p className="text-sm text-muted-foreground">
                Compared to: {comparisonData?.comparison?.period.label}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* P&L Statement */}
      <div className="space-y-1 bg-white border rounded-lg overflow-hidden">
        {/* REVENUE */}
        <PLSection title="REVENUE">
          <PLRow label="Gross Sales" amount={statement.revenue.gross_sales_cents} />
          <PLRow
            label="Less: Discounts"
            amount={-statement.revenue.discounts_cents}
            isNegative
          />
          <PLRow
            label="Less: Returns"
            amount={-statement.revenue.returns_cents}
            isNegative
          />
          <PLRow
            label="Plus: Shipping Revenue"
            amount={statement.revenue.shipping_revenue_cents}
          />
          <PLRow
            label="Net Revenue"
            amount={statement.revenue.net_revenue_cents}
            isSubtotal
            change={statement.revenue.net_revenue_change_percent}
          />
        </PLSection>

        {/* COGS */}
        <PLSection title="COST OF GOODS SOLD">
          <PLRow
            label="Product Cost"
            amount={-statement.cogs.product_cost_cents}
            isNegative
          />
          <PLRow
            label="Gross Profit"
            amount={statement.cogs.gross_profit_cents}
            percent={statement.cogs.gross_margin_percent}
            isSubtotal
            change={statement.cogs.gross_profit_change_percent}
            tooltip="Gross Profit = Net Revenue - COGS"
          />
        </PLSection>

        {/* VARIABLE COSTS */}
        <PLSection title="VARIABLE COSTS">
          <PLRow
            label="Payment Processing"
            amount={-statement.variable_costs.payment_processing_cents}
            isNegative
            tooltip="Estimated at 2.9% + $0.30 per transaction"
          />
          <PLRow
            label="Shipping Costs"
            amount={-statement.variable_costs.shipping_costs_cents}
            isNegative
          />
          <PLRow
            label="Fulfillment"
            amount={-statement.variable_costs.fulfillment_cents}
            isNegative
            tooltip="Pick & pack + packaging costs"
          />
          {statement.variable_costs.other_cents > 0 && (
            <PLRow
              label="Other Variable Costs"
              amount={-statement.variable_costs.other_cents}
              isNegative
            />
          )}
          <PLRow
            label="Contribution Margin"
            amount={statement.variable_costs.contribution_margin_cents}
            percent={statement.variable_costs.contribution_margin_percent}
            isSubtotal
            tooltip="Gross Profit - Variable Costs"
          />
        </PLSection>

        {/* MARKETING */}
        <PLSection title="MARKETING & SALES">
          {statement.marketing.ad_spend_by_platform.map((platform) => (
            <PLRow
              key={platform.platform}
              label={`${platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1)} Ads`}
              amount={-platform.spend_cents}
              isNegative
            />
          ))}
          {statement.marketing.creator_payouts_cents > 0 && (
            <PLRow
              label="Creator Payouts"
              amount={-statement.marketing.creator_payouts_cents}
              isNegative
            />
          )}
          <PLRow
            label="Contribution Profit"
            amount={statement.marketing.contribution_profit_cents}
            isSubtotal
            tooltip="Contribution Margin - Marketing Costs"
          />
        </PLSection>

        {/* OPERATING EXPENSES */}
        <PLSection title="OPERATING EXPENSES">
          {statement.operating.by_category.map((cat) => (
            <PLRow
              key={cat.category_id}
              label={cat.category_name}
              amount={-cat.total_cents}
              isNegative
              expandable
              href={`/api/admin/expenses/pl-line-details?categoryId=${cat.category_id}&startDate=${start}&endDate=${end}`}
            />
          ))}
          {statement.operating.vendor_payouts_cents > 0 && (
            <PLRow
              label="Vendor Payments"
              amount={-statement.operating.vendor_payouts_cents}
              isNegative
            />
          )}
          {statement.operating.contractor_payouts_cents > 0 && (
            <PLRow
              label="Contractor Payments"
              amount={-statement.operating.contractor_payouts_cents}
              isNegative
            />
          )}
          <PLRow
            label="Operating Income"
            amount={statement.operating.operating_income_cents}
            isSubtotal
            tooltip="Contribution Profit - Operating Expenses"
          />
        </PLSection>

        {/* NET PROFIT */}
        <div className="bg-gray-50 border-t-2 border-gray-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">NET PROFIT</span>
              {formatChange(statement.net_profit_change_percent)}
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`font-bold text-xl ${
                  statement.net_profit_cents >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatMoney(statement.net_profit_cents)}
              </span>
              <span className="text-sm text-muted-foreground">
                {statement.net_margin_percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Summary */}
      {comparisonData?.changes && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="font-semibold">Period Comparison</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Net Revenue Change</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {formatMoney(comparisonData.changes.net_revenue_change_cents)}
                  </span>
                  <span
                    className={`text-sm ${
                      comparisonData.changes.net_revenue_change_percent >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ({comparisonData.changes.net_revenue_change_percent >= 0 ? '+' : ''}
                    {comparisonData.changes.net_revenue_change_percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Gross Profit Change</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {formatMoney(comparisonData.changes.gross_profit_change_cents)}
                  </span>
                  <span
                    className={`text-sm ${
                      comparisonData.changes.gross_profit_change_percent >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ({comparisonData.changes.gross_profit_change_percent >= 0 ? '+' : ''}
                    {comparisonData.changes.gross_profit_change_percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Net Profit Change</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {formatMoney(comparisonData.changes.net_profit_change_cents)}
                  </span>
                  <span
                    className={`text-sm ${
                      comparisonData.changes.net_profit_change_percent >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ({comparisonData.changes.net_profit_change_percent >= 0 ? '+' : ''}
                    {comparisonData.changes.net_profit_change_percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PLSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b last:border-b-0">
      <div className="bg-gray-100 px-6 py-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  )
}

function PLRow({
  label,
  amount,
  percent,
  isNegative,
  isSubtotal,
  change,
  tooltip,
  expandable,
  href,
}: {
  label: string
  amount: number
  percent?: number
  isNegative?: boolean
  isSubtotal?: boolean
  change?: number
  tooltip?: string
  expandable?: boolean
  href?: string
}) {
  const content = (
    <div
      className={`flex items-center justify-between px-6 py-2 ${
        isSubtotal ? 'bg-gray-50 font-medium' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isSubtotal && <span className="w-4" />}
        <span className={isSubtotal ? 'font-semibold' : ''}>{label}</span>
        {tooltip && (
          <div className="group relative">
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {tooltip}
            </div>
          </div>
        )}
        {change !== undefined && (
          <span
            className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {change >= 0 ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className={isNegative && amount < 0 ? 'text-red-600' : ''}>
          {amount < 0 ? `(${formatMoney(Math.abs(amount))})` : formatMoney(amount)}
        </span>
        {percent !== undefined && (
          <span className="text-sm text-muted-foreground w-16 text-right">
            {percent.toFixed(1)}%
          </span>
        )}
        {expandable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    )
  }

  return content
}

function PLStatementSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="h-6 w-48 mx-auto animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
      <div className="border rounded-lg overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b last:border-b-0">
            <div className="bg-gray-100 px-6 py-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between px-6 py-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
