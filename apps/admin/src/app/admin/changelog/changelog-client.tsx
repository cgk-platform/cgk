'use client'

/**
 * Changelog Client Component
 * Interactive changelog viewer with filtering
 */

import { Badge, Button, cn } from '@cgk-platform/ui'
import {
  Calendar,
  ChevronDown,
  Code,
  Filter,
  RefreshCw,
  Search,
  Server,
  Settings,
  User,
  Webhook,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { ChangelogEntry, ChangelogStats, ChangeSource } from '@/lib/admin-utilities/types'

const SOURCE_CONFIG: Record<
  ChangeSource,
  { icon: React.ReactNode; label: string; color: string }
> = {
  admin: {
    icon: <Settings className="h-4 w-4" />,
    label: 'Admin',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  api: {
    icon: <Code className="h-4 w-4" />,
    label: 'API',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  webhook: {
    icon: <Webhook className="h-4 w-4" />,
    label: 'Webhook',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  job: {
    icon: <Zap className="h-4 w-4" />,
    label: 'Job',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  system: {
    icon: <Server className="h-4 w-4" />,
    label: 'System',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  user: {
    icon: <User className="h-4 w-4" />,
    label: 'User',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
}

export function ChangelogClient() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [stats, setStats] = useState<ChangelogStats | null>(null)
  const [activeSource, setActiveSource] = useState<ChangeSource | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchChangelog = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ stats: 'true', limit: '100' })
      if (activeSource !== 'all') {
        params.set('source', activeSource)
      }

      const res = await fetch(`/api/admin/changelog?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch changelog:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeSource])

  useEffect(() => {
    fetchChangelog()
  }, [fetchChangelog])

  // Filter entries by search query
  const filteredEntries = searchQuery
    ? entries.filter(
        (entry) =>
          entry.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.entityType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Stats Bar */}
        {stats && (
          <div className="mb-6 grid grid-cols-3 gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/50 md:grid-cols-6">
            {(Object.keys(SOURCE_CONFIG) as ChangeSource[]).map((source) => {
              const config = SOURCE_CONFIG[source]
              const count = stats.bySource[source] || 0
              return (
                <button
                  key={source}
                  onClick={() => setActiveSource(source)}
                  className={cn(
                    'flex flex-col items-center rounded-lg p-3 transition-colors',
                    activeSource === source
                      ? 'bg-indigo-50 ring-2 ring-indigo-200'
                      : 'hover:bg-neutral-50'
                  )}
                >
                  <span className={cn('rounded-md p-1.5', config.color)}>
                    {config.icon}
                  </span>
                  <span className="mt-1 text-xs font-medium text-neutral-500">
                    {config.label}
                  </span>
                  <span className="font-mono text-lg font-semibold text-neutral-900">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by entity ID, type, or summary..."
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-neutral-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select
              value={activeSource}
              onChange={(e) => setActiveSource(e.target.value as ChangeSource | 'all')}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All Sources</option>
              {(Object.keys(SOURCE_CONFIG) as ChangeSource[]).map((source) => (
                <option key={source} value={source}>
                  {SOURCE_CONFIG[source].label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchChangelog}
            disabled={isLoading}
          >
            <RefreshCw className={cn('mr-1.5 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-neutral-200"
              />
            ))
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 py-16 text-center">
              <Calendar className="mb-4 h-12 w-12 text-neutral-400" />
              <h3 className="text-lg font-medium text-neutral-700">No entries found</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Changes will appear here as they occur'}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const sourceConfig = SOURCE_CONFIG[entry.source]
              const isExpanded = expandedEntry === entry.id

              return (
                <div
                  key={entry.id}
                  className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200/50 transition-shadow hover:shadow-md"
                >
                  {/* Entry Header */}
                  <div
                    className="flex cursor-pointer items-start gap-4 p-4"
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                  >
                    {/* Source Icon */}
                    <div className={cn('rounded-lg p-2', sourceConfig.color)}>
                      {sourceConfig.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-neutral-900">{entry.summary}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                            <Badge variant="outline" className="font-mono">
                              {entry.entityType}
                            </Badge>
                            <span>ID: {entry.entityId.slice(0, 8)}...</span>
                            {entry.userEmail && <span>by {entry.userEmail}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="whitespace-nowrap text-xs text-neutral-400">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-neutral-400 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && entry.details && (
                    <div className="border-t border-neutral-100 bg-neutral-50 p-4">
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Details
                      </h4>
                      <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                      {entry.metadata && (
                        <>
                          <h4 className="mb-2 mt-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Metadata
                          </h4>
                          <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
