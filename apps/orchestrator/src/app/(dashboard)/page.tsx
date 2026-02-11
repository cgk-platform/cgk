'use client'

import { useCallback, useEffect, useState } from 'react'

import { AlertFeed } from '../../components/dashboard/alert-feed'
import { BrandsGrid } from '../../components/dashboard/brands-grid'
import { PlatformKPIsGrid, SecondaryMetrics } from '../../components/dashboard/platform-kpis'
import type { PaginatedBrands, PlatformAlert, PlatformKPIs } from '../../types/platform'

// Refresh interval for KPIs (30 seconds)
const KPI_REFRESH_INTERVAL = 30000

/**
 * Orchestrator Overview Dashboard
 *
 * Displays:
 * - Platform KPIs grid (6 key metrics)
 * - Secondary metrics row
 * - Brands grid with pagination
 * - Real-time alert feed
 */
export default function OverviewPage() {
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null)
  const [kpisLoading, setKpisLoading] = useState(true)
  const [brands, setBrands] = useState<PaginatedBrands | null>(null)
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [brandsPage, setBrandsPage] = useState(1)
  const [alerts, setAlerts] = useState<PlatformAlert[]>([])

  // Fetch KPIs
  const fetchKPIs = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/overview')
      if (response.ok) {
        const result = await response.json()
        setKpis(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch KPIs:', error)
    } finally {
      setKpisLoading(false)
    }
  }, [])

  // Fetch brands
  const fetchBrands = useCallback(async (page: number) => {
    setBrandsLoading(true)
    try {
      const response = await fetch(`/api/platform/overview/brands?page=${page}&pageSize=8`)
      if (response.ok) {
        const result = await response.json()
        setBrands(result)
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error)
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  // Fetch initial alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/alerts?limit=20')
      if (response.ok) {
        const result = await response.json()
        setAlerts(result.alerts)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchKPIs()
    fetchBrands(1)
    fetchAlerts()
  }, [fetchKPIs, fetchBrands, fetchAlerts])

  // Set up KPI refresh interval
  useEffect(() => {
    const interval = setInterval(fetchKPIs, KPI_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchKPIs])

  // Handle page change for brands grid
  const handlePageChange = useCallback(
    (page: number) => {
      setBrandsPage(page)
      fetchBrands(page)
    },
    [fetchBrands]
  )

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground">
          Monitor platform health, brands, and key metrics at a glance.
        </p>
      </div>

      {/* Primary KPIs */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Key Metrics
        </h2>
        {kpis ? (
          <PlatformKPIsGrid data={kpis} isLoading={kpisLoading} />
        ) : (
          <PlatformKPIsGrid
            data={getDefaultKPIs()}
            isLoading={true}
          />
        )}
      </section>

      {/* Secondary Metrics */}
      {kpis && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            System Health
          </h2>
          <SecondaryMetrics data={kpis} />
        </section>
      )}

      {/* Main content grid: Brands + Alerts */}
      <div className="grid gap-8 xl:grid-cols-[1fr,350px]">
        {/* Brands grid */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Brands
            </h2>
            <a
              href="/brands"
              className="text-sm text-primary hover:underline"
            >
              View all
            </a>
          </div>
          {brands ? (
            <BrandsGrid
              data={brands}
              page={brandsPage}
              onPageChange={handlePageChange}
              isLoading={brandsLoading}
            />
          ) : (
            <BrandsGrid
              data={getEmptyBrands()}
              page={1}
              onPageChange={() => {}}
              isLoading={true}
            />
          )}
        </section>

        {/* Alert feed */}
        <section className="hidden xl:block">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Recent Alerts
          </h2>
          <AlertFeed
            initialAlerts={alerts}
            maxAlerts={50}
            className="h-[600px]"
          />
        </section>
      </div>

      {/* Mobile alert feed */}
      <section className="xl:hidden">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Recent Alerts
        </h2>
        <AlertFeed
          initialAlerts={alerts}
          maxAlerts={20}
          className="h-[400px]"
        />
      </section>
    </div>
  )
}

/**
 * Default KPIs for loading state
 */
function getDefaultKPIs(): PlatformKPIs {
  return {
    totalGMV: { value: 0, change: 0 },
    platformMRR: { value: 0, change: 0 },
    totalBrands: 0,
    activeBrands: 0,
    systemStatus: 'healthy',
    openAlerts: { p1: 0, p2: 0, p3: 0 },
    errorRate24h: 0,
    avgLatency: 0,
    uptimePercent: 99.99,
    pendingJobs: 0,
    failedJobs24h: 0,
  }
}

/**
 * Empty brands for loading state
 */
function getEmptyBrands(): PaginatedBrands {
  return {
    brands: [],
    total: 0,
    page: 1,
    pageSize: 8,
    totalPages: 0,
  }
}
