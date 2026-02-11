'use client'

import { useEffect, useState } from 'react'

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cgk/ui'

import type { AgentCSATScore, CSATMetrics } from '@cgk/support'

export default function CSATDashboardPage() {
  const [metrics, setMetrics] = useState<CSATMetrics | null>(null)
  const [agentScores, setAgentScores] = useState<AgentCSATScore[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, agentsRes] = await Promise.all([
          fetch(`/api/admin/support/csat?days=${days}`),
          fetch(`/api/admin/support/csat/agents?days=${days}`),
        ])

        if (metricsRes.ok) {
          const data = await metricsRes.json()
          setMetrics(data.metrics)
        }

        if (agentsRes.ok) {
          const data = await agentsRes.json()
          setAgentScores(data.scores)
        }
      } catch (error) {
        console.error('Failed to fetch CSAT data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [days])

  const getRatingColor = (rating: number | null): string => {
    if (rating === null) return 'text-zinc-400'
    if (rating >= 4.5) return 'text-emerald-400'
    if (rating >= 4.0) return 'text-green-400'
    if (rating >= 3.0) return 'text-amber-400'
    return 'text-red-400'
  }

  const getRatingBadgeVariant = (rating: number | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (rating === null) return 'outline'
    if (rating >= 4.0) return 'default'
    if (rating >= 3.0) return 'secondary'
    return 'destructive'
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-zinc-500">Loading CSAT data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Customer Satisfaction
          </h1>
          <p className="text-sm text-zinc-500">
            Track and analyze customer satisfaction scores
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-zinc-500">Average Rating</div>
            <div className={`mt-1 text-3xl font-bold ${getRatingColor(metrics?.avgRating ?? null)}`}>
              {metrics?.avgRating?.toFixed(2) ?? '--'}
              <span className="ml-1 text-lg text-zinc-500">/5</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-zinc-500">Response Rate</div>
            <div className="mt-1 text-3xl font-bold text-zinc-200">
              {metrics?.responseRate?.toFixed(1) ?? 0}%
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {metrics?.totalResponded ?? 0} of {metrics?.totalSent ?? 0} surveys
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-zinc-500">Surveys Sent</div>
            <div className="mt-1 text-3xl font-bold text-zinc-200">
              {metrics?.totalSent ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-zinc-500">Responses</div>
            <div className="mt-1 text-3xl font-bold text-zinc-200">
              {metrics?.totalResponded ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
          <CardDescription>Breakdown of ratings received</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.ratingDistribution ? (
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count =
                  metrics.ratingDistribution[
                    `rating${rating}` as keyof typeof metrics.ratingDistribution
                  ]
                const percentage =
                  metrics.totalResponded > 0
                    ? (count / metrics.totalResponded) * 100
                    : 0

                return (
                  <div key={rating} className="flex items-center gap-4">
                    <div className="flex w-12 items-center gap-1 text-sm font-medium">
                      {rating}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="text-amber-400"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rating >= 4
                              ? 'bg-emerald-500'
                              : rating === 3
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm text-zinc-400">
                      {count} ({percentage.toFixed(0)}%)
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No rating data available</p>
          )}
        </CardContent>
      </Card>

      {/* Agent Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
          <CardDescription>CSAT scores by support agent</CardDescription>
        </CardHeader>
        <CardContent>
          {agentScores.length === 0 ? (
            <p className="text-sm text-zinc-500">No agent data available</p>
          ) : (
            <div className="space-y-4">
              {agentScores.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold">
                      {agent.agentName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div className="font-medium">{agent.agentName}</div>
                      <div className="text-xs text-zinc-500">
                        {agent.responseCount} responses
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant={getRatingBadgeVariant(agent.avgRating)}>
                        {agent.avgRating?.toFixed(2) ?? '--'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={
                            agent.avgRating && star <= Math.round(agent.avgRating)
                              ? 'currentColor'
                              : 'none'
                          }
                          stroke="currentColor"
                          strokeWidth="2"
                          className={
                            agent.avgRating && star <= Math.round(agent.avgRating)
                              ? 'text-amber-400'
                              : 'text-zinc-600'
                          }
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
