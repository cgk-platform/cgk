'use client'

import { Button, Spinner } from '@cgk-platform/ui'
import type { PlatformLogEntry } from '@cgk-platform/logging'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useCallback, useState } from 'react'

import { LogFilters, type LogFilterValues } from './log-filters'
import { LogLine } from './log-line'

interface LogTableProps {
  initialLogs?: PlatformLogEntry[]
  initialTotal?: number
  initialFilters?: LogFilterValues
}

export function LogTable({
  initialLogs = [],
  initialTotal = 0,
  initialFilters = {},
}: LogTableProps) {
  const [logs, setLogs] = useState<PlatformLogEntry[]>(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<LogFilterValues>(initialFilters)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(50)

  const fetchLogs = useCallback(
    async (pageOffset: number = 0) => {
      setLoading(true)

      try {
        const params = new URLSearchParams()

        if (filters.level) {
          params.set(
            'level',
            Array.isArray(filters.level) ? filters.level.join(',') : filters.level
          )
        }
        if (filters.service) {
          params.set(
            'service',
            Array.isArray(filters.service) ? filters.service.join(',') : filters.service
          )
        }
        if (filters.search) {
          params.set('search', filters.search)
        }
        if (filters.startTime) {
          params.set('startTime', filters.startTime.toISOString())
        }
        if (filters.endTime) {
          params.set('endTime', filters.endTime.toISOString())
        }
        if (filters.hasError !== undefined) {
          params.set('hasError', String(filters.hasError))
        }

        params.set('limit', String(pageSize))
        params.set('offset', String(pageOffset * pageSize))

        const response = await fetch(`/api/platform/logs?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch logs')
        }

        const data = await response.json()
        setLogs(data.logs)
        setTotal(data.total)
        setPage(pageOffset)
      } catch (error) {
        console.error('Error fetching logs:', error)
      } finally {
        setLoading(false)
      }
    },
    [filters, pageSize]
  )

  const handleSearch = useCallback(() => {
    fetchLogs(0)
  }, [fetchLogs])

  const handlePrevPage = useCallback(() => {
    if (page > 0) {
      fetchLogs(page - 1)
    }
  }, [page, fetchLogs])

  const handleNextPage = useCallback(() => {
    if ((page + 1) * pageSize < total) {
      fetchLogs(page + 1)
    }
  }, [page, pageSize, total, fetchLogs])

  const handleExport = useCallback(async () => {
    const params = new URLSearchParams()

    if (filters.level) {
      params.set(
        'level',
        Array.isArray(filters.level) ? filters.level.join(',') : filters.level
      )
    }
    if (filters.service) {
      params.set(
        'service',
        Array.isArray(filters.service) ? filters.service.join(',') : filters.service
      )
    }
    if (filters.search) {
      params.set('search', filters.search)
    }
    if (filters.startTime) {
      params.set('startTime', filters.startTime.toISOString())
    }
    if (filters.endTime) {
      params.set('endTime', filters.endTime.toISOString())
    }
    if (filters.hasError !== undefined) {
      params.set('hasError', String(filters.hasError))
    }

    // Fetch more logs for export (up to 1000)
    params.set('limit', '1000')

    try {
      const response = await fetch(`/api/platform/logs?${params.toString()}`)
      const data = await response.json()

      // Create JSON blob and download
      const blob = new Blob([JSON.stringify(data.logs, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs-export-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting logs:', error)
    }
  }, [filters])

  const totalPages = Math.ceil(total / pageSize)
  const startIndex = page * pageSize + 1
  const endIndex = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <LogFilters filters={filters} onFiltersChange={setFilters} onSearch={handleSearch} />

      {/* Results header */}
      <div className="flex items-center justify-between p-3 border-b bg-white dark:bg-gray-900">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {total > 0 ? (
            <>
              Showing {startIndex}-{endIndex} of {total.toLocaleString()} logs
            </>
          ) : (
            'No logs found'
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner className="w-6 h-6" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No logs match your filters
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <LogLine key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t bg-white dark:bg-gray-900">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
