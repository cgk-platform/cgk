'use client'

import { ExternalLink } from 'lucide-react'

import { Card, CardHeader, CardContent, cn } from '@cgk/ui'

import type { ABTest } from '@/lib/ab-tests/types'

interface TestConfigCardProps {
  test: ABTest
}

export function TestConfigCard({ test }: TestConfigCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Configuration
        </h3>
      </CardHeader>
      <CardContent className="p-4">
        <dl className="space-y-3 text-sm">
          <ConfigItem label="Test Type" value={formatTestType(test.testType)} />
          <ConfigItem label="Goal Event" value={formatGoalEvent(test.goalEvent)} />
          <ConfigItem
            label="Optimization"
            value={formatMetric(test.optimizationMetric)}
          />
          <ConfigItem
            label="Confidence"
            value={`${test.confidenceLevel * 100}%`}
            highlight
          />
          <ConfigItem
            label="Allocation Mode"
            value={test.mode === 'mab' ? 'Multi-Armed Bandit' : 'Manual Split'}
          />

          {test.baseUrl && (
            <div className="border-t border-slate-100 pt-3">
              <dt className="text-xs text-slate-500">Base URL</dt>
              <dd className="mt-1">
                <a
                  href={test.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-cyan-600 hover:text-cyan-700"
                >
                  {truncateUrl(test.baseUrl)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <ConfigItem
              label="Created"
              value={formatDate(test.createdAt)}
            />
            {test.startedAt && (
              <ConfigItem
                label="Started"
                value={formatDate(test.startedAt)}
              />
            )}
            {test.endedAt && (
              <ConfigItem
                label="Ended"
                value={formatDate(test.endedAt)}
              />
            )}
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function ConfigItem({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={cn(
          'font-medium',
          highlight ? 'font-mono text-cyan-600' : 'text-slate-900'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function formatTestType(type: string): string {
  const labels: Record<string, string> = {
    landing_page: 'Landing Page',
    shipping: 'Shipping',
    email: 'Email',
    checkout: 'Checkout',
    pricing: 'Pricing',
  }
  return labels[type] || type
}

function formatGoalEvent(event: string): string {
  const labels: Record<string, string> = {
    page_view: 'Page View',
    add_to_cart: 'Add to Cart',
    begin_checkout: 'Begin Checkout',
    purchase: 'Purchase',
  }
  return labels[event] || event
}

function formatMetric(metric: string): string {
  const labels: Record<string, string> = {
    conversion_rate: 'Conversion Rate',
    revenue_per_visitor: 'Revenue/Visitor',
    average_order_value: 'Avg. Order Value',
  }
  return labels[metric] || metric
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname
    if (path.length > 20) {
      return `${parsed.host}${path.slice(0, 20)}...`
    }
    return `${parsed.host}${path}`
  } catch {
    return url.slice(0, 30) + '...'
  }
}
