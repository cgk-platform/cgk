'use client'

import { Card, CardContent, cn } from '@cgk/ui'

import type { ChannelBreakdown } from '@/lib/attribution'

interface ChannelBreakdownChartProps {
  data: ChannelBreakdown[]
}

const channelColors: Record<string, string> = {
  paid_search: 'bg-blue-500',
  paid_social: 'bg-purple-500',
  organic_search: 'bg-green-500',
  organic_social: 'bg-pink-500',
  direct: 'bg-gray-500',
  email: 'bg-orange-500',
  referral: 'bg-cyan-500',
  affiliate: 'bg-yellow-500',
  display: 'bg-indigo-500',
  other: 'bg-slate-400',
}

function getChannelColor(channel: string): string {
  const key = channel.toLowerCase().replace(/\s+/g, '_')
  return channelColors[key] ?? channelColors.other ?? 'bg-slate-400'
}

export function ChannelBreakdownChart({ data }: ChannelBreakdownChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-sm font-medium">Revenue by Channel</h3>
        <div className="space-y-3">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No channel data available</p>
          ) : (
            data.map((channel) => {
              const percentage = (channel.revenue / maxRevenue) * 100
              return (
                <div key={channel.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">
                      {channel.channel.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground">
                      ${channel.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', getChannelColor(channel.channel))}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{channel.conversions} conversions</span>
                    <span>ROAS: {channel.roas.toFixed(2)}x</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ChannelBreakdownSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-2 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
