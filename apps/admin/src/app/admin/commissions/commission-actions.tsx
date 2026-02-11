'use client'

import { useState } from 'react'
import { Button } from '@cgk/ui'

import type { Commission } from '@/lib/creators-admin-ops'

export function CommissionActions({ commissions }: { commissions: Commission[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const pendingCommissions = commissions.filter((c) => c.status === 'pending')
  const pendingIds = pendingCommissions.map((c) => c.id)
  const selectedPending = pendingIds.filter((id) => selectedIds.has(id))

  const handleSelectAll = () => {
    if (selectedPending.length === pendingIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingIds))
    }
  }

  const handleApprove = async () => {
    if (selectedPending.length === 0) return
    setLoading(true)

    try {
      const res = await fetch('/api/admin/commissions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionIds: selectedPending }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to approve commissions')
      }
    } catch {
      alert('Failed to approve commissions')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (selectedPending.length === 0) return

    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    setLoading(true)

    try {
      const res = await fetch('/api/admin/commissions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionIds: selectedPending, reason }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reject commissions')
      }
    } catch {
      alert('Failed to reject commissions')
    } finally {
      setLoading(false)
    }
  }

  if (pendingCommissions.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={selectedPending.length === pendingIds.length && pendingIds.length > 0}
          onChange={handleSelectAll}
          className="rounded border-input"
        />
        Select all pending ({pendingCommissions.length})
      </label>

      {selectedPending.length > 0 && (
        <>
          <span className="text-sm text-muted-foreground">
            {selectedPending.length} selected
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={loading}
            >
              Reject
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={loading}>
              {loading ? 'Processing...' : 'Approve Selected'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
