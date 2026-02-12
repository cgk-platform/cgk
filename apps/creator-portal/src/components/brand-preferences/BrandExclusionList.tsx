'use client'

import { Button, cn, Input } from '@cgk/ui'
import { useCallback, useState } from 'react'

import type { BrandExclusion } from '@/lib/types'

interface BrandExclusionListProps {
  exclusions: BrandExclusion[]
  onAdd: (brandName: string, reason?: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
  disabled?: boolean
}

/**
 * BrandExclusionList - Manage brands the creator won't work with
 *
 * Features:
 * - Add brands by name
 * - Optional reason field
 * - Remove with confirmation
 * - Search-like interface
 */
export function BrandExclusionList({
  exclusions,
  onAdd,
  onRemove,
  disabled = false,
}: BrandExclusionListProps): React.JSX.Element {
  const [brandName, setBrandName] = useState('')
  const [reason, setReason] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = useCallback(async () => {
    if (!brandName.trim() || disabled) return

    setIsAdding(true)
    setError(null)

    try {
      await onAdd(brandName.trim(), reason.trim() || undefined)
      setBrandName('')
      setReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add brand')
    } finally {
      setIsAdding(false)
    }
  }, [brandName, reason, onAdd, disabled])

  const handleRemove = useCallback(
    async (id: string) => {
      if (disabled) return

      setRemovingId(id)
      setError(null)

      try {
        await onRemove(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove brand')
      } finally {
        setRemovingId(null)
      }
    },
    [onRemove, disabled]
  )

  return (
    <div className="space-y-4">
      {/* Add new exclusion */}
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <label htmlFor="brand-name" className="text-sm font-medium text-foreground">
            Brand Name
          </label>
          <Input
            id="brand-name"
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Enter brand name..."
            disabled={disabled || isAdding}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="exclusion-reason" className="text-sm font-medium text-foreground">
            Reason <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="exclusion-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Values don't align, past issues..."
            disabled={disabled || isAdding}
          />
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          disabled={disabled || isAdding || !brandName.trim()}
          className="w-full"
        >
          {isAdding ? 'Adding...' : 'Add to Exclusion List'}
        </Button>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Exclusion list */}
      {exclusions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            {exclusions.length} brand{exclusions.length !== 1 ? 's' : ''} excluded
          </div>

          <div className="space-y-2">
            {exclusions.map((exclusion) => (
              <div
                key={exclusion.id}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-lg border bg-card p-3 transition-opacity',
                  removingId === exclusion.id && 'opacity-50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{exclusion.brandName}</div>
                  {exclusion.reason && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {exclusion.reason}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(exclusion.id)}
                  disabled={disabled || removingId === exclusion.id}
                  className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {exclusions.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m4.9 4.9 14.2 14.2" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            No excluded brands yet. Add brands you don&apos;t want to work with.
          </p>
        </div>
      )}
    </div>
  )
}
