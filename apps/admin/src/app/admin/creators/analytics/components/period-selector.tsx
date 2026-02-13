'use client'

import { cn } from '@cgk-platform/ui'
import { Download } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import type { AnalyticsPeriod } from '@/lib/creators/analytics-types'

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
]

interface PeriodSelectorProps {
  currentPeriod: AnalyticsPeriod
  showExport?: boolean
}

export function PeriodSelector({ currentPeriod, showExport = true }: PeriodSelectorProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildUrl = (period: AnalyticsPeriod) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    return `${pathname}?${params.toString()}`
  }

  const exportUrl = `/api/admin/creators/analytics/export?period=${currentPeriod}&type=all&format=csv`

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 rounded-lg border p-1">
        {periods.map((period) => (
          <Link
            key={period.value}
            href={buildUrl(period.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              currentPeriod === period.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {period.label}
          </Link>
        ))}
      </div>

      {showExport && (
        <a
          href={exportUrl}
          download
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export
        </a>
      )}
    </div>
  )
}
