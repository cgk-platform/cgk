'use client'

import { cn } from '@cgk-platform/ui'

export type TemplateStatusFilter = 'all' | 'custom' | 'default'

export interface TemplateFilterProps {
  status: TemplateStatusFilter
  onStatusChange: (status: TemplateStatusFilter) => void
  totals?: {
    total: number
    custom: number
    default: number
  }
}

export function TemplateFilter({
  status,
  onStatusChange,
  totals,
}: TemplateFilterProps) {
  const filters: { value: TemplateStatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: totals?.total },
    { value: 'custom', label: 'Custom', count: totals?.custom },
    { value: 'default', label: 'Default', count: totals?.default },
  ]

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onStatusChange(filter.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
            status === filter.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {filter.label}
          {filter.count !== undefined && (
            <span
              className={cn(
                'text-xs',
                status === filter.value
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/70'
              )}
            >
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
