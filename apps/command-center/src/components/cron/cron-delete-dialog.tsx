'use client'

import { Button } from '@cgk-platform/ui'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

interface CronDeleteDialogProps {
  jobName: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function CronDeleteDialog({ jobName, onConfirm, onCancel }: CronDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-sm font-semibold">Delete Cron Job</h3>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{jobName}</strong>?
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          This requires a gateway restart to take effect.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}
