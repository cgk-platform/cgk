'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, Clock, Filter, X } from 'lucide-react'

import { cn } from '@cgk-platform/ui'

interface WorkflowExecution {
  id: string
  ruleId: string
  ruleName: string
  entityType: string
  entityId: string
  result: string
  conditionsPassed: boolean
  startedAt: string
  completedAt: string | null
}

export default function ExecutionLogsPage() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [resultFilter, setResultFilter] = useState<string>('')

  const limit = 20

  const fetchExecutions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', limit.toString())
      params.set('offset', offset.toString())
      if (resultFilter) {
        params.set('result', resultFilter)
      }

      const res = await fetch(`/api/admin/workflows/executions?${params}`)
      const data = await res.json()
      setExecutions(data.executions || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch executions:', error)
    } finally {
      setLoading(false)
    }
  }, [offset, resultFilter])

  useEffect(() => {
    fetchExecutions()
  }, [fetchExecutions])

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <Check className="h-4 w-4 text-emerald-500" />
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'failed':
        return <X className="h-4 w-4 text-destructive" />
      case 'skipped':
        return <X className="h-4 w-4 text-muted-foreground" />
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  const getResultBadge = (result: string) => {
    const colors: Record<string, string> = {
      success: 'bg-emerald-500/10 text-emerald-600',
      partial: 'bg-amber-500/10 text-amber-600',
      failed: 'bg-destructive/10 text-destructive',
      skipped: 'bg-muted text-muted-foreground',
      pending_approval: 'bg-amber-500/10 text-amber-600',
    }

    return (
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          colors[result] || 'bg-muted text-muted-foreground'
        )}
      >
        {result.replace('_', ' ')}
      </span>
    )
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Execution Logs</h1>
        <p className="text-sm text-muted-foreground">
          Complete audit trail of all workflow executions
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Result:</span>
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {['', 'success', 'partial', 'failed', 'skipped'].map((result) => (
            <button
              key={result}
              onClick={() => {
                setResultFilter(result)
                setOffset(0)
              }}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                resultFilter === result
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {result || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted/20" />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="rounded-full bg-muted/50 p-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">No executions found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Workflow executions will appear here
          </p>
        </div>
      ) : (
        <>
          {/* Executions Table */}
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Rule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Result
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {executions.map((execution) => (
                  <tr key={execution.id} className="bg-card hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/workflows/${execution.ruleId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {execution.ruleName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">
                        {execution.entityType}/{execution.entityId.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getResultIcon(execution.result)}
                        {getResultBadge(execution.result)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(execution.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className={cn(
                    'rounded-md border px-3 py-1 text-sm',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hover:bg-muted'
                  )}
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className={cn(
                    'rounded-md border px-3 py-1 text-sm',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hover:bg-muted'
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
