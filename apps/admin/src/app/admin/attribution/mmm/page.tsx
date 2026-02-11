'use client'

import { Button, Card, CardContent, cn } from '@cgk/ui'
import { AlertCircle, CheckCircle, Loader2, Play, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  BudgetOptimizationResult,
  MMMModel,
  MMMResults,
  SaturationCurve,
} from '@/lib/attribution'

// ============================================================
// MMM Configuration Component
// ============================================================

interface MMMConfigProps {
  onRunModel: (channels: string[], startDate: string, endDate: string) => void
  isRunning: boolean
}

function MMMConfiguration({ onRunModel, isRunning }: MMMConfigProps) {
  const [channels, setChannels] = useState('meta, google, tiktok, email, direct')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]!)

  const handleSubmit = () => {
    const channelList = channels.split(',').map((c) => c.trim()).filter(Boolean)
    if (channelList.length === 0) return
    onRunModel(channelList, startDate!, endDate!)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 font-semibold">MMM Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Channels (comma-separated)</label>
            <input
              type="text"
              value={channels}
              onChange={(e) => setChannels(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="meta, google, tiktok, email"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isRunning} className="w-full">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Training Model...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run MMM Model
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Model Fit Metrics Component
// ============================================================

interface ModelFitMetricsProps {
  model: MMMModel | null
  results: MMMResults | null
}

function ModelFitMetrics({ model, results }: ModelFitMetricsProps) {
  if (!model) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center p-6 text-muted-foreground">
          No model trained yet. Configure and run the MMM model to see results.
        </CardContent>
      </Card>
    )
  }

  const statusIcon = {
    draft: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
    running: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
    completed: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    failed: <AlertCircle className="h-5 w-5 text-red-500" />,
  }

  const statusText = {
    draft: 'Draft',
    running: 'Training...',
    completed: 'Completed',
    failed: 'Failed',
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Model Status</h3>
          <div className="flex items-center gap-2">
            {statusIcon[model.status]}
            <span
              className={cn(
                'text-sm font-medium',
                model.status === 'completed' && 'text-emerald-600',
                model.status === 'running' && 'text-blue-600',
                model.status === 'failed' && 'text-red-600'
              )}
            >
              {statusText[model.status]}
            </span>
          </div>
        </div>

        {results?.modelFit && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">R-Squared</div>
              <div className="text-2xl font-bold">{(results.modelFit.r2 * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">MAPE</div>
              <div className="text-2xl font-bold">{(results.modelFit.mape * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">Bayesian R-Squared</div>
              <div className="text-2xl font-bold">
                {(results.modelFit.bayesianR2 * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Last run: {model.completedAt ?? model.createdAt}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Channel Contributions Table
// ============================================================

interface ChannelContributionsProps {
  results: MMMResults | null
}

function ChannelContributionsTable({ results }: ChannelContributionsProps) {
  if (!results) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 font-semibold">Channel Contributions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium">Channel</th>
                <th className="pb-3 font-medium text-right">Contribution %</th>
                <th className="pb-3 font-medium text-right">Current ROI</th>
                <th className="pb-3 font-medium text-right">Marginal ROI</th>
                <th className="pb-3 font-medium text-right">Saturation Point</th>
                <th className="pb-3 font-medium text-right">Optimal Spend</th>
                <th className="pb-3 font-medium text-right">Current Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.channels.map((channel) => (
                <tr key={channel.channel} className="hover:bg-muted/50">
                  <td className="py-3 font-medium">{channel.channel}</td>
                  <td className="py-3 text-right">{channel.contributionPercent.toFixed(1)}%</td>
                  <td className="py-3 text-right">{channel.currentRoi.toFixed(2)}x</td>
                  <td className="py-3 text-right">
                    <span
                      className={cn(
                        channel.marginalRoi > 1 ? 'text-emerald-600' : 'text-red-600'
                      )}
                    >
                      {channel.marginalRoi.toFixed(2)}x
                    </span>
                  </td>
                  <td className="py-3 text-right">${channel.saturationPoint.toLocaleString()}</td>
                  <td className="py-3 text-right">${channel.optimalSpend.toLocaleString()}</td>
                  <td className="py-3 text-right">${channel.currentSpend.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Saturation Curves Chart
// ============================================================

interface SaturationCurvesProps {
  curves: SaturationCurve[]
  channels: MMMResults['channels']
}

function SaturationCurvesChart({ curves, channels }: SaturationCurvesProps) {
  if (!curves || curves.length === 0) {
    return null
  }

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899']

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 font-semibold">Saturation Curves</h3>
        <div className="relative h-64">
          <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
            <defs>
              {curves.map((curve, i) => (
                <linearGradient
                  key={curve.channel}
                  id={`gradient-${i}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            <line x1="40" y1="180" x2="390" y2="180" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="40" y1="180" x2="40" y2="10" stroke="#e5e7eb" strokeWidth="1" />

            {curves.map((curve, curveIndex) => {
              const maxSpend = Math.max(...curve.curve.map((p) => p.spend))
              const maxRevenue = Math.max(...curves.flatMap((c) => c.curve.map((p) => p.revenue)))

              const points = curve.curve
                .map((point) => {
                  const x = 40 + (point.spend / maxSpend) * 350
                  const y = 180 - (point.revenue / maxRevenue) * 170
                  return `${x},${y}`
                })
                .join(' ')

              const channelData = channels.find((c) => c.channel === curve.channel)
              const currentX = channelData
                ? 40 + (channelData.currentSpend / maxSpend) * 350
                : null

              return (
                <g key={curve.channel}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={colors[curveIndex % colors.length]}
                    strokeWidth="2"
                  />
                  {currentX && (
                    <line
                      x1={currentX}
                      y1="10"
                      x2={currentX}
                      y2="180"
                      stroke={colors[curveIndex % colors.length]}
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  )}
                </g>
              )
            })}

            <text x="215" y="198" textAnchor="middle" className="text-xs fill-muted-foreground">
              Spend
            </text>
            <text
              x="15"
              y="100"
              textAnchor="middle"
              transform="rotate(-90 15 100)"
              className="text-xs fill-muted-foreground"
            >
              Revenue
            </text>
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {curves.map((curve, i) => (
            <div key={curve.channel} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-sm">{curve.channel}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Budget Optimizer
// ============================================================

interface BudgetOptimizerProps {
  results: MMMResults | null
}

function BudgetOptimizer({ results }: BudgetOptimizerProps) {
  const [totalBudget, setTotalBudget] = useState('')
  const [optimization, setOptimization] = useState<BudgetOptimizationResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  const handleOptimize = async () => {
    const budget = parseFloat(totalBudget)
    if (isNaN(budget) || budget <= 0) return

    setIsOptimizing(true)
    try {
      const response = await fetch('/api/admin/attribution/mmm/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalBudget: budget }),
      })
      const data = await response.json()
      setOptimization(data.optimization ?? null)
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  if (!results) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 font-semibold">Budget Optimizer</h3>

        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Total Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="w-full rounded border py-2 pl-7 pr-3 text-sm"
                placeholder="Enter total budget"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={handleOptimize} disabled={isOptimizing || !totalBudget}>
              {isOptimizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Optimize
                </>
              )}
            </Button>
          </div>
        </div>

        {optimization && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">Current Revenue</div>
                <div className="text-xl font-bold">
                  ${optimization.projectedRevenue.current.toLocaleString()}
                </div>
              </div>
              <div className="rounded bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">Optimized Revenue</div>
                <div className="text-xl font-bold text-emerald-600">
                  ${optimization.projectedRevenue.optimized.toLocaleString()}
                </div>
              </div>
              <div className="rounded bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">Revenue Lift</div>
                <div className="text-xl font-bold text-emerald-600">
                  +${optimization.projectedRevenue.lift.toLocaleString()}
                </div>
              </div>
              <div className="rounded bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">Lift %</div>
                <div className="text-xl font-bold text-emerald-600">
                  +{optimization.projectedRevenue.liftPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Channel</th>
                    <th className="pb-3 font-medium text-right">Current Allocation</th>
                    <th className="pb-3 font-medium text-right">Optimized Allocation</th>
                    <th className="pb-3 font-medium text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.keys(optimization.currentAllocation).map((channel) => {
                    const current = optimization.currentAllocation[channel] ?? 0
                    const optimized = optimization.optimizedAllocation[channel] ?? 0
                    const change = optimized - current
                    const changePercent = current > 0 ? (change / current) * 100 : 0

                    return (
                      <tr key={channel} className="hover:bg-muted/50">
                        <td className="py-3 font-medium">{channel}</td>
                        <td className="py-3 text-right">${current.toLocaleString()}</td>
                        <td className="py-3 text-right">${optimized.toLocaleString()}</td>
                        <td className="py-3 text-right">
                          <span
                            className={cn(
                              change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : ''
                            )}
                          >
                            {change > 0 ? '+' : ''}
                            {changePercent.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Main MMM Page
// ============================================================

export default function MMMPage() {
  const [model, setModel] = useState<MMMModel | null>(null)
  const [results, setResults] = useState<MMMResults | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const fetchMMMData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/attribution/mmm')
      const data = await response.json()
      setModel(data.model ?? null)
      setResults(data.results ?? null)

      if (data.model?.status === 'running') {
        setIsRunning(true)
        setTimeout(fetchMMMData, 2000)
      } else {
        setIsRunning(false)
      }
    } catch (error) {
      console.error('Failed to fetch MMM data:', error)
    }
  }, [])

  useEffect(() => {
    fetchMMMData()
  }, [fetchMMMData])

  const handleRunModel = async (channels: string[], startDate: string, endDate: string) => {
    setIsRunning(true)
    try {
      const response = await fetch('/api/admin/attribution/mmm/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels, dateRangeStart: startDate, dateRangeEnd: endDate }),
      })
      const data = await response.json()
      setModel(data.model ?? null)
      setTimeout(fetchMMMData, 2000)
    } catch (error) {
      console.error('Failed to run MMM model:', error)
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Media Mix Modeling</h2>
        <p className="text-sm text-muted-foreground">
          Understand channel saturation and optimize budget allocation
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MMMConfiguration onRunModel={handleRunModel} isRunning={isRunning} />
        <ModelFitMetrics model={model} results={results} />
      </div>

      {results && (
        <>
          <ChannelContributionsTable results={results} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SaturationCurvesChart curves={results.saturationCurves} channels={results.channels} />
            <BudgetOptimizer results={results} />
          </div>
        </>
      )}
    </div>
  )
}
