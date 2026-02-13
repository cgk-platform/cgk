'use client'

import { Button } from '@cgk-platform/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ReviewActionsProps {
  reviewId: string
  currentStatus: string
}

export function ReviewActions({ reviewId, currentStatus }: ReviewActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(action: 'approve' | 'reject' | 'spam') {
    setLoading(action)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  if (currentStatus === 'approved') {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading === 'reject'}
        onClick={() => handleAction('reject')}
      >
        {loading === 'reject' ? 'Rejecting...' : 'Reject'}
      </Button>
    )
  }

  if (currentStatus === 'rejected' || currentStatus === 'spam') {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading === 'approve'}
        onClick={() => handleAction('approve')}
      >
        {loading === 'approve' ? 'Approving...' : 'Approve'}
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        size="sm"
        disabled={loading !== null}
        onClick={() => handleAction('approve')}
      >
        {loading === 'approve' ? 'Approving...' : 'Approve'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null}
        onClick={() => handleAction('reject')}
      >
        {loading === 'reject' ? 'Rejecting...' : 'Reject'}
      </Button>
    </div>
  )
}
