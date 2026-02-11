'use client'

import { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Select, SelectOption, cn } from '@cgk/ui'

import type { PeriodType, PLBreakdown } from '@/lib/analytics'
import { formatCurrency, formatPercent } from '@/lib/format'

export default function PLBreakdownPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [periodStart, setPeriodStart] = useState(getDefaultPeriodStart('monthly'))
  const [data, setData] = useState<PLBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          periodType,
          periodStart,
        })
        const res = await fetch(`/api/admin/analytics/pl-breakdown?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch P&L data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [periodType, periodStart])

  function toggleSection(name: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P&L Breakdown</h1>
          <p className="text-muted-foreground">
            Detailed profit and loss analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={periodType}
            onChange={(e) => {
              const type = e.target.value as PeriodType
              setPeriodType(type)
              setPeriodStart(getDefaultPeriodStart(type))
            }}
            className="w-32"
          >
            <SelectOption value="monthly">Monthly</SelectOption>
            <SelectOption value="quarterly">Quarterly</SelectOption>
            <SelectOption value="yearly">Yearly</SelectOption>
          </Select>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
          <Button variant="outline">Export</Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="text-muted-foreground">No data available</div>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{data.period}</h3>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Line Item</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">vs Previous</th>
                  <th className="pb-3 font-medium text-right">% of Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* Revenue Section */}
                <PLSection
                  section={data.revenue}
                  isExpanded={expandedSections.has('Revenue')}
                  onToggle={() => toggleSection('Revenue')}
                />

                {/* COGS Section */}
                <PLSection
                  section={data.cogs}
                  isExpanded={expandedSections.has('Cost of Goods Sold')}
                  onToggle={() => toggleSection('Cost of Goods Sold')}
                />

                {/* Gross Profit */}
                <PLLineRow item={data.grossProfit} highlight />

                {/* Operating Expenses */}
                <PLSection
                  section={data.operatingExpenses}
                  isExpanded={expandedSections.has('Operating Expenses')}
                  onToggle={() => toggleSection('Operating Expenses')}
                />

                {/* Operating Profit */}
                <PLLineRow item={data.operatingProfit} highlight />

                {/* Other Expenses */}
                <PLSection
                  section={data.otherExpenses}
                  isExpanded={expandedSections.has('Other')}
                  onToggle={() => toggleSection('Other')}
                />

                {/* Net Profit */}
                <PLLineRow item={data.netProfit} highlight isFinal />
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface PLSectionProps {
  section: PLBreakdown['revenue']
  isExpanded: boolean
  onToggle: () => void
}

function PLSection({ section, isExpanded, onToggle }: PLSectionProps) {
  return (
    <>
      {/* Section Header */}
      <tr
        className="cursor-pointer bg-muted/30 font-semibold hover:bg-muted/50"
        onClick={onToggle}
      >
        <td className="py-3">
          <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
          {section.name}
        </td>
        <td className="py-3 text-right">{formatCurrency(section.total)}</td>
        <td className="py-3 text-right">
          {section.change !== undefined && (
            <span className={section.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {section.change >= 0 ? '+' : ''}
              {formatCurrency(section.change)}
            </span>
          )}
        </td>
        <td className="py-3 text-right">{formatPercent(section.percentOfRevenue / 100)}</td>
      </tr>

      {/* Section Items */}
      {isExpanded &&
        section.items.map((item) => (
          <PLLineRow key={item.id} item={item} indent={1} />
        ))}
    </>
  )
}

interface PLLineRowProps {
  item: PLBreakdown['grossProfit']
  indent?: number
  highlight?: boolean
  isFinal?: boolean
}

function PLLineRow({ item, indent = 0, highlight, isFinal }: PLLineRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  return (
    <>
      <tr
        className={cn(
          highlight && 'bg-muted/50 font-semibold',
          isFinal && 'bg-primary/10 font-bold',
          hasChildren && 'cursor-pointer'
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <td className="py-3" style={{ paddingLeft: `${indent * 24 + 12}px` }}>
          {hasChildren && <span className="mr-2">{expanded ? '▼' : '▶'}</span>}
          {item.name}
        </td>
        <td className="py-3 text-right">{formatCurrency(item.amount)}</td>
        <td className="py-3 text-right">
          {item.change !== undefined && (
            <span className={item.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {item.change >= 0 ? '+' : ''}
              {formatCurrency(item.change)}
            </span>
          )}
        </td>
        <td className="py-3 text-right">{formatPercent(item.percentOfRevenue / 100)}</td>
      </tr>
      {expanded &&
        item.children?.map((child) => (
          <PLLineRow key={child.id} item={child} indent={indent + 1} />
        ))}
    </>
  )
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="flex gap-4">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function getDefaultPeriodStart(periodType: PeriodType): string {
  const now = new Date()

  if (periodType === 'monthly') {
    now.setDate(1)
  } else if (periodType === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3)
    now.setMonth(quarter * 3)
    now.setDate(1)
  } else if (periodType === 'yearly') {
    now.setMonth(0)
    now.setDate(1)
  }

  return now.toISOString().split('T')[0]
}
