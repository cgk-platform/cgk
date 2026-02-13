'use client'

import type { FlagAuditEntry } from '@cgk-platform/feature-flags'
import { Badge, Card, CardContent, Select, SelectOption, Spinner } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

interface AuditResponse {
  entries: FlagAuditEntry[]
  total: number
}

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  created: { label: 'Created', variant: 'default' },
  updated: { label: 'Updated', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'secondary' },
  restored: { label: 'Restored', variant: 'default' },
  deleted: { label: 'Deleted', variant: 'destructive' },
  override_added: { label: 'Override Added', variant: 'secondary' },
  override_removed: { label: 'Override Removed', variant: 'secondary' },
  kill_switch: { label: 'Kill Switch', variant: 'destructive' },
}

export default function FlagsAuditPage() {
  const [entries, setEntries] = useState<FlagAuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const fetchAudit = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String((page - 1) * limit))
      if (actionFilter) params.set('action', actionFilter)

      const response = await fetch(`/api/platform/flags/audit?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit log')
      }

      const data = (await response.json()) as AuditResponse
      setEntries(data.entries)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [actionFilter, page])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flag Audit Log</h1>
        <p className="text-muted-foreground">
          Complete history of all feature flag changes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value)
            setPage(1)
          }}
          className="w-48"
        >
          <SelectOption value="">All Actions</SelectOption>
          <SelectOption value="created">Created</SelectOption>
          <SelectOption value="updated">Updated</SelectOption>
          <SelectOption value="archived">Archived</SelectOption>
          <SelectOption value="deleted">Deleted</SelectOption>
          <SelectOption value="override_added">Override Added</SelectOption>
          <SelectOption value="override_removed">Override Removed</SelectOption>
          <SelectOption value="kill_switch">Kill Switch</SelectOption>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No audit entries found
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((entry) => {
              const actionInfo = ACTION_LABELS[entry.action] || {
                label: entry.action,
                variant: 'secondary' as const,
              }

              return (
                <Card key={entry.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                          <span className="font-mono text-sm">{entry.flagKey}</span>
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground">{entry.reason}</p>
                        )}
                        {entry.userEmail && (
                          <p className="text-sm text-muted-foreground">By: {entry.userEmail}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded border disabled:opacity-50"
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
