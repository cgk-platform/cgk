'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@cgk-platform/ui'

import type { DateRange } from '@/lib/analytics'

import { AnalyticsTabs } from './components/analytics-tabs'
import { DateRangePicker } from './components/date-range-picker'
import { OverviewKPIs } from './components/overview-kpis'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '30d',
    startDate: getDefaultStartDate('30d'),
    endDate: new Date().toISOString().split('T')[0] ?? '',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Commerce metrics, unit economics, and performance analysis
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <Card>
        <CardHeader className="pb-0">
          <OverviewKPIs dateRange={dateRange} />
        </CardHeader>
        <CardContent className="pt-6">
          <AnalyticsTabs dateRange={dateRange} />
        </CardContent>
      </Card>
    </div>
  )
}

function getDefaultStartDate(preset: string): string {
  const now = new Date()
  const days = { '7d': 7, '14d': 14, '28d': 28, '30d': 30, '90d': 90 }[preset] || 30
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return start.toISOString().split('T')[0] ?? ''
}
