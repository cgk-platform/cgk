'use client'

import { Button, Input, Label } from '@cgk-platform/ui'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'

import { CREATOR_STATUSES, CREATOR_TIERS, type CreatorStatus, type CreatorTier } from '@/lib/creators/types'

interface BulkActionModalProps {
  action: string
  creatorIds: string[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkActionModal({ action, creatorIds, onClose, onSuccess }: BulkActionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ affected: number; failed: number } | null>(null)

  // Action-specific state
  const [status, setStatus] = useState<CreatorStatus>('active')
  const [tier, setTier] = useState<CreatorTier>('bronze')
  const [addTags, setAddTags] = useState<string[]>([])
  const [removeTags, setRemoveTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Load available tags
  useEffect(() => {
    fetch('/api/admin/creators?view=tags')
      .then((res) => res.json())
      .then((data) => setAvailableTags(data.tags || []))
      .catch(() => {})
  }, [])

  const getTitle = () => {
    switch (action) {
      case 'status':
        return 'Change Status'
      case 'tier':
        return 'Update Tier'
      case 'tags':
        return 'Manage Tags'
      case 'export':
        return 'Export Selected'
      case 'deactivate':
        return 'Deactivate Creators'
      case 'delete':
        return 'Delete Creators'
      default:
        return 'Bulk Action'
    }
  }

  const handleSubmit = useCallback(async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // For export, redirect to export modal
      if (action === 'export') {
        onClose()
        window.location.href = `/admin/creators?modal=export&ids=${creatorIds.join(',')}`
        return
      }

      const payload: Record<string, unknown> = {}

      switch (action) {
        case 'status':
          payload.status = status
          break
        case 'tier':
          payload.tier = tier
          break
        case 'tags':
          payload.tags = { add: addTags, remove: removeTags }
          break
        case 'deactivate':
          // Uses bulk action with status = inactive
          break
        case 'delete':
          // Uses bulk action delete
          break
      }

      const res = await fetch('/api/admin/creators/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: action,
          creatorIds,
          payload: Object.keys(payload).length > 0 ? payload : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Bulk action failed')
      }

      setResult({ affected: data.affected, failed: data.failed })

      // Auto-close after success
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }, [action, creatorIds, status, tier, addTags, removeTags, onClose, onSuccess])

  const addTag = useCallback(
    (tag: string, type: 'add' | 'remove') => {
      const trimmed = tag.trim().toLowerCase()
      if (!trimmed) return

      if (type === 'add') {
        if (!addTags.includes(trimmed)) {
          setAddTags((prev) => [...prev, trimmed])
        }
      } else {
        if (!removeTags.includes(trimmed)) {
          setRemoveTags((prev) => [...prev, trimmed])
        }
      }
      setTagInput('')
    },
    [addTags, removeTags],
  )

  const removeTagFromList = useCallback((tag: string, type: 'add' | 'remove') => {
    if (type === 'add') {
      setAddTags((prev) => prev.filter((t) => t !== tag))
    } else {
      setRemoveTags((prev) => prev.filter((t) => t !== tag))
    }
  }, [])

  const isDestructive = action === 'delete' || action === 'deactivate'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
      <div className="relative w-full max-w-md rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{getTitle()}</h2>
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

          {result && (
            <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
              Successfully updated {result.affected} creator{result.affected !== 1 ? 's' : ''}
              {result.failed > 0 && `, ${result.failed} failed`}
            </div>
          )}

          <div className="rounded-md bg-muted px-4 py-3 text-sm">
            This action will affect{' '}
            <strong>
              {creatorIds.length} creator{creatorIds.length !== 1 ? 's' : ''}
            </strong>
          </div>

          {isDestructive && (
            <div className="flex items-start gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                {action === 'delete'
                  ? 'Deleted creators will be permanently removed. This cannot be undone.'
                  : 'Deactivated creators will lose access to the creator portal.'}
              </div>
            </div>
          )}

          {action === 'status' && (
            <div className="space-y-2">
              <Label>New Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CreatorStatus)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CREATOR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === 'tier' && (
            <div className="space-y-2">
              <Label>New Tier</Label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as CreatorTier)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CREATOR_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === 'tags' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Add Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Enter tag name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(tagInput, 'add')
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => addTag(tagInput, 'add')}>
                    Add
                  </Button>
                </div>
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {availableTags.slice(0, 8).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag, 'add')}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-muted/80"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                )}
                {addTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {addTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-200"
                      >
                        + {tag}
                        <button
                          type="button"
                          onClick={() => removeTagFromList(tag, 'add')}
                          className="hover:text-green-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Remove Tags</Label>
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag, 'remove')}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-destructive/10 hover:text-destructive"
                      >
                        - {tag}
                      </button>
                    ))}
                  </div>
                )}
                {removeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {removeTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200"
                      >
                        - {tag}
                        <button
                          type="button"
                          onClick={() => removeTagFromList(tag, 'remove')}
                          className="hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !!result}
            variant={isDestructive ? 'destructive' : 'default'}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === 'delete'
              ? 'Delete'
              : action === 'deactivate'
                ? 'Deactivate'
                : 'Apply Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
