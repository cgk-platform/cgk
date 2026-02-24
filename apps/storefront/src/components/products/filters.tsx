/**
 * Collection Filter Sidebar
 *
 * Vertical filter sidebar for collection pages.
 * Supports price range, color, size, availability filters.
 */

'use client'

import { useState } from 'react'
import { cn } from '@cgk-platform/ui'

interface FilterGroup {
  id: string
  label: string
  type: string
  values: Array<{
    id: string
    label: string
    count: number
    input: string
  }>
}

interface FiltersProps {
  filters: FilterGroup[]
  activeFilters: Record<string, string[]>
  onFilterChange: (filterId: string, valueId: string, checked: boolean) => void
  onClearAll: () => void
}

export function ProductFilterSidebar({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
}: FiltersProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(filters.slice(0, 3).map((f) => f.id))
  )

  const hasActiveFilters = Object.values(activeFilters).some((v) => v.length > 0)

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  return (
    <aside className="w-full space-y-1">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cgk-navy">
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-gray-500 underline hover:text-cgk-navy"
          >
            Clear All
          </button>
        )}
      </div>

      {filters.map((group) => {
        const isExpanded = expandedGroups.has(group.id)
        const groupActive = activeFilters[group.id] ?? []

        return (
          <div key={group.id} className="border-t border-gray-200 py-3">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-gray-900">
                {group.label}
                {groupActive.length > 0 && (
                  <span className="ml-1 text-xs text-cgk-navy">({groupActive.length})</span>
                )}
              </span>
              <svg
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform',
                  isExpanded && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2">
                {group.values.map((value) => {
                  const isChecked = groupActive.includes(value.id)

                  return (
                    <label
                      key={value.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => onFilterChange(group.id, value.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-cgk-navy focus:ring-cgk-navy"
                      />
                      <span className={cn(
                        'flex-1',
                        isChecked ? 'font-medium text-cgk-navy' : 'text-gray-600'
                      )}>
                        {value.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({value.count})
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </aside>
  )
}
