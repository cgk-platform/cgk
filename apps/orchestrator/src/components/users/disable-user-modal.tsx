'use client'

import { Button, Card, CardContent, CardHeader, Textarea } from '@cgk-platform/ui'
import { useState } from 'react'

interface DisableUserModalProps {
  userId: string
  userName: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

/**
 * Modal for confirming user account disable
 */
export function DisableUserModal({
  userId,
  userName,
  isOpen,
  onClose,
  onSuccess,
}: DisableUserModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/platform/users/${userId}/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disable user')
      }

      setReason('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setReason('')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md mx-4">
        <CardHeader className="border-b">
          <h2 className="text-lg font-semibold text-red-600">Disable User Account</h2>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <p className="mb-4 text-sm text-muted-foreground">
              You are about to disable the account for{' '}
              <strong className="text-foreground">
                {userName || 'this user'}
              </strong>
              . This will:
            </p>

            <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Immediately revoke all active sessions</li>
              <li>Prevent the user from logging in</li>
              <li>Block access to all tenant data</li>
            </ul>

            <div className="mb-4">
              <label
                htmlFor="disable-reason"
                className="mb-2 block text-sm font-medium"
              >
                Reason for disabling <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="disable-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for disabling this account..."
                rows={3}
                required
                minLength={10}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum 10 characters. This will be logged in the audit trail.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={loading || reason.trim().length < 10}
              >
                {loading ? 'Disabling...' : 'Disable Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
