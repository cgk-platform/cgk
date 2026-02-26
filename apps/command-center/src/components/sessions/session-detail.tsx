'use client'

import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@cgk-platform/ui'
import { Clock, Cpu, DollarSign, Hash, Zap } from 'lucide-react'

interface SessionDetailProps {
  session: Record<string, unknown>
  usage: Record<string, unknown> | null
  source: string
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function SessionDetail({ session, usage, source }: SessionDetailProps) {
  const kind = (session.kind as string) || (session.type as string) || 'unknown'
  const agentId = (session.agentId as string) || 'default'
  const channel = (session.channel as string) || (session.groupChannel as string) || '-'
  const key = (session.key as string) || (session.id as string) || '-'

  // Extract usage data
  const usageData = usage?.usage as Record<string, unknown> | undefined
  const dailyBreakdown = usageData?.dailyBreakdown as Array<{
    models?: Array<{ id: string; inputTokens?: number; outputTokens?: number; totalCost?: number }>
  }> | undefined

  let totalTokens = 0
  let totalCost = 0
  const byModel: Record<string, { input: number; output: number; cost: number }> = {}

  if (dailyBreakdown) {
    for (const day of dailyBreakdown) {
      if (day.models) {
        for (const model of day.models) {
          const input = model.inputTokens ?? 0
          const output = model.outputTokens ?? 0
          const cost = model.totalCost ?? 0
          totalTokens += input + output
          totalCost += cost
          if (!byModel[model.id]) byModel[model.id] = { input: 0, output: 0, cost: 0 }
          byModel[model.id]!.input += input
          byModel[model.id]!.output += output
          byModel[model.id]!.cost += cost
        }
      }
    }
  }

  // Context window gauge
  const contextUsed = (session.contextTokens as number) || 0
  const contextLimit = (session.contextLimit as number) || 200_000
  const contextPct = contextLimit > 0 ? Math.min((contextUsed / contextLimit) * 100, 100) : 0

  return (
    <div className="space-y-6">
      {/* Session metadata */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Session Info</CardTitle>
            <StatusBadge
              status={source === 'rpc' ? 'connected' : source === 'file' ? 'ready' : 'pending'}
              label={`via ${source}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Session ID</p>
                <p className="truncate font-mono text-xs">{key}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium">{kind}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="text-sm">{agentId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Channel</p>
                <p className="truncate text-sm">{channel}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage summary */}
      {(totalTokens > 0 || totalCost > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Tokens</p>
                  <p className="text-lg font-bold">{formatTokens(totalTokens)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gold" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-bold text-gold">${totalCost.toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Context window gauge */}
      {contextUsed > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Context Window</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTokens(contextUsed)} used</span>
                <span>{formatTokens(contextLimit)} limit</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    contextPct > 80 ? 'bg-destructive' : contextPct > 60 ? 'bg-warning' : 'bg-primary'
                  }`}
                  style={{ width: `${contextPct}%` }}
                />
              </div>
              <p className="text-right text-xs text-muted-foreground">{contextPct.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model breakdown */}
      {Object.keys(byModel).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Model</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Input</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Output</th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byModel).map(([modelId, data]) => (
                  <tr key={modelId} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{modelId}</td>
                    <td className="py-2 text-right text-xs text-muted-foreground">
                      {formatTokens(data.input)}
                    </td>
                    <td className="py-2 text-right text-xs text-muted-foreground">
                      {formatTokens(data.output)}
                    </td>
                    <td className="py-2 text-right text-xs text-gold">
                      ${data.cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
