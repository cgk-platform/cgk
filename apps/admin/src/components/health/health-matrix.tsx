'use client'

/**
 * Health Matrix Grid Component
 *
 * Displays a service x tenant grid showing health status for each combination.
 */

import type { HealthMatrixResponse, HealthStatus } from '@cgk-platform/health'
import { useEffect, useState } from 'react'


import { cn } from '../../lib/utils'

interface HealthMatrixProps {
  className?: string
  refreshInterval?: number
}

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
  unknown: 'bg-gray-400',
}

const STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
  unknown: 'Unknown',
}

function formatServiceName(service: string): string {
  return service
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatusDot({
  status,
  showLabel = false,
}: {
  status: HealthStatus
  showLabel?: boolean
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span
        className={cn(
          'w-3 h-3 rounded-full',
          STATUS_COLORS[status]
        )}
        title={STATUS_LABELS[status]}
      />
      {showLabel && (
        <span className="text-sm capitalize">{STATUS_LABELS[status]}</span>
      )}
    </div>
  )
}

function HealthMatrixSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">
                <div className="h-4 w-20 bg-muted rounded" />
              </th>
              {[1, 2, 3].map((i) => (
                <th key={i} className="p-3 text-center">
                  <div className="h-4 w-16 bg-muted rounded mx-auto" />
                </th>
              ))}
              <th className="p-3 text-center">
                <div className="h-4 w-16 bg-muted rounded mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((row) => (
              <tr key={row} className="border-b">
                <td className="p-3">
                  <div className="h-4 w-24 bg-muted rounded" />
                </td>
                {[1, 2, 3].map((col) => (
                  <td key={col} className="p-3 text-center">
                    <div className="w-3 h-3 bg-muted rounded-full mx-auto" />
                  </td>
                ))}
                <td className="p-3 text-center">
                  <div className="w-3 h-3 bg-muted rounded-full mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function HealthMatrix({
  className,
  refreshInterval = 30000,
}: HealthMatrixProps) {
  const [matrix, setMatrix] = useState<HealthMatrixResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMatrix() {
      try {
        const response = await fetch('/api/platform/health/matrix')
        if (!response.ok) {
          throw new Error('Failed to fetch health matrix')
        }
        const data = await response.json()
        setMatrix(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMatrix()

    // Set up refresh interval
    const interval = setInterval(fetchMatrix, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  if (loading) {
    return <HealthMatrixSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading health matrix: {error}
      </div>
    )
  }

  if (!matrix) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No health data available
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left font-medium text-muted-foreground">
              Service
            </th>
            {matrix.tenants.map((tenant) => (
              <th
                key={tenant}
                className="p-3 text-center font-medium text-muted-foreground"
              >
                {tenant}
              </th>
            ))}
            <th className="p-3 text-center font-medium text-muted-foreground">
              Platform
            </th>
          </tr>
        </thead>
        <tbody>
          {matrix.services.map((service) => (
            <tr key={service} className="border-b hover:bg-muted/50">
              <td className="p-3 font-medium">
                {formatServiceName(service)}
              </td>
              {matrix.tenants.map((tenant) => (
                <td key={tenant} className="p-3 text-center">
                  <StatusDot
                    status={matrix.statuses[tenant]?.[service] || 'unknown'}
                  />
                </td>
              ))}
              <td className="p-3 text-center">
                <StatusDot
                  status={matrix.platformStatuses[service] || 'unknown'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
        <span className="font-medium">Legend:</span>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', STATUS_COLORS[status as HealthStatus])} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Last updated */}
      <div className="mt-2 text-xs text-muted-foreground">
        Last updated: {new Date(matrix.timestamp).toLocaleString()}
      </div>
    </div>
  )
}
