'use client'

/**
 * Contractor Dashboard Page
 *
 * Displays stats, quick actions, and recent activity for contractors.
 */

import { useEffect, useState } from 'react'
import { Spinner } from '@cgk-platform/ui'

import type { ContractorDashboardStats } from '@/lib/types'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

interface DashboardData {
  contractor: {
    id: string
    name: string
    email: string
  }
  stats: ContractorDashboardStats
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/contractor/dashboard')
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load dashboard')
        }
        const dashboardData = await response.json()
        setData(dashboardData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data) {
    return <div>No data available</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {data.contractor.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's an overview of your work.
        </p>
      </div>

      {/* Stats */}
      <DashboardStats stats={data.stats} />

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <QuickActions />
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        <RecentActivity />
      </section>
    </div>
  )
}
