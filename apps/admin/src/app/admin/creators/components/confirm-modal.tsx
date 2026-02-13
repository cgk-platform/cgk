'use client'

import { Button } from '@cgk-platform/ui'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { useState, useCallback } from 'react'

interface ConfirmModalProps {
  title: string
  description: string
  confirmText: string
  confirmVariant: 'warning' | 'destructive'
  creatorId: string
  action: 'deactivate' | 'delete'
  onClose: () => void
  onSuccess: () => void
}

export function ConfirmModal({
  title,
  description,
  confirmText,
  confirmVariant,
  creatorId,
  action,
  onClose,
  onSuccess,
}: ConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = useCallback(async () => {
    setIsProcessing(true)
    setError(null)

    try {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/creators/${creatorId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to delete')
        }
      } else {
        // Deactivate - update status to inactive
        const res = await fetch(`/api/admin/creators/${creatorId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'inactive' }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to deactivate')
        }
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }, [action, creatorId, onSuccess])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div
            className={`flex items-start gap-3 rounded-md px-4 py-3 text-sm ${
              confirmVariant === 'destructive'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
            }`}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{description}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            variant={confirmVariant === 'destructive' ? 'destructive' : 'default'}
            className={
              confirmVariant === 'warning'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : undefined
            }
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
