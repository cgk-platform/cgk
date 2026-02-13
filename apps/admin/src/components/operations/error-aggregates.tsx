'use client'

import { Badge, Card, CardContent, CardHeader, Spinner } from '@cgk-platform/ui'
import type { ErrorAggregate } from '@cgk-platform/logging'
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ErrorAggregatesViewProps {
  initialAggregates?: ErrorAggregate[]
}

interface AggregateDetails {
  message: string
  sampleStack: string | null
  recentErrors: Array<{
    id: string
    timestamp: Date
    tenantId: string | null
    userId: string | null
    message: string
  }>
}

export function ErrorAggregatesView({ initialAggregates = [] }: ErrorAggregatesViewProps) {
  const [aggregates, setAggregates] = useState<ErrorAggregate[]>(initialAggregates)
  const [loading, setLoading] = useState(!initialAggregates.length)
  const [expandedSignature, setExpandedSignature] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, AggregateDetails>>({})
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    totalErrors: number
    uniqueErrors: number
    affectedTenants: number
    affectedUsers: number
  } | null>(null)

  // Fetch aggregates on mount
  useEffect(() => {
    if (initialAggregates.length) {
      return
    }

    const fetchAggregates = async () => {
      try {
        const response = await fetch('/api/platform/logs/aggregates')
        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        setAggregates(data.aggregates)
        setSummary(data.summary)
      } catch (error) {
        console.error('Error fetching aggregates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAggregates()
  }, [initialAggregates.length])

  // Fetch details when expanding
  const handleExpand = useCallback(
    async (signature: string) => {
      if (expandedSignature === signature) {
        setExpandedSignature(null)
        return
      }

      setExpandedSignature(signature)

      // Check if we already have details
      if (details[signature]) {
        return
      }

      setLoadingDetails(signature)

      try {
        const response = await fetch(`/api/platform/logs/aggregates?signature=${signature}`)
        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        setDetails((prev) => ({
          ...prev,
          [signature]: {
            message: data.message,
            sampleStack: data.sampleStack,
            recentErrors: data.recentErrors.map(
              (e: { timestamp: string | Date; id: string; tenantId: string | null; userId: string | null; message: string }) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            })),
          },
        }))
      } catch (error) {
        console.error('Error fetching details:', error)
      } finally {
        setLoadingDetails(null)
      }
    },
    [expandedSignature, details]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-6 h-6" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Errors"
            value={summary.totalErrors}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          />
          <SummaryCard
            title="Unique Errors"
            value={summary.uniqueErrors}
            icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          />
          <SummaryCard
            title="Affected Tenants"
            value={summary.affectedTenants}
            icon={<Users className="w-5 h-5 text-blue-500" />}
          />
          <SummaryCard
            title="Affected Users"
            value={summary.affectedUsers}
            icon={<Users className="w-5 h-5 text-purple-500" />}
          />
        </div>
      )}

      {/* Error list */}
      <div className="space-y-3">
        {aggregates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No errors found in the selected time range
          </div>
        ) : (
          aggregates.map((agg) => (
            <ErrorAggregateCard
              key={agg.signature}
              aggregate={agg}
              expanded={expandedSignature === agg.signature}
              onExpand={() => handleExpand(agg.signature)}
              details={details[agg.signature]}
              loadingDetails={loadingDetails === agg.signature}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorAggregateCard({
  aggregate,
  expanded,
  onExpand,
  details,
  loadingDetails,
}: {
  aggregate: ErrorAggregate
  expanded: boolean
  onExpand: () => void
  details?: AggregateDetails
  loadingDetails: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={onExpand}
      >
        <div className="flex items-start gap-3">
          {/* Expand icon */}
          <div className="mt-1">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* Error info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive">{aggregate.errorType}</Badge>
              <span className="text-sm font-mono text-gray-500">
                {aggregate.signature.slice(0, 8)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">
              {aggregate.message}
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {aggregate.count} occurrences
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last seen {formatRelativeTime(new Date(aggregate.lastSeen))}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {aggregate.affectedUsers} users
              </span>
            </div>
          </div>

          {/* Count badge */}
          <div className="flex-shrink-0">
            <Badge variant="secondary" className="text-lg font-mono">
              {aggregate.count}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* Expanded details */}
      {expanded && (
        <CardContent className="p-4 pt-0 border-t bg-gray-50 dark:bg-gray-800/30">
          {loadingDetails ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="w-5 h-5" />
            </div>
          ) : details ? (
            <div className="space-y-4">
              {/* Stack trace */}
              {details.sampleStack && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stack Trace
                  </h4>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {details.sampleStack}
                  </pre>
                </div>
              )}

              {/* Recent occurrences */}
              {details.recentErrors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recent Occurrences
                  </h4>
                  <div className="space-y-2">
                    {details.recentErrors.map((error) => (
                      <div
                        key={error.id}
                        className="text-xs bg-white dark:bg-gray-900 p-2 rounded border"
                      >
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <span>{formatRelativeTime(error.timestamp)}</span>
                          {error.tenantId && <span>@{error.tenantId}</span>}
                          {error.userId && <span>user:{error.userId.slice(0, 8)}</span>}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 truncate">
                          {error.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services affected */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Services:</span>
                {aggregate.services.map((service: string) => (
                  <Badge key={service} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Failed to load details</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString()
}
