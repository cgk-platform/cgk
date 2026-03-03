'use client'

import { Button, Card, CardContent, CardHeader, cn, StatusDot } from '@cgk-platform/ui'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

interface HealthCell {
  status: HealthStatus
  responseTimeMs: number | null
  lastError: string | null
  checkedAt: string | null
}

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
}

interface HealthMatrix {
  tenants: Tenant[]
  services: string[]
  statuses: Record<string, Record<string, HealthCell>>
  serviceAggregates: Record<string, { healthy: number; degraded: number; unhealthy: number; unknown: number }>
  tenantAggregates: Record<string, { healthy: number; degraded: number; unhealthy: number; unknown: number }>
  checkedAt: string
}

/**
 * Health Matrix page
 *
 * Displays a service x tenant grid showing health status.
 * Each cell shows status with drill-down capability.
 */
export default function HealthPage() {
  const [matrix, setMatrix] = useState<HealthMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{ tenantId: string; service: string } | null>(null)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/platform/health/matrix')
      if (response.ok) {
        const data = await response.json()
        setMatrix(data)
      }
    } catch (error) {
      console.error('Failed to fetch health matrix:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [fetchHealth])

  const getStatusColor = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'unhealthy':
        return 'bg-red-500'
      case 'unknown':
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusBgColor = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 hover:bg-green-100'
      case 'degraded':
        return 'bg-yellow-50 hover:bg-yellow-100'
      case 'unhealthy':
        return 'bg-red-50 hover:bg-red-100'
      case 'unknown':
      default:
        return 'bg-gray-50 hover:bg-gray-100'
    }
  }

  const getCellHealth = (tenantId: string, service: string): HealthCell | null => {
    if (!matrix) return null
    return matrix.statuses[tenantId]?.[service] || null
  }

  const formatServiceName = (service: string): string => {
    return service.charAt(0).toUpperCase() + service.slice(1)
  }

  if (loading && !matrix) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Health Matrix</h1>
            <p className="text-muted-foreground">
              Cross-tenant service health monitoring.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading health matrix...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Health Matrix</h1>
          <p className="text-muted-foreground">
            Cross-tenant service health monitoring.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {matrix && (
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(matrix.checkedAt).toLocaleTimeString()}
            </p>
          )}
          <Button onClick={fetchHealth} disabled={loading} variant="outline">
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm">Degraded</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm">Unhealthy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-sm">Unknown</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Matrix Grid */}
      {matrix && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Service Health by Tenant</h2>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background p-2 text-left text-sm font-medium">
                    Tenant
                  </th>
                  {matrix.services.map((service) => (
                    <th key={service} className="p-2 text-center text-sm font-medium">
                      <div>{formatServiceName(service)}</div>
                      {matrix.serviceAggregates[service] && (
                        <div className="flex justify-center gap-1 mt-1">
                          <span className="text-xs text-green-600">
                            {matrix.serviceAggregates[service].healthy}
                          </span>
                          <span className="text-xs text-yellow-600">
                            {matrix.serviceAggregates[service].degraded}
                          </span>
                          <span className="text-xs text-red-600">
                            {matrix.serviceAggregates[service].unhealthy}
                          </span>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-background p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tenant.name}</span>
                        <span className="text-xs text-muted-foreground">({tenant.slug})</span>
                      </div>
                      {matrix.tenantAggregates[tenant.id] && (
                        <div className="flex gap-1 mt-0.5">
                          <span className="text-xs text-green-600">
                            {matrix.tenantAggregates[tenant.id]?.healthy ?? 0} ok
                          </span>
                          {(matrix.tenantAggregates[tenant.id]?.unhealthy ?? 0) > 0 && (
                            <span className="text-xs text-red-600">
                              {matrix.tenantAggregates[tenant.id]?.unhealthy ?? 0} down
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    {matrix.services.map((service) => {
                      const cell = getCellHealth(tenant.id, service)
                      const isSelected =
                        selectedCell?.tenantId === tenant.id && selectedCell?.service === service

                      return (
                        <td key={service} className="p-1">
                          <button
                            onClick={() =>
                              setSelectedCell(
                                isSelected ? null : { tenantId: tenant.id, service }
                              )
                            }
                            className={cn(
                              'w-full h-10 rounded-md flex items-center justify-center transition-colors',
                              cell ? getStatusBgColor(cell.status) : 'bg-gray-50',
                              isSelected && 'ring-2 ring-primary'
                            )}
                          >
                            <div
                              className={cn(
                                'h-3 w-3 rounded-full',
                                cell ? getStatusColor(cell.status) : 'bg-gray-400'
                              )}
                            />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Selected Cell Detail */}
      {selectedCell && matrix && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">
              {formatServiceName(selectedCell.service)} -{' '}
              {matrix.tenants.find((t) => t.id === selectedCell.tenantId)?.name}
            </h2>
          </CardHeader>
          <CardContent>
            {(() => {
              const cell = getCellHealth(selectedCell.tenantId, selectedCell.service)
              if (!cell) return <p className="text-muted-foreground">No data available</p>

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <StatusDot
                      status={
                        cell.status === 'unhealthy'
                          ? 'critical'
                          : cell.status === 'degraded'
                            ? 'degraded'
                            : 'healthy'
                      }
                      size="lg"
                    />
                    <div>
                      <p className="text-lg font-medium capitalize">{cell.status}</p>
                      {cell.checkedAt && (
                        <p className="text-sm text-muted-foreground">
                          Last checked: {new Date(cell.checkedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {cell.responseTimeMs !== null && (
                    <div>
                      <p className="text-sm font-medium">Response Time</p>
                      <p className="text-2xl font-bold">{cell.responseTimeMs}ms</p>
                    </div>
                  )}

                  {cell.lastError && (
                    <div>
                      <p className="text-sm font-medium text-red-600">Last Error</p>
                      <pre className="mt-1 rounded bg-red-50 p-3 text-sm text-red-700 overflow-x-auto">
                        {cell.lastError}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
