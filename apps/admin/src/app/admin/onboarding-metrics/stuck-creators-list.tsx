'use client'

import { useState } from 'react'
import { Button } from '@cgk-platform/ui'

import type { StuckCreator } from '@/lib/creators-admin-ops'

export function StuckCreatorsList({ creators }: { creators: StuckCreator[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const handleSendReminder = async (creator: StuckCreator) => {
    setLoadingId(creator.id)
    try {
      const res = await fetch(`/api/admin/creators/onboarding/${creator.creator_id}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: creator.step_id }),
      })

      if (res.ok) {
        alert(`Reminder sent to ${creator.creator_name}`)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send reminder')
      }
    } catch {
      alert('Failed to send reminder')
    } finally {
      setLoadingId(null)
    }
  }

  const handleBulkReminder = async () => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)

    try {
      const selectedCreators = creators.filter((c) => selectedIds.has(c.id))
      const creatorIds = selectedCreators.map((c) => c.creator_id)

      const res = await fetch('/api/admin/creators/onboarding/bulk-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorIds }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Sent ${data.sent} reminders`)
        setSelectedIds(new Set())
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send reminders')
      }
    } catch {
      alert('Failed to send reminders')
    } finally {
      setBulkLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === creators.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(creators.map((c) => c.id)))
    }
  }

  return (
    <div className="space-y-3">
      {creators.length > 1 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedIds.size === creators.length}
              onChange={toggleSelectAll}
              className="rounded"
            />
            Select all ({creators.length})
          </label>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleBulkReminder}
              disabled={bulkLoading}
            >
              {bulkLoading ? 'Sending...' : `Send ${selectedIds.size} Reminders`}
            </Button>
          )}
        </div>
      )}

      <div className="divide-y">
        {creators.map((creator) => (
          <div key={creator.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {creators.length > 1 && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(creator.id)}
                  onChange={() => toggleSelect(creator.id)}
                  className="rounded"
                />
              )}
              <div>
                <p className="font-medium">{creator.creator_name}</p>
                <p className="text-sm text-muted-foreground">
                  Stuck on: <span className="font-medium">{creator.step_name}</span>
                  {' - '}
                  <span className="text-amber-600">{creator.days_stuck} days</span>
                  {creator.reminder_count > 0 && (
                    <span className="ml-2">
                      ({creator.reminder_count} reminder{creator.reminder_count > 1 ? 's' : ''} sent)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendReminder(creator)}
                disabled={loadingId === creator.id}
              >
                {loadingId === creator.id ? 'Sending...' : 'Send Reminder'}
              </Button>
              <a href={`/admin/creators/${creator.creator_id}`}>
                <Button size="sm" variant="ghost">
                  View
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
