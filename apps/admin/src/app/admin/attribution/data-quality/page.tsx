'use client'

import { Button } from '@cgk/ui'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback, Suspense } from 'react'

import { DataQualityDashboard, DataQualitySkeleton } from '@/components/attribution'
import type { DataQualityMetrics } from '@/lib/attribution'

function DataQualityContent() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchMetrics = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const response = await fetch('/api/admin/attribution/data-quality')
      const data = await response.json()
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Failed to fetch data quality metrics:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(true)
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchMetrics])

  if (isLoading || !metrics) {
    return <DataQualitySkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Tracking Health</h2>
          <p className="text-sm text-muted-foreground">
            Monitor data quality and tracking coverage
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchMetrics(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <DataQualityDashboard metrics={metrics} />
    </div>
  )
}

export default function DataQualityPage() {
  return (
    <Suspense fallback={<DataQualitySkeleton />}>
      <DataQualityContent />
    </Suspense>
  )
}
