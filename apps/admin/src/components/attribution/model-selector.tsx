'use client'

import { Select, SelectOption, cn } from '@cgk/ui'

import { ATTRIBUTION_MODELS, type AttributionModel } from '@/lib/attribution'

import { useAttribution } from './attribution-context'

interface ModelSelectorProps {
  className?: string
  showLabel?: boolean
}

export function ModelSelector({ className, showLabel = true }: ModelSelectorProps) {
  const { model, setModel } = useAttribution()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">Model:</span>
      )}
      <Select
        value={model}
        onChange={(e) => setModel(e.target.value as AttributionModel)}
        className="w-40"
      >
        {ATTRIBUTION_MODELS.map((m) => (
          <SelectOption key={m.value} value={m.value}>
            {m.label}
          </SelectOption>
        ))}
      </Select>
    </div>
  )
}
