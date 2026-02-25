'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'

interface SessionUsageProps {
  usage: {
    totalSessions: number
    activeSessions: number
    totalTokens: number
    totalCost: number
    byModel: Record<string, { tokens: number; cost: number }>
  } | null
}

export function SessionUsage({ usage }: SessionUsageProps) {
  if (!usage) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Usage data unavailable
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground">
              Total Sessions
            </p>
            <p className="text-2xl font-semibold">{usage.totalSessions}</p>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground">
              Active
            </p>
            <p className="text-2xl font-semibold">{usage.activeSessions}</p>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground">
              Total Tokens
            </p>
            <p className="text-2xl font-semibold">
              {usage.totalTokens.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground">
              Total Cost
            </p>
            <p className="text-2xl font-semibold text-gold">
              ${usage.totalCost.toFixed(2)}
            </p>
          </div>
        </div>

        {Object.keys(usage.byModel).length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              By Model
            </h4>
            {Object.entries(usage.byModel).map(([model, data]) => (
              <div
                key={model}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono text-xs">{model}</span>
                <div className="flex gap-4 text-muted-foreground">
                  <span>{data.tokens.toLocaleString()} tokens</span>
                  <span className="text-gold">${data.cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
