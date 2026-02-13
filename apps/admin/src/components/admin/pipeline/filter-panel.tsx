'use client'

import { cn } from '@cgk-platform/ui'
import {
  Bookmark,
  Check,
  ChevronDown,
  Filter,
  Save,
  Search,
  X,
} from 'lucide-react'
import { useState, useCallback } from 'react'

import type {
  PipelineFilters,
  SavedFilter,
  ProjectStatus,
  RiskLevel,
} from '@/lib/pipeline/types'
import { PIPELINE_STAGES } from '@/lib/pipeline/types'

interface FilterPanelProps {
  filters: PipelineFilters
  onFiltersChange: (filters: PipelineFilters) => void
  savedFilters: SavedFilter[]
  creators: Array<{ id: string; name: string }>
  onSaveFilter: (name: string) => void
  onLoadFilter: (filter: SavedFilter) => void
  onDeleteFilter: (filterId: string) => void
  isExpanded: boolean
  onToggleExpanded: () => void
}

const RISK_LEVELS: Array<{ id: RiskLevel; label: string; color: string }> = [
  { id: 'none', label: 'None', color: '#64748b' },
  { id: 'low', label: 'Low', color: '#eab308' },
  { id: 'medium', label: 'Medium', color: '#f59e0b' },
  { id: 'high', label: 'High', color: '#f97316' },
  { id: 'critical', label: 'Critical', color: '#ef4444' },
]

interface MultiSelectProps {
  label: string
  options: Array<{ id: string; label: string; color?: string }>
  selected: string[]
  onChange: (selected: string[]) => void
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex min-w-[140px] items-center justify-between gap-2 rounded border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 font-mono text-xs transition-colors hover:border-slate-600',
          selected.length > 0 && 'border-blue-500/50'
        )}
      >
        <span className="text-slate-400">
          {label}
          {selected.length > 0 && (
            <span className="ml-1 text-blue-400">({selected.length})</span>
          )}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
            {options.map((option) => {
              const isSelected = selected.includes(option.id)
              return (
                <button
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-700/50',
                    isSelected && 'bg-slate-700/30'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border',
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-600'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {option.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="text-slate-300">{option.label}</span>
                </button>
              )
            })}
            {selected.length > 0 && (
              <>
                <div className="my-1 border-t border-slate-700/50" />
                <button
                  onClick={() => onChange([])}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-500 transition-colors hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                  Clear selection
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function FilterPanel({
  filters,
  onFiltersChange,
  savedFilters,
  creators,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  isExpanded,
  onToggleExpanded,
}: FilterPanelProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [showSavedFilters, setShowSavedFilters] = useState(false)

  const hasActiveFilters =
    (filters.statuses?.length ?? 0) > 0 ||
    (filters.creatorIds?.length ?? 0) > 0 ||
    (filters.riskLevels?.length ?? 0) > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.hasFiles ||
    filters.hasUnreadMessages ||
    filters.search

  const clearFilters = useCallback(() => {
    onFiltersChange({})
  }, [onFiltersChange])

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter(filterName.trim())
      setFilterName('')
      setShowSaveModal(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-900/30 backdrop-blur-sm">
      {/* Collapsed view */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleExpanded}
            className={cn(
              'flex items-center gap-2 font-mono text-sm transition-colors',
              hasActiveFilters ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs">
                Active
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          {/* Search input (always visible) */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={filters.search || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value || undefined })
              }
              className="w-64 rounded border border-slate-700/50 bg-slate-800/50 py-1.5 pl-9 pr-3 font-mono text-xs text-slate-200 placeholder-slate-500 transition-colors focus:border-blue-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved filters dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSavedFilters(!showSavedFilters)}
              className="flex items-center gap-1.5 rounded border border-slate-700/50 px-3 py-1.5 font-mono text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Saved
              <ChevronDown className="h-3 w-3" />
            </button>

            {showSavedFilters && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSavedFilters(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                  {savedFilters.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      No saved filters
                    </div>
                  ) : (
                    savedFilters.map((filter) => (
                      <div
                        key={filter.id}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-slate-700/50"
                      >
                        <button
                          onClick={() => {
                            onLoadFilter(filter)
                            setShowSavedFilters(false)
                          }}
                          className="flex-1 text-left text-xs text-slate-300"
                        >
                          {filter.name}
                          {filter.isDefault && (
                            <span className="ml-1 text-slate-500">(default)</span>
                          )}
                        </button>
                        <button
                          onClick={() => onDeleteFilter(filter.id)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Save current filter */}
          {hasActiveFilters && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 rounded border border-slate-700/50 px-3 py-1.5 font-mono text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="border-t border-slate-700/30 px-4 py-3">
          <div className="flex flex-wrap gap-3">
            {/* Status filter */}
            <MultiSelect
              label="Status"
              options={PIPELINE_STAGES.map((s) => ({
                id: s.id,
                label: s.label,
                color: s.color,
              }))}
              selected={filters.statuses || []}
              onChange={(statuses) =>
                onFiltersChange({
                  ...filters,
                  statuses: statuses.length > 0 ? (statuses as ProjectStatus[]) : undefined,
                })
              }
            />

            {/* Creator filter */}
            <MultiSelect
              label="Creator"
              options={creators.map((c) => ({ id: c.id, label: c.name }))}
              selected={filters.creatorIds || []}
              onChange={(creatorIds) =>
                onFiltersChange({
                  ...filters,
                  creatorIds: creatorIds.length > 0 ? creatorIds : undefined,
                })
              }
            />

            {/* Risk level filter */}
            <MultiSelect
              label="Risk Level"
              options={RISK_LEVELS.map((r) => ({
                id: r.id,
                label: r.label,
                color: r.color,
              }))}
              selected={filters.riskLevels || []}
              onChange={(riskLevels) =>
                onFiltersChange({
                  ...filters,
                  riskLevels: riskLevels.length > 0 ? (riskLevels as RiskLevel[]) : undefined,
                })
              }
            />

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                placeholder="From"
                value={filters.dateFrom || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateFrom: e.target.value || undefined,
                  })
                }
                className="rounded border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 font-mono text-xs text-slate-200 transition-colors focus:border-blue-500/50 focus:outline-none"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                placeholder="To"
                value={filters.dateTo || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateTo: e.target.value || undefined,
                  })
                }
                className="rounded border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 font-mono text-xs text-slate-200 transition-colors focus:border-blue-500/50 focus:outline-none"
              />
            </div>

            {/* Toggle filters */}
            <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-700/50 px-3 py-1.5 font-mono text-xs text-slate-400 transition-colors hover:border-slate-600">
              <input
                type="checkbox"
                checked={filters.hasFiles || false}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    hasFiles: e.target.checked || undefined,
                  })
                }
                className="h-3 w-3 rounded border-slate-600 bg-slate-700 text-blue-500"
              />
              With files
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-700/50 px-3 py-1.5 font-mono text-xs text-slate-400 transition-colors hover:border-slate-600">
              <input
                type="checkbox"
                checked={filters.hasUnreadMessages || false}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    hasUnreadMessages: e.target.checked || undefined,
                  })
                }
                className="h-3 w-3 rounded border-slate-600 bg-slate-700 text-blue-500"
              />
              Unread messages
            </label>
          </div>
        </div>
      )}

      {/* Save filter modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-xl">
            <h3 className="mb-3 font-mono text-sm font-semibold text-slate-200">
              Save Filter
            </h3>
            <input
              type="text"
              placeholder="Filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
              className="mb-3 w-full rounded border border-slate-700/50 bg-slate-900/50 px-3 py-2 font-mono text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="rounded px-3 py-1.5 font-mono text-xs text-slate-400 hover:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="rounded bg-blue-500 px-3 py-1.5 font-mono text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
