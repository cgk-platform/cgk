'use client'

import { cn, Switch } from '@cgk-platform/ui'

import { PRICING_RANGES } from '@/lib/brand-preferences/constants'
import type { PricingRange } from '@/lib/types'

interface PricingRangeSelectorProps {
  selected: Record<PricingRange, boolean>
  onChange: (ranges: Record<PricingRange, boolean>) => void
  disabled?: boolean
}

/**
 * PricingRangeSelector - Toggle switches for pricing ranges
 *
 * Features:
 * - Clean toggle layout
 * - Price range descriptions
 * - Easy on/off for each tier
 */
export function PricingRangeSelector({
  selected,
  onChange,
  disabled = false,
}: PricingRangeSelectorProps): React.JSX.Element {
  const handleToggle = (range: PricingRange) => {
    if (disabled) return

    onChange({
      ...selected,
      [range]: !selected[range],
    })
  }

  return (
    <div className="space-y-2">
      {PRICING_RANGES.map((range) => {
        const isEnabled = selected[range.id]

        return (
          <div
            key={range.id}
            className={cn(
              'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
              isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
              disabled && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-3">
              {/* Tier indicator */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                  range.id === 'budget' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  range.id === 'midrange' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  range.id === 'premium' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  range.id === 'luxury' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                )}
              >
                {range.id === 'budget' && '$'}
                {range.id === 'midrange' && '$$'}
                {range.id === 'premium' && '$$$'}
                {range.id === 'luxury' && '$$$$'}
              </div>

              <div>
                <div className="font-medium text-foreground">{range.label}</div>
                <div className="text-xs text-muted-foreground">{range.description}</div>
              </div>
            </div>

            <Switch
              checked={isEnabled}
              onCheckedChange={() => handleToggle(range.id)}
              disabled={disabled}
            />
          </div>
        )
      })}
    </div>
  )
}
