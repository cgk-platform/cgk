'use client'

import { useState } from 'react'
import { Button, Input, Label } from '@cgk/ui'

import type { SampleRequest } from '@/lib/creators-admin-ops'
import { SAMPLE_CARRIERS } from '@/lib/creators-admin-ops'

export function SampleActions({ samples }: { samples: SampleRequest[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showShipModal, setShowShipModal] = useState(false)

  const pendingSamples = samples.filter(
    (s) => s.status === 'requested' || s.status === 'approved' || s.status === 'pending'
  )
  const shippedSamples = samples.filter(
    (s) => s.status === 'shipped' || s.status === 'in_transit'
  )
  const pendingIds = pendingSamples.map((s) => s.id)
  const shippedIds = shippedSamples.map((s) => s.id)
  const selectedPending = pendingIds.filter((id) => selectedIds.has(id))
  const selectedShipped = shippedIds.filter((id) => selectedIds.has(id))

  const handleSelectAllPending = () => {
    if (selectedPending.length === pendingIds.length) {
      const next = new Set(selectedIds)
      pendingIds.forEach((id) => next.delete(id))
      setSelectedIds(next)
    } else {
      setSelectedIds(new Set([...selectedIds, ...pendingIds]))
    }
  }

  const handleMarkDelivered = async () => {
    if (selectedShipped.length === 0) return
    setLoading(true)

    try {
      const res = await fetch('/api/admin/samples/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds: selectedShipped, status: 'delivered' }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update samples')
      }
    } catch {
      alert('Failed to update samples')
    } finally {
      setLoading(false)
    }
  }

  if (pendingSamples.length === 0 && shippedSamples.length === 0) {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-3">
        {pendingSamples.length > 0 && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={
                  selectedPending.length === pendingIds.length && pendingIds.length > 0
                }
                onChange={handleSelectAllPending}
                className="rounded border-input"
              />
              Pending ({pendingSamples.length})
            </label>

            {selectedPending.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedPending.length} selected
                </span>
                <Button
                  size="sm"
                  onClick={() => setShowShipModal(true)}
                  disabled={loading}
                >
                  Mark Shipped
                </Button>
              </>
            )}
          </>
        )}

        {shippedSamples.length > 0 && selectedShipped.length > 0 && (
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkDelivered}
              disabled={loading}
            >
              Mark Delivered ({selectedShipped.length})
            </Button>
          </div>
        )}
      </div>

      {showShipModal && (
        <ShipModal
          sampleIds={selectedPending}
          onClose={() => setShowShipModal(false)}
        />
      )}
    </>
  )
}

function ShipModal({
  sampleIds,
  onClose,
}: {
  sampleIds: string[]
  onClose: () => void
}) {
  const [carrier, setCarrier] = useState('USPS')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/samples/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestIds: sampleIds,
          status: 'shipped',
          trackingInfo: trackingNumber
            ? {
                carrier,
                number: trackingNumber,
              }
            : undefined,
        }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update samples')
      }
    } catch {
      alert('Failed to update samples')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Mark as Shipped</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Marking {sampleIds.length} sample{sampleIds.length > 1 ? 's' : ''} as shipped
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="carrier">Carrier</Label>
            <select
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            >
              {SAMPLE_CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="tracking">Tracking Number (optional)</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Mark Shipped'}
          </Button>
        </div>
      </div>
    </div>
  )
}
