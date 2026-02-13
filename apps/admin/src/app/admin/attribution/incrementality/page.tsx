'use client'

import { Button, Card, CardContent, cn } from '@cgk-platform/ui'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  CreateExperimentRequest,
  IncrementalityExperiment,
  IncrementalityPlatform,
} from '@/lib/attribution'

// ============================================================
// Create Experiment Modal
// ============================================================

interface CreateExperimentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateExperimentRequest) => void
  isCreating: boolean
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

function CreateExperimentModal({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}: CreateExperimentModalProps) {
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState<IncrementalityPlatform>('meta')
  const [testRegions, setTestRegions] = useState<string[]>([])
  const [controlRegions, setControlRegions] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [preTestDays, setPreTestDays] = useState(14)
  const [budgetEstimate, setBudgetEstimate] = useState('')

  const handleSubmit = () => {
    if (!name || !platform || testRegions.length === 0 || controlRegions.length === 0) return
    if (!startDate || !endDate) return

    onCreate({
      name,
      platform,
      testRegions,
      controlRegions,
      startDate,
      endDate,
      preTestDays,
      budgetEstimate: budgetEstimate ? parseFloat(budgetEstimate) : undefined,
    })
  }

  const toggleRegion = (region: string, type: 'test' | 'control') => {
    if (type === 'test') {
      setTestRegions((prev) =>
        prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
      )
      setControlRegions((prev) => prev.filter((r) => r !== region))
    } else {
      setControlRegions((prev) =>
        prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
      )
      setTestRegions((prev) => prev.filter((r) => r !== region))
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-background p-6 shadow-xl max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Incrementality Experiment</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Experiment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Q1 Meta Holdout Test"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as IncrementalityPlatform)}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="meta">Meta (Facebook/Instagram)</option>
              <option value="google">Google Ads</option>
              <option value="tiktok">TikTok</option>
            </select>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Pre-Test Days</label>
              <input
                type="number"
                value={preTestDays}
                onChange={(e) => setPreTestDays(parseInt(e.target.value, 10))}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Budget Impact Estimate ($)</label>
              <input
                type="number"
                value={budgetEstimate}
                onChange={(e) => setBudgetEstimate(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Test Regions (Active Ads)
              <span className="ml-2 text-muted-foreground">({testRegions.length} selected)</span>
            </label>
            <div className="flex flex-wrap gap-1 rounded border p-2 max-h-32 overflow-y-auto">
              {US_STATES.map((state) => (
                <button
                  key={`test-${state}`}
                  onClick={() => toggleRegion(state, 'test')}
                  disabled={controlRegions.includes(state)}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                    testRegions.includes(state)
                      ? 'bg-blue-500 text-white'
                      : controlRegions.includes(state)
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Control Regions (Holdout - No Ads)
              <span className="ml-2 text-muted-foreground">({controlRegions.length} selected)</span>
            </label>
            <div className="flex flex-wrap gap-1 rounded border p-2 max-h-32 overflow-y-auto">
              {US_STATES.map((state) => (
                <button
                  key={`control-${state}`}
                  onClick={() => toggleRegion(state, 'control')}
                  disabled={testRegions.includes(state)}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                    controlRegions.includes(state)
                      ? 'bg-orange-500 text-white'
                      : testRegions.includes(state)
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isCreating ||
                !name ||
                testRegions.length === 0 ||
                controlRegions.length === 0 ||
                !startDate ||
                !endDate
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Experiment'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================
// Experiment Card Component
// ============================================================

interface ExperimentCardProps {
  experiment: IncrementalityExperiment
  onSelect: (experiment: IncrementalityExperiment) => void
  onDelete: (id: string) => void
}

function ExperimentCard({ experiment, onSelect, onDelete }: ExperimentCardProps) {
  const statusConfig = {
    draft: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
    running: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100' },
    completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    cancelled: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  }

  const config = statusConfig[experiment.status]
  const Icon = config.icon

  const platformLabels = {
    meta: 'Meta',
    google: 'Google',
    tiktok: 'TikTok',
  }

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(experiment)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{experiment.name}</h3>
              <span
                className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.color)}
              >
                {Icon === Loader2 ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running
                  </span>
                ) : (
                  experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1)
                )}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <span>{platformLabels[experiment.platform]}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {experiment.testRegions.length} test / {experiment.controlRegions.length} control
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(experiment.id)
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <span>
            {new Date(experiment.startDate).toLocaleDateString()} -{' '}
            {new Date(experiment.endDate).toLocaleDateString()}
          </span>
        </div>

        {experiment.results && experiment.status === 'completed' && (
          <div className="mt-4 grid grid-cols-3 gap-4 rounded bg-muted/50 p-3">
            <div>
              <div className="text-xs text-muted-foreground">Incremental Lift</div>
              <div
                className={cn(
                  'font-semibold',
                  experiment.results.incrementalLiftPercent > 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                )}
              >
                {experiment.results.incrementalLiftPercent > 0 ? '+' : ''}
                {experiment.results.incrementalLiftPercent.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Incremental Revenue</div>
              <div className="font-semibold">
                ${experiment.results.incrementalRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Significance</div>
              <div
                className={cn(
                  'font-semibold',
                  experiment.results.isSignificant ? 'text-emerald-600' : 'text-orange-600'
                )}
              >
                {experiment.results.isSignificant ? 'Significant' : 'Not Significant'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Experiment Detail Panel
// ============================================================

interface ExperimentDetailPanelProps {
  experiment: IncrementalityExperiment
  onClose: () => void
  onUpdateStatus: (id: string, status: IncrementalityExperiment['status']) => void
}

function ExperimentDetailPanel({
  experiment,
  onClose,
  onUpdateStatus,
}: ExperimentDetailPanelProps) {
  const platformLabels = {
    meta: 'Meta (Facebook/Instagram)',
    google: 'Google Ads',
    tiktok: 'TikTok',
  }

  const progress =
    experiment.status === 'running'
      ? Math.min(
          100,
          Math.max(
            0,
            ((Date.now() - new Date(experiment.startDate).getTime()) /
              (new Date(experiment.endDate).getTime() - new Date(experiment.startDate).getTime())) *
              100
          )
        )
      : experiment.status === 'completed'
        ? 100
        : 0

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-background shadow-xl sm:w-[600px]">
      <div className="sticky top-0 flex items-center justify-between border-b bg-background p-4">
        <div>
          <h2 className="text-lg font-semibold">{experiment.name}</h2>
          <p className="text-sm text-muted-foreground">{platformLabels[experiment.platform]}</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6 p-4">
        {experiment.status === 'draft' && (
          <div className="flex gap-2">
            <Button
              onClick={() => onUpdateStatus(experiment.id, 'running')}
              className="flex-1"
            >
              Start Experiment
            </Button>
            <Button
              variant="outline"
              onClick={() => onUpdateStatus(experiment.id, 'cancelled')}
            >
              Cancel
            </Button>
          </div>
        )}

        {experiment.status === 'running' && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold">Experiment Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Test Period</div>
                <div className="font-medium">
                  {new Date(experiment.startDate).toLocaleDateString()} -{' '}
                  {new Date(experiment.endDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pre-Test Days</div>
                <div className="font-medium">{experiment.preTestDays} days</div>
              </div>
              {experiment.budgetEstimate && (
                <div>
                  <div className="text-sm text-muted-foreground">Budget Impact</div>
                  <div className="font-medium">
                    ${experiment.budgetEstimate.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold">Regions</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-sm text-muted-foreground">
                  Test Regions ({experiment.testRegions.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {experiment.testRegions.map((region) => (
                    <span
                      key={region}
                      className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm text-muted-foreground">
                  Control Regions ({experiment.controlRegions.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {experiment.controlRegions.map((region) => (
                    <span
                      key={region}
                      className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {experiment.results && (
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 font-semibold">Results</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded bg-muted/50 p-3">
                  <div className="text-sm text-muted-foreground">Incremental Lift</div>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      experiment.results.incrementalLiftPercent > 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    )}
                  >
                    {experiment.results.incrementalLiftPercent > 0 ? '+' : ''}
                    {experiment.results.incrementalLiftPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded bg-muted/50 p-3">
                  <div className="text-sm text-muted-foreground">Incremental Revenue</div>
                  <div className="text-2xl font-bold">
                    ${experiment.results.incrementalRevenue.toLocaleString()}
                  </div>
                </div>
                <div className="rounded bg-muted/50 p-3">
                  <div className="text-sm text-muted-foreground">P-Value</div>
                  <div className="text-2xl font-bold">{experiment.results.pValue.toFixed(4)}</div>
                </div>
                <div className="rounded bg-muted/50 p-3">
                  <div className="text-sm text-muted-foreground">Statistical Significance</div>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      experiment.results.isSignificant ? 'text-emerald-600' : 'text-orange-600'
                    )}
                  >
                    {experiment.results.isSignificant ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded bg-muted/50 p-3">
                <div className="text-sm text-muted-foreground">Confidence Interval (95%)</div>
                <div className="font-medium">
                  {experiment.results.confidenceInterval.lower.toFixed(1)}% to{' '}
                  {experiment.results.confidenceInterval.upper.toFixed(1)}%
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-muted-foreground">Recommendation</div>
                <p className="mt-1">{experiment.results.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Incrementality Page
// ============================================================

export default function IncrementalityPage() {
  const [experiments, setExperiments] = useState<IncrementalityExperiment[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<IncrementalityExperiment | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const fetchExperiments = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/attribution/incrementality')
      const data = await response.json()
      setExperiments(data.experiments ?? [])
    } catch (error) {
      console.error('Failed to fetch experiments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchExperimentDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/attribution/incrementality/${id}`)
      const data = await response.json()
      setSelectedExperiment(data.experiment ?? null)
    } catch (error) {
      console.error('Failed to fetch experiment detail:', error)
    }
  }, [])

  useEffect(() => {
    fetchExperiments()
  }, [fetchExperiments])

  const handleCreateExperiment = async (data: CreateExperimentRequest) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/attribution/incrementality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        setIsCreateModalOpen(false)
        fetchExperiments()
      }
    } catch (error) {
      console.error('Failed to create experiment:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteExperiment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return
    try {
      await fetch(`/api/admin/attribution/incrementality/${id}`, {
        method: 'DELETE',
      })
      fetchExperiments()
    } catch (error) {
      console.error('Failed to delete experiment:', error)
    }
  }

  const handleUpdateStatus = async (
    id: string,
    status: IncrementalityExperiment['status']
  ) => {
    try {
      const response = await fetch(`/api/admin/attribution/incrementality/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (response.ok) {
        fetchExperiments()
        fetchExperimentDetail(id)
      }
    } catch (error) {
      console.error('Failed to update experiment status:', error)
    }
  }

  const handleSelectExperiment = (experiment: IncrementalityExperiment) => {
    fetchExperimentDetail(experiment.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Incrementality Testing</h2>
          <p className="text-sm text-muted-foreground">
            Measure true incremental impact with geo-holdout experiments
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Experiment
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-4 h-3 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : experiments.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">No Experiments Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first geo-holdout experiment to measure incremental lift.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Experiment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {experiments.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              onSelect={handleSelectExperiment}
              onDelete={handleDeleteExperiment}
            />
          ))}
        </div>
      )}

      <CreateExperimentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateExperiment}
        isCreating={isCreating}
      />

      {selectedExperiment && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSelectedExperiment(null)}
          />
          <ExperimentDetailPanel
            experiment={selectedExperiment}
            onClose={() => setSelectedExperiment(null)}
            onUpdateStatus={handleUpdateStatus}
          />
        </>
      )}
    </div>
  )
}
