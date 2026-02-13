'use client'

import { Spinner } from '@cgk-platform/ui'
import { useEffect, useState } from 'react'


import { BrandEarningsCard } from '@/components/dashboard/BrandEarningsCard'
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { GuidedTour } from '@/components/dashboard/GuidedTour'
import { QuickActions } from '@/components/dashboard/QuickActions'

interface DashboardData {
  creator: {
    id: string
    name: string
    email: string
    taxFormStatus: string
    onboardingCompleted: boolean
    guidedTourCompleted: boolean
    isFirstLogin: boolean
  }
  stats: {
    totalBalanceCents: number
    totalPendingCents: number
    totalLifetimeEarningsCents: number
    activeProjectsCount: number
    completedProjectsCount: number
    unreadMessagesCount: number
  }
  memberships: Array<{
    id: string
    brandId: string
    brandName: string
    brandSlug: string
    brandLogo: string | null
    status: 'active' | 'paused' | 'terminated' | 'pending'
    commissionPercent: number
    discountCode: string | null
    balanceCents: number
    pendingCents: number
    activeProjectsCount: number
    contractSigned: boolean
  }>
  alerts: {
    taxFormPending: boolean
    unsignedContractsCount: number
    showGuidedTour: boolean
  }
}

export default function DashboardPage(): React.JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/creator/dashboard')
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load dashboard')
        }
        const dashboardData = await response.json()
        setData(dashboardData)

        // Show guided tour for first-time users
        if (dashboardData.alerts.showGuidedTour) {
          setShowTour(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const handleTourComplete = async () => {
    setShowTour(false)
    // Mark tour as completed
    try {
      await fetch('/api/creator/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidedTourCompleted: true }),
      })
    } catch {
      // Ignore errors - tour completion is not critical
    }
  }

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
      {/* Guided Tour */}
      {showTour && (
        <GuidedTour
          creatorName={data.creator.name}
          onComplete={handleTourComplete}
          onDismiss={() => setShowTour(false)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {data.creator.name}</h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your activity across all brands
        </p>
      </div>

      {/* Alerts */}
      <DashboardAlerts
        taxFormPending={data.alerts.taxFormPending}
        unsignedContractsCount={data.alerts.unsignedContractsCount}
      />

      {/* Stats */}
      <DashboardStats {...data.stats} />

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <QuickActions />
      </div>

      {/* Brand Earnings */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Your Brands</h2>
        {data.memberships.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              No brand relationships yet. Once approved, your brands will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.memberships.map((membership) => (
              <BrandEarningsCard
                key={membership.id}
                {...membership}
                onViewDetails={() => {
                  // Navigate to brand detail page
                  window.location.href = `/brands/${membership.brandSlug}`
                }}
                onWithdraw={() => {
                  // Navigate to withdrawal page
                  window.location.href = `/earnings/withdraw?brand=${membership.brandId}`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
