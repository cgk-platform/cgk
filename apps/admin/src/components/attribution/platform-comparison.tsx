'use client'

import { Card, CardContent, cn } from '@cgk/ui'

import type { PlatformComparison } from '@/lib/attribution'

interface PlatformComparisonWidgetProps {
  data: PlatformComparison[]
}

const platformIcons: Record<string, { icon: string; color: string; bgColor: string }> = {
  meta: { icon: 'M', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  google: { icon: 'G', color: 'text-red-600', bgColor: 'bg-red-100' },
  tiktok: { icon: 'T', color: 'text-black', bgColor: 'bg-gray-100' },
  organic: { icon: 'O', color: 'text-green-600', bgColor: 'bg-green-100' },
  direct: { icon: 'D', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  email: { icon: 'E', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  other: { icon: '?', color: 'text-slate-600', bgColor: 'bg-slate-100' },
}

const defaultPlatformStyle = { icon: '?', color: 'text-slate-600', bgColor: 'bg-slate-100' }

function getPlatformStyle(platform: string): { icon: string; color: string; bgColor: string } {
  return platformIcons[platform.toLowerCase()] ?? platformIcons.other ?? defaultPlatformStyle
}

export function PlatformComparisonWidget({ data }: PlatformComparisonWidgetProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-sm font-medium">Platform Comparison</h3>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No platform data available</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((platform) => {
              const style = getPlatformStyle(platform.platform)
              return (
                <div
                  key={platform.platform}
                  className="rounded-lg border p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                        style.bgColor,
                        style.color
                      )}
                    >
                      {style.icon}
                    </div>
                    <span className="font-medium capitalize">{platform.platform}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Spend</p>
                      <p className="font-medium">${platform.spend.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-medium">${platform.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROAS</p>
                      <p className="font-medium">{platform.roas.toFixed(2)}x</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conversions</p>
                      <p className="font-medium">{platform.conversions}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PlatformComparisonSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j}>
                    <div className="mb-1 h-3 w-12 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
