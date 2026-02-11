'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardContent, cn } from '@cgk/ui'

import { useAttribution, TimeRangePicker } from '@/components/attribution'
import type { CohortData, CohortGrouping, CohortLTV } from '@/lib/attribution'

const healthColors: Record<CohortData['health'], string> = {
  healthy: 'bg-green-100 text-green-800',
  at_risk: 'bg-yellow-100 text-yellow-800',
  poor: 'bg-red-100 text-red-800',
}

function CohortGrid({ cohorts }: { cohorts: CohortData[] }) {
  const ltvKeys: (keyof CohortLTV)[] = ['day0', 'day7', 'day30', 'day60', 'day90', 'day180']
  const maxLtv = Math.max(...cohorts.flatMap((c) => ltvKeys.map((k) => c.ltv[k])), 1)

  const getColorIntensity = (value: number): string => {
    const intensity = Math.min(value / maxLtv, 1)
    const green = Math.round(220 - intensity * 100)
    const blue = Math.round(240 - intensity * 120)
    return `rgb(${green}, ${green + 30}, ${blue})`
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium sticky left-0 bg-muted/50">Cohort</th>
            <th className="p-3 text-right font-medium">Customers</th>
            <th className="p-3 text-right font-medium">CAC</th>
            {ltvKeys.map((key) => (
              <th key={key} className="p-3 text-right font-medium">
                {key === 'day0' ? 'Day 0' : key.replace('day', 'D')}
              </th>
            ))}
            <th className="p-3 text-right font-medium">Payback</th>
            <th className="p-3 text-right font-medium">90d Ret.</th>
            <th className="p-3 text-center font-medium">Health</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.cohortDate} className="border-b hover:bg-muted/30">
              <td className="p-3 font-medium sticky left-0 bg-white">{cohort.cohortDate}</td>
              <td className="p-3 text-right">{cohort.customerCount}</td>
              <td className="p-3 text-right">${cohort.cac.toFixed(2)}</td>
              {ltvKeys.map((key) => (
                <td
                  key={key}
                  className="p-3 text-right transition-colors"
                  style={{ backgroundColor: getColorIntensity(cohort.ltv[key]) }}
                >
                  ${cohort.ltv[key].toFixed(0)}
                </td>
              ))}
              <td className="p-3 text-right">
                {cohort.paybackDays !== null ? `${cohort.paybackDays}d` : '-'}
              </td>
              <td className="p-3 text-right">{cohort.retention90d.toFixed(1)}%</td>
              <td className="p-3 text-center">
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', healthColors[cohort.health])}>
                  {cohort.health.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LtvCurveChart({ cohorts, selectedCohorts }: { cohorts: CohortData[]; selectedCohorts: string[] }) {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e']
  const ltvKeys: (keyof CohortLTV)[] = ['day0', 'day7', 'day30', 'day60', 'day90', 'day180']
  const days = [0, 7, 30, 60, 90, 180]

  const displayCohorts = cohorts.filter((c) => selectedCohorts.includes(c.cohortDate)).slice(0, 5)

  if (displayCohorts.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Select cohorts from the table to compare LTV curves
      </div>
    )
  }

  const maxLtv = Math.max(...displayCohorts.flatMap((c) => ltvKeys.map((k) => c.ltv[k])), 1)
  const maxDay = 180

  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const width = 100
  const height = 100

  return (
    <div className="h-64 relative">
      <svg className="w-full h-full" viewBox={`0 0 ${width + padding.left + padding.right} ${height + padding.top + padding.bottom}`}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + (100 - pct)}
            x2={padding.left + width}
            y2={padding.top + (100 - pct)}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}

        {/* LTV curves */}
        {displayCohorts.map((cohort, cohortIndex) => {
          const points = ltvKeys
            .map((key, i) => {
              const x = padding.left + (days[i] ?? 0 / maxDay) * width
              const y = padding.top + height - (cohort.ltv[key] / maxLtv) * height
              return `${x},${y}`
            })
            .join(' ')

          return (
            <polyline
              key={cohort.cohortDate}
              points={points}
              fill="none"
              stroke={colors[cohortIndex % colors.length]}
              strokeWidth="2"
            />
          )
        })}

        {/* X-axis labels */}
        {days.map((day) => (
          <text
            key={day}
            x={padding.left + (day / maxDay) * width}
            y={padding.top + height + 20}
            textAnchor="middle"
            className="text-[8px] fill-muted-foreground"
          >
            D{day}
          </text>
        ))}

        {/* Y-axis labels */}
        {[0, 50, 100].map((pct) => (
          <text
            key={pct}
            x={padding.left - 5}
            y={padding.top + height - (pct / 100) * height + 3}
            textAnchor="end"
            className="text-[8px] fill-muted-foreground"
          >
            ${Math.round((pct / 100) * maxLtv)}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {displayCohorts.map((cohort, i) => (
          <div key={cohort.cohortDate} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span>{cohort.cohortDate}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CohortsPage() {
  const { startDate, endDate } = useAttribution()
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [grouping, setGrouping] = useState<CohortGrouping>('monthly')
  const [channel, setChannel] = useState<string>('')
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([])

  const fetchCohorts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        grouping,
        startDate,
        endDate,
        ...(channel && { channel }),
      })
      const response = await fetch(`/api/admin/attribution/cohorts?${params}`)
      const data = await response.json()
      setCohorts(data.cohorts || [])
    } catch (error) {
      console.error('Failed to fetch cohorts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [grouping, startDate, endDate, channel])

  useEffect(() => {
    fetchCohorts()
  }, [fetchCohorts])

  const handleCohortClick = (cohortDate: string) => {
    setSelectedCohorts((prev) => {
      if (prev.includes(cohortDate)) {
        return prev.filter((c) => c !== cohortDate)
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), cohortDate]
      }
      return [...prev, cohortDate]
    })
  }

  const handleExportCsv = () => {
    const headers = ['Cohort', 'Grouping', 'Customers', 'CAC', 'Day 0 LTV', 'Day 7 LTV', 'Day 30 LTV', 'Day 60 LTV', 'Day 90 LTV', 'Day 180 LTV', 'Payback Days', 'Retention 90d', 'Health']
    const rows = cohorts.map((c) => [
      c.cohortDate,
      c.grouping,
      c.customerCount,
      c.cac,
      c.ltv.day0,
      c.ltv.day7,
      c.ltv.day30,
      c.ltv.day60,
      c.ltv.day90,
      c.ltv.day180,
      c.paybackDays ?? '',
      c.retention90d,
      c.health,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cohorts-${grouping}-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const avgPayback = cohorts.filter((c) => c.paybackDays !== null).reduce((sum, c) => sum + (c.paybackDays ?? 0), 0) / cohorts.filter((c) => c.paybackDays !== null).length || 0
  const avgRetention = cohorts.reduce((sum, c) => sum + c.retention90d, 0) / cohorts.length || 0
  const healthyPercent = (cohorts.filter((c) => c.health === 'healthy').length / cohorts.length) * 100 || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TimeRangePicker />
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Grouping:</span>
          {(['daily', 'weekly', 'monthly'] as CohortGrouping[]).map((g) => (
            <Button
              key={g}
              variant={grouping === g ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGrouping(g)}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-muted-foreground">Channel:</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md"
          >
            <option value="">All Channels</option>
            <option value="paid_social">Paid Social</option>
            <option value="paid_search">Paid Search</option>
            <option value="organic">Organic</option>
            <option value="direct">Direct</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg. Payback Period</p>
            <p className="text-2xl font-bold">{avgPayback.toFixed(0)} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg. 90-Day Retention</p>
            <p className="text-2xl font-bold">{avgRetention.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Healthy Cohorts</p>
            <p className="text-2xl font-bold">{healthyPercent.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium mb-4">Cohort LTV Grid</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Click rows to add them to the LTV curve comparison (max 5)
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : cohorts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No cohort data found for the selected period
              </div>
            ) : (
              <div
                onClick={(e) => {
                  const row = (e.target as HTMLElement).closest('tr')
                  if (row) {
                    const cohortDate = row.querySelector('td')?.textContent
                    if (cohortDate) handleCohortClick(cohortDate)
                  }
                }}
              >
                <CohortGrid cohorts={cohorts} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium mb-4">LTV Curve Comparison</h3>
            <LtvCurveChart cohorts={cohorts} selectedCohorts={selectedCohorts} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
