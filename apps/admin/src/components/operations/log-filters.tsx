'use client'

import { Button, Input } from '@cgk/ui'
import type { LogLevelName, ServiceName } from '@cgk/logging'
import { Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'

export interface LogFilterValues {
  level?: LogLevelName | LogLevelName[]
  service?: ServiceName | ServiceName[]
  search?: string
  startTime?: Date
  endTime?: Date
  hasError?: boolean
}

interface LogFiltersProps {
  filters: LogFilterValues
  onFiltersChange: (filters: LogFilterValues) => void
  onSearch: () => void
}

const LOG_LEVELS: LogLevelName[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

const SERVICES: ServiceName[] = [
  'orchestrator',
  'admin',
  'storefront',
  'creator-portal',
  'mcp-server',
  'inngest',
  'webhook-handler',
]

const TIME_PRESETS = [
  { label: 'Last 15 minutes', minutes: 15 },
  { label: 'Last hour', minutes: 60 },
  { label: 'Last 6 hours', minutes: 360 },
  { label: 'Last 24 hours', minutes: 1440 },
  { label: 'Last 7 days', minutes: 10080 },
]

export function LogFilters({ filters, onFiltersChange, onSearch }: LogFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search ?? '')

  const handleLevelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value
      onFiltersChange({
        ...filters,
        level: value === 'all' ? undefined : (value as LogLevelName),
      })
    },
    [filters, onFiltersChange]
  )

  const handleServiceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value
      onFiltersChange({
        ...filters,
        service: value === 'all' ? undefined : (value as ServiceName),
      })
    },
    [filters, onFiltersChange]
  )

  const handleTimePreset = useCallback(
    (minutes: number) => {
      const now = new Date()
      const startTime = new Date(now.getTime() - minutes * 60 * 1000)
      onFiltersChange({
        ...filters,
        startTime,
        endTime: now,
      })
    },
    [filters, onFiltersChange]
  )

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onFiltersChange({
        ...filters,
        search: localSearch || undefined,
      })
      onSearch()
    },
    [filters, localSearch, onFiltersChange, onSearch]
  )

  const handleClearFilters = useCallback(() => {
    setLocalSearch('')
    onFiltersChange({})
    onSearch()
  }, [onFiltersChange, onSearch])

  const hasActiveFilters =
    filters.level ||
    filters.service ||
    filters.search ||
    filters.startTime ||
    filters.hasError !== undefined

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search log messages..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="default">
          Search
        </Button>
      </form>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Level filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Level:</label>
          <select
            value={Array.isArray(filters.level) ? 'all' : (filters.level ?? 'all')}
            onChange={handleLevelChange}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Levels</option>
            {LOG_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Service filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Service:</label>
          <select
            value={Array.isArray(filters.service) ? 'all' : (filters.service ?? 'all')}
            onChange={handleServiceChange}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Services</option>
            {SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        {/* Errors only toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.hasError === true}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                hasError: e.target.checked ? true : undefined,
              })
            }
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Errors only</span>
        </label>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Time range presets */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">Time range:</span>
        {TIME_PRESETS.map((preset) => (
          <Button
            key={preset.minutes}
            variant="outline"
            size="sm"
            onClick={() => handleTimePreset(preset.minutes)}
            className={
              filters.startTime &&
              new Date().getTime() - filters.startTime.getTime() <= preset.minutes * 60 * 1000 + 60000
                ? 'border-primary'
                : ''
            }
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
