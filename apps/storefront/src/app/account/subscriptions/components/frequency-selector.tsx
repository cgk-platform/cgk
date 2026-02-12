'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, cn, Spinner } from '@cgk/ui'
import { getFrequencyOptions, updateFrequency } from '@/lib/subscriptions/api'
import { formatFrequency } from '@/lib/subscriptions/format'
import type { FrequencyOption, SubscriptionFrequency } from '@/lib/subscriptions/types'

interface FrequencySelectorProps {
  subscriptionId: string
  currentFrequency: SubscriptionFrequency
  className?: string
}

/**
 * Frequency selector component
 *
 * Allows customers to change their subscription delivery frequency.
 * Fetches available options from the provider.
 */
export function FrequencySelector({
  subscriptionId,
  currentFrequency,
  className,
}: FrequencySelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [options, setOptions] = useState<FrequencyOption[]>([])
  const [selectedOption, setSelectedOption] = useState<FrequencyOption | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Load frequency options
  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await getFrequencyOptions(subscriptionId)
        setOptions(data)
      } catch {
        setError('Failed to load frequency options')
      } finally {
        setLoading(false)
      }
    }
    loadOptions()
  }, [subscriptionId])

  // Check if current selection matches original
  const isCurrentSelected = selectedOption
    ? selectedOption.interval === currentFrequency.interval &&
      selectedOption.intervalCount === currentFrequency.intervalCount
    : true

  const handleSave = useCallback(async () => {
    if (!selectedOption || isCurrentSelected) return

    setSaving(true)
    setError(null)

    try {
      const result = await updateFrequency(subscriptionId, {
        intervalCount: selectedOption.intervalCount,
        interval: selectedOption.interval,
      })

      if (result.success) {
        setSelectedOption(null)
        startTransition(() => {
          router.refresh()
        })
      } else {
        setError(result.error || 'Failed to update frequency')
      }
    } catch {
      setError('Failed to update frequency')
    } finally {
      setSaving(false)
    }
  }, [subscriptionId, selectedOption, isCurrentSelected, router])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Spinner size="default" />
      </div>
    )
  }

  if (options.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        <p>Current: {formatFrequency(currentFrequency)}</p>
        <p className="text-xs mt-1">Frequency changes are not available for this subscription.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Current Frequency */}
      <div className="text-sm text-muted-foreground">
        Current: <span className="font-medium text-foreground">{formatFrequency(currentFrequency)}</span>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const isCurrent =
            option.interval === currentFrequency.interval &&
            option.intervalCount === currentFrequency.intervalCount
          const isSelected = selectedOption
            ? option.interval === selectedOption.interval &&
              option.intervalCount === selectedOption.intervalCount
            : isCurrent

          return (
            <button
              key={`${option.intervalCount}-${option.interval}`}
              onClick={() => setSelectedOption(option)}
              disabled={saving || isPending}
              className={cn(
                'relative p-3 rounded-lg border-2 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                (saving || isPending) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <p className="font-medium text-sm">{option.label}</p>
              <div className="flex items-center gap-2 mt-1">
                {isCurrent && (
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                )}
                {option.isRecommended && (
                  <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700">
                    Recommended
                  </Badge>
                )}
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Save Button */}
      {selectedOption && !isCurrentSelected && (
        <Button
          onClick={handleSave}
          disabled={saving || isPending}
          className="w-full"
        >
          {saving ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            'Update Frequency'
          )}
        </Button>
      )}
    </div>
  )
}
