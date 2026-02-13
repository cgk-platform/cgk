'use client'

import { useState } from 'react'

import { Card, CardHeader, CardContent, cn } from '@cgk-platform/ui'

import { useSegmentData } from '@/lib/ab-tests/hooks'
import type { SegmentData } from '@/lib/ab-tests/types'

interface SegmentAnalysisTabsProps {
  testId: string
}

const tabs = [
  { key: 'device', label: 'By Device' },
  { key: 'country', label: 'By Country' },
  { key: 'source', label: 'By Source' },
] as const

export function SegmentAnalysisTabs({ testId }: SegmentAnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState<'device' | 'country' | 'source'>('device')

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Segment Analysis</h2>
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  'border-b-2',
                  activeTab === tab.key
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <SegmentTable testId={testId} segmentType={activeTab} />
      </CardContent>
    </Card>
  )
}

function SegmentTable({
  testId,
  segmentType,
}: {
  testId: string
  segmentType: 'device' | 'country' | 'source'
}) {
  const { data, isLoading } = useSegmentData(testId, segmentType)

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-slate-500">No segment data available yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              {segmentType === 'device'
                ? 'Device'
                : segmentType === 'country'
                  ? 'Country'
                  : 'Source'}
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Visitors
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Conversions
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Conv. Rate
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Revenue
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => (
            <SegmentRow key={row.value} data={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SegmentRow({ data }: { data: SegmentData }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-3">
        <span className="font-medium text-slate-900">
          {formatSegmentValue(data.value)}
        </span>
      </td>
      <td className="px-6 py-3 text-right font-mono text-slate-900">
        {data.visitors.toLocaleString()}
      </td>
      <td className="px-6 py-3 text-right font-mono text-slate-900">
        {data.conversions.toLocaleString()}
      </td>
      <td className="px-6 py-3 text-right font-mono text-slate-900">
        {(data.conversionRate * 100).toFixed(2)}%
      </td>
      <td className="px-6 py-3 text-right font-mono text-slate-900">
        ${data.revenue.toLocaleString()}
      </td>
    </tr>
  )
}

function formatSegmentValue(value: string | undefined): string {
  if (!value || value === 'unknown') return 'Unknown'

  const lowercaseValue = value.toLowerCase()
  const deviceLabels: Record<string, string> = {
    desktop: 'Desktop',
    mobile: 'Mobile',
    tablet: 'Tablet',
  }

  const deviceLabel = deviceLabels[lowercaseValue]
  if (deviceLabel) {
    return deviceLabel
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}
