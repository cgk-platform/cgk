'use client'

import { Button, Card, CardContent, cn } from '@cgk-platform/ui'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAttribution } from '@/components/attribution'
import type { AIInsightsData, Anomaly, Recommendation, Trend } from '@/lib/attribution'

// ============================================================
// Executive Summary Component
// ============================================================

interface ExecutiveSummaryProps {
  summary: string
  healthScore: number
  dateRange: { start: string; end: string }
}

function ExecutiveSummary({ summary, healthScore, dateRange }: ExecutiveSummaryProps) {
  const healthColor =
    healthScore >= 70
      ? 'text-emerald-600'
      : healthScore >= 40
        ? 'text-orange-600'
        : 'text-red-600'

  const healthBg =
    healthScore >= 70
      ? 'bg-emerald-100'
      : healthScore >= 40
        ? 'bg-orange-100'
        : 'bg-red-100'

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Executive Summary</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(dateRange.start).toLocaleDateString()} -{' '}
                {new Date(dateRange.end).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Health Score</div>
            <div className={cn('flex items-center gap-2', healthColor)}>
              <div className={cn('rounded-full px-3 py-1 text-lg font-bold', healthBg)}>
                {healthScore}
              </div>
              <span className="text-sm">/ 100</span>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded bg-muted/50 p-4">
          <p className="text-sm leading-relaxed">{summary}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Anomalies Section Component
// ============================================================

interface AnomaliesSectionProps {
  anomalies: Anomaly[]
}

function AnomaliesSection({ anomalies }: AnomaliesSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="font-semibold">Anomalies</h3>
              <p className="text-sm text-muted-foreground">
                No significant anomalies detected in this period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-200',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      border: 'border-orange-200',
    },
    info: {
      icon: Zap,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      border: 'border-blue-200',
    },
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 font-semibold">Anomalies Detected ({anomalies.length})</h3>
        <div className="space-y-3">
          {anomalies.map((anomaly) => {
            const config = severityConfig[anomaly.severity]
            const Icon = config.icon
            const isExpanded = expandedId === anomaly.id

            return (
              <div
                key={anomaly.id}
                className={cn('rounded-lg border p-4', config.border)}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                  className="flex w-full items-start justify-between text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('rounded-full p-1.5', config.bg)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{anomaly.metric}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs font-medium uppercase',
                            config.bg,
                            config.color
                          )}
                        >
                          {anomaly.severity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {anomaly.confidence} confidence
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {anomaly.description}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 rounded bg-muted/50 p-3">
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      Recommended Action
                    </div>
                    <p className="text-sm">{anomaly.recommendation}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Date range: {anomaly.dateRange.start} to {anomaly.dateRange.end}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Trends Section Component
// ============================================================

interface TrendsSectionProps {
  trends: Trend[]
}

function TrendsSection({ trends }: TrendsSectionProps) {
  if (trends.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Trends</h3>
              <p className="text-sm text-muted-foreground">
                Metrics are stable with no significant trends detected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const directionConfig = {
    up: { icon: TrendingUp, color: 'text-emerald-600', arrow: ArrowUp },
    down: { icon: TrendingDown, color: 'text-red-600', arrow: ArrowDown },
    stable: { icon: ArrowRight, color: 'text-muted-foreground', arrow: ArrowRight },
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 font-semibold">Trends ({trends.length})</h3>
        <div className="space-y-3">
          {trends.map((trend) => {
            const config = directionConfig[trend.direction]
            const TrendIcon = config.icon
            const ArrowIcon = config.arrow

            return (
              <div key={trend.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <TrendIcon className={cn('mt-0.5 h-5 w-5', config.color)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{trend.metric}</span>
                      <span className={cn('flex items-center gap-1 text-sm', config.color)}>
                        <ArrowIcon className="h-3 w-3" />
                        {trend.magnitude.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{trend.description}</p>
                    <div className="mt-2 rounded bg-muted/50 p-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Projected Impact
                      </div>
                      <p className="text-sm">{trend.projectedImpact}</p>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Period: {trend.period}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Recommendations Section Component
// ============================================================

interface RecommendationsSectionProps {
  recommendations: Recommendation[]
}

function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                No specific recommendations at this time. Keep monitoring your metrics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const priorityConfig = {
    high: { color: 'text-red-600', bg: 'bg-red-100' },
    medium: { color: 'text-orange-600', bg: 'bg-orange-100' },
    low: { color: 'text-blue-600', bg: 'bg-blue-100' },
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 font-semibold">Recommendations ({recommendations.length})</h3>
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const config = priorityConfig[rec.priority]
            const isExpanded = expandedId === rec.id

            return (
              <div key={rec.id} className="rounded-lg border p-4">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="flex w-full items-start justify-between text-left"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rec.title}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs font-medium uppercase',
                            config.bg,
                            config.color
                          )}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded bg-emerald-50 p-3">
                      <div className="mb-1 text-xs font-medium text-emerald-700">
                        Estimated Impact
                      </div>
                      <p className="text-sm text-emerald-800">{rec.estimatedImpact}</p>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">
                        Action Steps
                      </div>
                      <ul className="space-y-1">
                        {rec.actionSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Main AI Insights Page
// ============================================================

export default function AIInsightsPage() {
  const { startDate, endDate } = useAttribution()
  const [insights, setInsights] = useState<AIInsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isCached, setIsCached] = useState(false)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      const response = await fetch(`/api/admin/attribution/ai-insights?${params}`)
      const data = await response.json()
      setInsights(data.insights ?? null)
      setIsCached(data.cached ?? false)
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  const regenerateInsights = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch('/api/admin/attribution/ai-insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const data = await response.json()
      setInsights(data.insights ?? null)
      setIsCached(false)
    } catch (error) {
      console.error('Failed to regenerate insights:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered analysis of your attribution data
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Analyzing your data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered analysis of your attribution data
          </p>
        </div>
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">No Insights Available</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Not enough data to generate insights. Ensure attribution tracking is set up.
            </p>
            <Button className="mt-4" onClick={regenerateInsights}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Insights
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered analysis of your attribution data
            {isCached && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Cached - generated at {new Date(insights.generatedAt).toLocaleString()})
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={regenerateInsights} disabled={isRegenerating}>
          {isRegenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      <ExecutiveSummary
        summary={insights.executiveSummary}
        healthScore={insights.healthScore}
        dateRange={insights.dateRange}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AnomaliesSection anomalies={insights.anomalies} />
        <TrendsSection trends={insights.trends} />
      </div>

      <RecommendationsSection recommendations={insights.recommendations} />
    </div>
  )
}
