'use client'

import { Button } from '@cgk-platform/ui'
import { useState } from 'react'

export type PeriodOption = 'week' | 'month' | 'last_month' | 'year' | 'last_year' | 'all' | 'custom'

interface PeriodSelectorProps {
  value: PeriodOption
  onChange: (period: PeriodOption, startDate?: string, endDate?: string) => void
  showCustom?: boolean
}

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
]

export function PeriodSelector({
  value,
  onChange,
  showCustom = true,
}: PeriodSelectorProps): React.JSX.Element {
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const handlePeriodClick = (period: PeriodOption): void => {
    if (period === 'custom') {
      setShowCustomPicker(true)
    } else {
      setShowCustomPicker(false)
      onChange(period)
    }
  }

  const handleCustomSubmit = (): void => {
    if (customStart && customEnd) {
      onChange('custom', customStart, customEnd)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick(option.value)}
          >
            {option.label}
          </Button>
        ))}
        {showCustom && (
          <Button
            variant={value === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick('custom')}
          >
            Custom
          </Button>
        )}
      </div>

      {showCustomPicker && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
          <div>
            <label htmlFor="start-date" className="mb-1 block text-sm font-medium">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="mb-1 block text-sm font-medium">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button size="sm" onClick={handleCustomSubmit} disabled={!customStart || !customEnd}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCustomPicker(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
