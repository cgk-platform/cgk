'use client'

import { Button, Input, Label } from '@cgk/ui'
import { useCallback, useState } from 'react'

import { RATE_CARD_TEMPLATES } from '@/lib/brand-preferences/constants'
import type { RateCardEntry } from '@/lib/types'

interface RateCardEditorProps {
  rateCard: RateCardEntry[]
  minimumRateCents: number | null
  onChange: (rateCard: RateCardEntry[], minimumRateCents: number | null) => void
  disabled?: boolean
}

/**
 * RateCardEditor - Manage rate card entries
 *
 * Features:
 * - Add rate card entries from templates
 * - Set minimum and preferred rates
 * - Global minimum rate setting
 * - Clear formatting with currency display
 */
export function RateCardEditor({
  rateCard,
  minimumRateCents,
  onChange,
  disabled = false,
}: RateCardEditorProps): React.JSX.Element {
  const [customType, setCustomType] = useState('')

  const handleAddEntry = useCallback(
    (platformOrType: string, label?: string) => {
      if (disabled) return

      // Check if already exists
      if (rateCard.some((r) => r.platformOrType === platformOrType)) {
        return
      }

      onChange(
        [
          ...rateCard,
          {
            platformOrType,
            minimumCents: 0,
            preferredCents: 0,
            description: label,
          },
        ],
        minimumRateCents
      )
    },
    [rateCard, onChange, disabled, minimumRateCents]
  )

  const handleRemoveEntry = useCallback(
    (platformOrType: string) => {
      if (disabled) return

      onChange(
        rateCard.filter((r) => r.platformOrType !== platformOrType),
        minimumRateCents
      )
    },
    [rateCard, onChange, disabled, minimumRateCents]
  )

  const handleUpdateEntry = useCallback(
    (platformOrType: string, field: 'minimumCents' | 'preferredCents', value: number) => {
      if (disabled) return

      onChange(
        rateCard.map((r) =>
          r.platformOrType === platformOrType ? { ...r, [field]: Math.max(0, value) } : r
        ),
        minimumRateCents
      )
    },
    [rateCard, onChange, disabled, minimumRateCents]
  )

  const handleMinimumRateChange = useCallback(
    (value: number | null) => {
      if (disabled) return
      onChange(rateCard, value)
    },
    [rateCard, onChange, disabled]
  )

  const handleAddCustom = useCallback(() => {
    if (!customType.trim() || disabled) return

    handleAddEntry(
      customType.toLowerCase().replace(/\s+/g, '_'),
      customType.trim()
    )
    setCustomType('')
  }, [customType, handleAddEntry, disabled])

  // Available templates (not already in rate card)
  const availableTemplates = RATE_CARD_TEMPLATES.filter(
    (t) => !rateCard.some((r) => r.platformOrType === t.platformOrType)
  )

  return (
    <div className="space-y-6">
      {/* Global minimum rate */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-medium text-foreground">Global Minimum Rate</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The absolute minimum you will accept for any collaboration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              min="0"
              value={minimumRateCents ? minimumRateCents / 100 : ''}
              onChange={(e) =>
                handleMinimumRateChange(
                  e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                )
              }
              placeholder="0"
              disabled={disabled}
              className="w-24"
            />
          </div>
        </div>
      </div>

      {/* Rate card entries */}
      {rateCard.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Your Rates</Label>
          <div className="space-y-2">
            {rateCard.map((entry) => (
              <div
                key={entry.platformOrType}
                className="flex items-center gap-4 rounded-lg border bg-card p-4"
              >
                {/* Type label */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {entry.description || formatEntryLabel(entry.platformOrType)}
                  </div>
                </div>

                {/* Minimum rate */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Min:</span>
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    value={entry.minimumCents ? entry.minimumCents / 100 : ''}
                    onChange={(e) =>
                      handleUpdateEntry(
                        entry.platformOrType,
                        'minimumCents',
                        Math.round(parseFloat(e.target.value || '0') * 100)
                      )
                    }
                    disabled={disabled}
                    className="w-20"
                  />
                </div>

                {/* Preferred rate */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Preferred:</span>
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    value={entry.preferredCents ? entry.preferredCents / 100 : ''}
                    onChange={(e) =>
                      handleUpdateEntry(
                        entry.platformOrType,
                        'preferredCents',
                        Math.round(parseFloat(e.target.value || '0') * 100)
                      )
                    }
                    disabled={disabled}
                    className="w-20"
                  />
                </div>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEntry(entry.platformOrType)}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
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
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add from templates */}
      {availableTemplates.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Add Rate</Label>
          <div className="flex flex-wrap gap-2">
            {availableTemplates.map((template) => (
              <Button
                key={template.platformOrType}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddEntry(template.platformOrType, template.label)}
                disabled={disabled}
                className="gap-1.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                {template.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Add custom */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Add Custom Rate Type</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="e.g., LinkedIn Article"
            disabled={disabled}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustom()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCustom}
            disabled={disabled || !customType.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Format entry label from platformOrType key
 */
function formatEntryLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
