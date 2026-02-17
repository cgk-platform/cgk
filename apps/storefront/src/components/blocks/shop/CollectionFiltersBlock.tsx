'use client'

/**
 * Collection Filters Block Component
 *
 * Filter sidebar for product collections with support for
 * checkbox, range, and color swatch filter types.
 */

import { useState, useCallback } from 'react'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, CollectionFiltersConfig, FilterGroup } from '../types'
import { LucideIcon } from '../icons'

/**
 * Active filter value type
 */
type FilterValue = string | string[] | { min: number; max: number }

/**
 * Color swatch component for color filters
 */
function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-full border-2 transition-all',
        selected
          ? 'border-[hsl(var(--portal-primary))] ring-2 ring-[hsl(var(--portal-primary))] ring-offset-2'
          : 'border-[hsl(var(--portal-border))] hover:border-[hsl(var(--portal-primary))]/50'
      )}
      style={{ backgroundColor: color }}
      title={color}
    >
      {selected && (
        <LucideIcon
          name="Check"
          className={cn(
            'h-4 w-4 mx-auto',
            isLightColor(color) ? 'text-gray-800' : 'text-white'
          )}
        />
      )}
    </button>
  )
}

/**
 * Check if a color is light (for contrast calculation)
 */
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 155
}

/**
 * Checkbox filter group component
 */
function CheckboxFilterGroup({
  group,
  selectedValues,
  onChange,
}: {
  group: FilterGroup
  selectedValues: string[]
  onChange: (values: string[]) => void
}) {
  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  return (
    <div className="space-y-3">
      {group.options?.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => toggleValue(option.value)}
          className="flex w-full cursor-pointer items-center gap-3 group text-left"
        >
          <div
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
              selectedValues.includes(option.value)
                ? 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))]'
                : 'border-[hsl(var(--portal-border))] group-hover:border-[hsl(var(--portal-primary))]/50'
            )}
          >
            {selectedValues.includes(option.value) && (
              <LucideIcon name="Check" className="h-3 w-3 text-white" />
            )}
          </div>
          <span className="flex-1 text-sm text-[hsl(var(--portal-foreground))]">
            {option.label}
          </span>
          {option.count !== undefined && (
            <span className="text-xs text-[hsl(var(--portal-muted-foreground))]">
              ({option.count})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * Range filter group component
 */
function RangeFilterGroup({
  group,
  value,
  onChange,
}: {
  group: FilterGroup
  value: { min: number; max: number }
  onChange: (value: { min: number; max: number }) => void
}) {
  const min = group.min ?? 0
  const max = group.max ?? 1000
  const step = group.step ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[hsl(var(--portal-muted-foreground))]">
            Min
          </label>
          <input
            type="number"
            min={min}
            max={value.max}
            step={step}
            value={value.min}
            onChange={(e) => onChange({ ...value, min: Number(e.target.value) })}
            className={cn(
              'w-full rounded-lg border border-[hsl(var(--portal-border))] px-3 py-2',
              'bg-[hsl(var(--portal-background))] text-sm text-[hsl(var(--portal-foreground))]',
              'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--portal-primary))]'
            )}
          />
        </div>
        <span className="mt-5 text-[hsl(var(--portal-muted-foreground))]">-</span>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[hsl(var(--portal-muted-foreground))]">
            Max
          </label>
          <input
            type="number"
            min={value.min}
            max={max}
            step={step}
            value={value.max}
            onChange={(e) => onChange({ ...value, max: Number(e.target.value) })}
            className={cn(
              'w-full rounded-lg border border-[hsl(var(--portal-border))] px-3 py-2',
              'bg-[hsl(var(--portal-background))] text-sm text-[hsl(var(--portal-foreground))]',
              'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--portal-primary))]'
            )}
          />
        </div>
      </div>

      {/* Range slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value.max}
        onChange={(e) => onChange({ ...value, max: Number(e.target.value) })}
        className="w-full accent-[hsl(var(--portal-primary))]"
      />
    </div>
  )
}

/**
 * Color filter group component
 */
function ColorFilterGroup({
  group,
  selectedValues,
  onChange,
}: {
  group: FilterGroup
  selectedValues: string[]
  onChange: (values: string[]) => void
}) {
  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {group.options?.map((option) => (
        <ColorSwatch
          key={option.value}
          color={option.value}
          selected={selectedValues.includes(option.value)}
          onClick={() => handleToggle(option.value)}
        />
      ))}
    </div>
  )
}

/**
 * Filter group container with collapsible header
 */
function FilterGroupContainer({
  group,
  isExpanded,
  onToggle,
  collapsible,
  children,
}: {
  group: FilterGroup
  isExpanded: boolean
  onToggle: () => void
  collapsible: boolean
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-[hsl(var(--portal-border))] py-4 last:border-b-0">
      {collapsible ? (
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-medium text-[hsl(var(--portal-foreground))]">
            {group.label}
          </span>
          <LucideIcon
            name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]"
          />
        </button>
      ) : (
        <h3 className="font-medium text-[hsl(var(--portal-foreground))]">
          {group.label}
        </h3>
      )}

      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          collapsible && !isExpanded ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100 mt-4'
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Active filter pill component
 */
function ActiveFilterPill({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--portal-primary))]/10 px-3 py-1 text-sm text-[hsl(var(--portal-primary))]">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-[hsl(var(--portal-primary))]/20"
      >
        <LucideIcon name="X" className="h-3 w-3" />
      </button>
    </span>
  )
}

/**
 * Collection Filters Block Component
 */
export function CollectionFiltersBlock({ block, className }: BlockProps<CollectionFiltersConfig>) {
  const {
    headline,
    filters,
    layout = 'sidebar',
    showClearAll = true,
    showActiveCount = true,
    collapsible = true,
    defaultExpanded = [],
    backgroundColor,
  } = block.config

  const [activeFilters, setActiveFilters] = useState<Record<string, FilterValue>>({})
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(defaultExpanded.length > 0 ? defaultExpanded : filters.map((f) => f.id))
  )

  const handleFilterChange = useCallback((groupId: string, value: FilterValue) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev }
      const isEmpty = Array.isArray(value)
        ? value.length === 0
        : typeof value === 'object'
        ? value.min === 0 && value.max === 0
        : !value

      if (isEmpty) {
        delete newFilters[groupId]
      } else {
        newFilters[groupId] = value
      }
      return newFilters
    })
  }, [])

  const handleToggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setActiveFilters({})
  }, [])

  const removeFilter = useCallback((groupId: string, value?: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev }
      const current = newFilters[groupId]

      if (Array.isArray(current) && value) {
        const filtered = current.filter((v) => v !== value)
        if (filtered.length === 0) {
          delete newFilters[groupId]
        } else {
          newFilters[groupId] = filtered
        }
      } else {
        delete newFilters[groupId]
      }

      return newFilters
    })
  }, [])

  const activeFilterCount = Object.values(activeFilters).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length
    return count + 1
  }, 0)

  const getActiveFilterLabels = (): Array<{ groupId: string; value: string; label: string }> => {
    const labels: Array<{ groupId: string; value: string; label: string }> = []

    Object.entries(activeFilters).forEach(([groupId, value]) => {
      const group = filters.find((f) => f.id === groupId)
      if (!group) return

      if (Array.isArray(value)) {
        value.forEach((v) => {
          const option = group.options?.find((o) => o.value === v)
          labels.push({
            groupId,
            value: v,
            label: option?.label || v,
          })
        })
      } else if (typeof value === 'object' && 'min' in value) {
        labels.push({
          groupId,
          value: 'range',
          label: `${group.label}: $${value.min} - $${value.max}`,
        })
      }
    })

    return labels
  }

  const renderFilterGroup = (group: FilterGroup) => {
    const value = activeFilters[group.id]

    switch (group.type) {
      case 'checkbox':
        return (
          <CheckboxFilterGroup
            group={group}
            selectedValues={(value as string[]) || []}
            onChange={(values) => handleFilterChange(group.id, values)}
          />
        )
      case 'range':
        return (
          <RangeFilterGroup
            group={group}
            value={(value as { min: number; max: number }) || { min: group.min ?? 0, max: group.max ?? 1000 }}
            onChange={(rangeValue) => handleFilterChange(group.id, rangeValue)}
          />
        )
      case 'color':
        return (
          <ColorFilterGroup
            group={group}
            selectedValues={(value as string[]) || []}
            onChange={(values) => handleFilterChange(group.id, values)}
          />
        )
      default:
        return null
    }
  }

  if (layout === 'horizontal') {
    return (
      <div
        className={cn('border-b border-[hsl(var(--portal-border))] py-4', className)}
        style={{ backgroundColor: backgroundColor || 'transparent' }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            {filters.map((group) => (
              <div key={group.id} className="relative">
                <button
                  onClick={() => handleToggleGroup(group.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2',
                    'border-[hsl(var(--portal-border))] text-sm font-medium',
                    'text-[hsl(var(--portal-foreground))] transition-all',
                    'hover:border-[hsl(var(--portal-primary))]',
                    expandedGroups.has(group.id) && 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))]/5'
                  )}
                >
                  {group.label}
                  <LucideIcon name="ChevronDown" className="h-4 w-4" />
                </button>

                {/* Dropdown */}
                {expandedGroups.has(group.id) && (
                  <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4 shadow-xl">
                    {renderFilterGroup(group)}
                  </div>
                )}
              </div>
            ))}

            {showClearAll && activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm font-medium text-[hsl(var(--portal-primary))] hover:underline"
              >
                Clear all {showActiveCount && `(${activeFilterCount})`}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Sidebar layout (default)
  return (
    <div
      className={cn('rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6', className)}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[hsl(var(--portal-foreground))]">
          <LucideIcon name="Filter" className="h-5 w-5" />
          {headline || 'Filters'}
          {showActiveCount && activeFilterCount > 0 && (
            <span className="ml-2 rounded-full bg-[hsl(var(--portal-primary))] px-2 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </h2>

        {showClearAll && activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm font-medium text-[hsl(var(--portal-primary))] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filters */}
      {activeFilterCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {getActiveFilterLabels().map(({ groupId, value, label }) => (
            <ActiveFilterPill
              key={`${groupId}-${value}`}
              label={label}
              onRemove={() => removeFilter(groupId, value !== 'range' ? value : undefined)}
            />
          ))}
        </div>
      )}

      {/* Filter groups */}
      <div>
        {filters.map((group) => (
          <FilterGroupContainer
            key={group.id}
            group={group}
            isExpanded={expandedGroups.has(group.id)}
            onToggle={() => handleToggleGroup(group.id)}
            collapsible={collapsible}
          >
            {renderFilterGroup(group)}
          </FilterGroupContainer>
        ))}
      </div>
    </div>
  )
}
