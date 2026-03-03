'use client'

/**
 * System Sync Client Component
 * Interactive sync operations with preview/execute pattern
 */

import { Button, cn } from '@cgk-platform/ui'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Play,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState, useTransition } from 'react'

import type { SyncOperationType, SyncOperationStatus } from '@/lib/admin-utilities/types'

interface SyncOperation {
  type: SyncOperationType
  title: string
  description: string
  icon: React.ReactNode
}

interface OperationState {
  status: SyncOperationStatus
  preview?: {
    itemsToProcess: number
    details: Record<string, unknown>
  }
  result?: {
    processed: number
    errors: number
    details: Record<string, unknown>
  }
  error?: string
}

const SYNC_OPERATIONS: SyncOperation[] = [
  {
    type: 'commission_balance_sync',
    title: 'Commission Balance Sync',
    description: 'Syncs commissions from orders to balance transactions',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    type: 'project_payment_sync',
    title: 'Project Payment Sync',
    description: 'Syncs paid project payments to balance transactions',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    type: 'conversation_merge',
    title: 'Conversation Merge',
    description: 'Merges duplicate conversations (same email/phone)',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    type: 'mature_commissions',
    title: 'Mature Commissions',
    description: 'Moves pending commissions past 30-day hold to available',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function SyncClient() {
  const [operationStates, setOperationStates] = useState<
    Record<SyncOperationType, OperationState>
  >({
    commission_balance_sync: { status: 'pending' },
    project_payment_sync: { status: 'pending' },
    conversation_merge: { status: 'pending' },
    mature_commissions: { status: 'pending' },
  })
  const [expandedOp, setExpandedOp] = useState<SyncOperationType | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchPreviews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/system/sync')
      if (res.ok) {
        const { previews } = await res.json()
        setOperationStates((prev) => {
          const newStates = { ...prev }
          for (const preview of previews) {
            newStates[preview.operationType as SyncOperationType] = {
              status: 'pending',
              preview: {
                itemsToProcess: preview.itemsToProcess,
                details: preview.details,
              },
            }
          }
          return newStates
        })
      }
    } catch {
      // Failed to fetch previews - ignore
    }
  }, [])

  // Fetch previews on mount
  useEffect(() => {
    fetchPreviews()
  }, [fetchPreviews])

  const runOperation = useCallback(async (operationType: SyncOperationType) => {
    setOperationStates((prev) => ({
      ...prev,
      [operationType]: { ...prev[operationType], status: 'running' },
    }))

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/system/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: operationType }),
        })

        if (res.ok) {
          const { results } = await res.json()
          const result = results[0]

          setOperationStates((prev) => ({
            ...prev,
            [operationType]: {
              ...prev[operationType],
              status: result.status === 'success' ? 'success' : 'error',
              result: result.status === 'success'
                ? { processed: result.processed, errors: result.errors, details: result.details }
                : undefined,
              error: result.error,
            },
          }))
        }
      } catch {
        setOperationStates((prev) => ({
          ...prev,
          [operationType]: {
            ...prev[operationType],
            status: 'error',
            error: 'Network error',
          },
        }))
      }
    })
  }, [])

  const runAllOperations = useCallback(async () => {
    // Set all to running
    setOperationStates((prev) => {
      const newStates = { ...prev }
      for (const op of SYNC_OPERATIONS) {
        newStates[op.type] = { ...newStates[op.type], status: 'running' }
      }
      return newStates
    })

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/system/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runAll: true }),
        })

        if (res.ok) {
          const { results } = await res.json()

          setOperationStates((prev) => {
            const newStates = { ...prev }
            for (const result of results) {
              newStates[result.operation as SyncOperationType] = {
                ...newStates[result.operation as SyncOperationType],
                status: result.status === 'success' ? 'success' : 'error',
                result: result.status === 'success'
                  ? { processed: result.processed, errors: result.errors, details: result.details }
                  : undefined,
                error: result.error,
              }
            }
            return newStates
          })
        }
      } catch (error) {
        console.error('Failed to run all operations:', error)
      }
    })
  }, [])

  const copyResults = useCallback((operationType: SyncOperationType) => {
    const state = operationStates[operationType]
    const data = {
      operation: operationType,
      preview: state.preview,
      result: state.result,
      error: state.error,
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  }, [operationStates])

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Run All Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">
              Preview and execute data synchronization operations
            </p>
          </div>
          <Button
            onClick={runAllOperations}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Run All Syncs
          </Button>
        </div>

        {/* Operations List */}
        <div className="space-y-4">
          {SYNC_OPERATIONS.map((operation) => {
            const state = operationStates[operation.type]
            const isExpanded = expandedOp === operation.type

            return (
              <div
                key={operation.type}
                className={cn(
                  'overflow-hidden rounded-xl border transition-colors',
                  state.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : state.status === 'error'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : state.status === 'running'
                        ? 'border-violet-500/30 bg-violet-500/5'
                        : 'border-zinc-800 bg-zinc-900'
                )}
              >
                {/* Operation Header */}
                <div className="flex items-center gap-4 p-4">
                  <div
                    className={cn(
                      'rounded-lg p-2.5',
                      state.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : state.status === 'error'
                          ? 'bg-rose-500/20 text-rose-400'
                          : state.status === 'running'
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-zinc-800 text-zinc-400'
                    )}
                  >
                    {operation.icon}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-white">{operation.title}</h3>
                    <p className="text-sm text-zinc-400">{operation.description}</p>
                  </div>

                  {/* Preview Count */}
                  {state.preview && state.preview.itemsToProcess > 0 && (
                    <div className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
                      {state.preview.itemsToProcess} to process
                    </div>
                  )}

                  {/* Status Badge */}
                  <StatusBadge status={state.status} />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runOperation(operation.type)}
                      disabled={isPending || state.status === 'running'}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      {state.status === 'running' ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 h-3 w-3" />
                      )}
                      Run
                    </Button>
                    <button
                      onClick={() => setExpandedOp(isExpanded ? null : operation.type)}
                      className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Preview Data */}
                      <div className="flex-1">
                        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Preview
                        </h4>
                        <pre className="rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-400">
                          {JSON.stringify(state.preview || {}, null, 2)}
                        </pre>
                      </div>

                      {/* Result Data */}
                      {(state.result || state.error) && (
                        <div className="flex-1">
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Result
                          </h4>
                          <pre
                            className={cn(
                              'rounded-lg p-3 font-mono text-xs',
                              state.error
                                ? 'bg-rose-950/50 text-rose-300'
                                : 'bg-emerald-950/50 text-emerald-300'
                            )}
                          >
                            {state.error
                              ? state.error
                              : JSON.stringify(state.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Copy Button */}
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyResults(operation.type)}
                        className="text-zinc-400 hover:text-zinc-200"
                      >
                        <Copy className="mr-1.5 h-3 w-3" />
                        Copy Results
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            onClick={fetchPreviews}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Previews
          </Button>
        </div>
      </div>
    </main>
  )
}

function StatusBadge({ status }: { status: SyncOperationStatus }) {
  const config: Record<
    SyncOperationStatus,
    { icon: React.ReactNode; className: string; label: string }
  > = {
    pending: {
      icon: <Clock className="mr-1 h-3 w-3" />,
      className: 'bg-zinc-800 text-zinc-400',
      label: 'Ready',
    },
    running: {
      icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
      className: 'bg-violet-500/20 text-violet-300',
      label: 'Running',
    },
    success: {
      icon: <Check className="mr-1 h-3 w-3" />,
      className: 'bg-emerald-500/20 text-emerald-300',
      label: 'Complete',
    },
    error: {
      icon: <AlertCircle className="mr-1 h-3 w-3" />,
      className: 'bg-rose-500/20 text-rose-300',
      label: 'Error',
    },
  }

  const { icon, className, label } = config[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      {icon}
      {label}
    </span>
  )
}
