'use client'

import { Select, SelectOption } from '@cgk-platform/ui'

import type { DateRange, DateRangePreset } from '@/lib/analytics'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '28d', label: 'Last 28 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
]

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const handlePresetChange = (preset: string) => {
    const typedPreset = preset as DateRangePreset
    onChange({
      preset: typedPreset,
      startDate: getStartDate(typedPreset),
      endDate: new Date().toISOString().split('T')[0] ?? '',
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value.preset}
        onChange={(e) => handlePresetChange(e.target.value)}
        className="w-40"
      >
        {PRESETS.map((preset) => (
          <SelectOption key={preset.value} value={preset.value}>
            {preset.label}
          </SelectOption>
        ))}
      </Select>
    </div>
  )
}

function getStartDate(preset: DateRangePreset): string {
  const now = new Date()

  if (preset === 'ytd') {
    return `${now.getFullYear()}-01-01`
  }

  const days = { '7d': 7, '14d': 14, '28d': 28, '30d': 30, '90d': 90, 'custom': 30 }[preset] || 30
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return start.toISOString().split('T')[0] ?? ''
}
