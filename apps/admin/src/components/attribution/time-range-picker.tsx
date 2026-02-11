'use client'

import { Button, Input, cn } from '@cgk/ui'
import { useState } from 'react'

import type { TimeRangePreset } from '@/lib/attribution'

import { useAttribution } from './attribution-context'

interface TimeRangePickerProps {
  className?: string
}

const presets: { value: TimeRangePreset; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '14d', label: '14D' },
  { value: '28d', label: '28D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'custom', label: 'Custom' },
]

export function TimeRangePicker({ className }: TimeRangePickerProps) {
  const { timeRangePreset, setTimeRangePreset, startDate, endDate, setDateRange } = useAttribution()
  const [showCustom, setShowCustom] = useState(timeRangePreset === 'custom')
  const [customStart, setCustomStart] = useState(startDate)
  const [customEnd, setCustomEnd] = useState(endDate)

  const handlePresetClick = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      setTimeRangePreset(preset)
    }
  }

  const handleCustomApply = () => {
    setDateRange(customStart, customEnd)
    setShowCustom(false)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex rounded-md border bg-muted p-0.5">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              timeRangePreset === preset.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-8 w-32 text-xs"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-8 w-32 text-xs"
          />
          <Button size="sm" onClick={handleCustomApply}>
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}
