'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  GitBranch,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Zap,
} from 'lucide-react'

import { Button } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'

interface WorkflowRule {
  id: string
  name: string
  description: string | null
  isActive: boolean
  priority: number
  triggerType: string
  entityTypes: string[]
  createdAt: string
  updatedAt: string
}

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  status_change: GitBranch,
  time_elapsed: Clock,
  scheduled: Clock,
  event: Zap,
  manual: Play,
}

const TRIGGER_LABELS: Record<string, string> = {
  status_change: 'Status Change',
  time_elapsed: 'Time Elapsed',
  scheduled: 'Scheduled',
  event: 'Event',
  manual: 'Manual',
}

export function WorkflowRuleList() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const fetchRules = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter === 'active') params.set('isActive', 'true')
      if (filter === 'inactive') params.set('isActive', 'false')

      const res = await fetch(`/api/admin/workflows/rules?${params}`)
      const data = await res.json()
      setRules(data.rules || [])
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const toggleActive = async (ruleId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/workflows/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      fetchRules()
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  const filteredRules = rules

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Workflow Rules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automate actions based on triggers, conditions, and events
          </p>
        </div>
        <Link href="/admin/workflows/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              filter === f
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && ` (${rules.length})`}
          </button>
        ))}
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-muted/20"
            />
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="rounded-full bg-muted/50 p-4">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">No workflow rules</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first rule to automate tasks
          </p>
          <Link href="/admin/workflows/new" className="mt-4">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => {
            const TriggerIcon = TRIGGER_ICONS[rule.triggerType] || Zap

            return (
              <div
                key={rule.id}
                className={cn(
                  'group relative rounded-lg border bg-card transition-all',
                  'hover:border-primary/50 hover:shadow-md',
                  !rule.isActive && 'opacity-60'
                )}
              >
                <Link href={`/admin/workflows/${rule.id}`} className="block p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Trigger Icon */}
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          rule.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <TriggerIcon className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">
                            {rule.name}
                          </h3>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              rule.isActive
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {rule.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {rule.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="font-mono">
                              {TRIGGER_LABELS[rule.triggerType] || rule.triggerType}
                            </span>
                          </span>
                          {rule.entityTypes.length > 0 && (
                            <>
                              <span className="text-muted-foreground/50">|</span>
                              <span className="font-mono">
                                {rule.entityTypes.join(', ')}
                              </span>
                            </>
                          )}
                          <span className="text-muted-foreground/50">|</span>
                          <span>Priority {rule.priority}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          toggleActive(rule.id, rule.isActive)
                        }}
                        className={cn(
                          'rounded-md p-2 transition-colors',
                          'hover:bg-muted'
                        )}
                        title={rule.isActive ? 'Pause rule' : 'Activate rule'}
                      >
                        {rule.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="rounded-md p-2 hover:bg-muted"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
