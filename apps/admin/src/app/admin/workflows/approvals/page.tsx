'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clock, X } from 'lucide-react'

import { Button } from '@cgk/ui'
import { cn } from '@cgk/ui'

interface PendingApproval {
  id: string
  ruleId: string
  ruleName: string
  entityType: string
  entityId: string
  triggerData: Record<string, unknown>
  startedAt: string
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workflows/approvals')
      const data = await res.json()
      setApprovals(data.approvals || [])
    } catch (error) {
      console.error('Failed to fetch approvals:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  const handleApprove = async (id: string) => {
    setActioningId(id)
    try {
      await fetch(`/api/admin/workflows/approvals/${id}/approve`, {
        method: 'POST',
      })
      fetchApprovals()
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    setActioningId(id)
    try {
      await fetch(`/api/admin/workflows/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      fetchApprovals()
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve workflow executions that require human intervention
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/20" />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="rounded-full bg-emerald-500/10 p-4">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="mt-4 font-medium">All caught up!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No pending approvals at this time
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="rounded-lg border bg-card p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <h3 className="font-medium">{approval.ruleName}</h3>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span className="font-mono">{approval.entityType}</span>:{' '}
                    <span className="font-mono">{approval.entityId.substring(0, 8)}...</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Triggered {new Date(approval.startedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(approval.id)}
                    disabled={actioningId === approval.id}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(approval.id)}
                    disabled={actioningId === approval.id}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
