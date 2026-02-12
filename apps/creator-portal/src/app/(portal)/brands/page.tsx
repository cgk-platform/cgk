'use client'

import { Badge, formatCurrency, Spinner } from '@cgk/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { BrandCard } from '@/components/brands/BrandCard'
import type { BrandMembership } from '@/lib/types'

interface BrandsData {
  memberships: BrandMembership[]
  stats: {
    totalBrands: number
    activeBrands: number
    totalBalanceCents: number
    totalPendingCents: number
    totalLifetimeEarningsCents: number
    totalActiveProjects: number
  }
}

/**
 * Brands List Page
 *
 * Displays all brand relationships for the creator with:
 * - Aggregate stats header
 * - Filterable brand grid
 * - Empty state for new creators
 */
export default function BrandsPage(): React.JSX.Element {
  const [data, setData] = useState<BrandsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'paused'>('all')

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/creator/brands')

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load brands')
        }

        const brandsData = await response.json()
        setData(brandsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load brands')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBrands()
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

  // Filter memberships
  const filteredMemberships =
    filter === 'all'
      ? data.memberships
      : data.memberships.filter((m) => m.status === filter)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Brands</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your brand relationships and earnings
        </p>
      </div>

      {/* Stats Summary */}
      {data.memberships.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Available"
            value={formatCurrency(data.stats.totalBalanceCents / 100)}
            variant="earnings"
          />
          <StatCard
            label="Pending"
            value={formatCurrency(data.stats.totalPendingCents / 100)}
            variant="pending"
          />
          <StatCard
            label="Active Brands"
            value={data.stats.activeBrands.toString()}
            subtitle={`of ${data.stats.totalBrands} total`}
          />
          <StatCard
            label="Active Projects"
            value={data.stats.totalActiveProjects.toString()}
          />
        </div>
      )}

      {/* Filter tabs */}
      {data.memberships.length > 0 && (
        <div className="flex items-center gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            count={data.memberships.length}
          >
            All
          </FilterButton>
          <FilterButton
            active={filter === 'active'}
            onClick={() => setFilter('active')}
            count={data.memberships.filter((m) => m.status === 'active').length}
          >
            Active
          </FilterButton>
          <FilterButton
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            count={data.memberships.filter((m) => m.status === 'pending').length}
          >
            Pending
          </FilterButton>
          <FilterButton
            active={filter === 'paused'}
            onClick={() => setFilter('paused')}
            count={data.memberships.filter((m) => m.status === 'paused').length}
          >
            Paused
          </FilterButton>
        </div>
      )}

      {/* Brand Grid */}
      {data.memberships.length === 0 ? (
        <EmptyState />
      ) : filteredMemberships.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">No brands match the selected filter</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMemberships.map((membership) => (
            <BrandCard key={membership.id} membership={membership} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Stat card component
 */
function StatCard({
  label,
  value,
  subtitle,
  variant = 'default',
}: {
  label: string
  value: string
  subtitle?: string
  variant?: 'default' | 'earnings' | 'pending'
}): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
          variant === 'earnings'
            ? 'text-green-600 dark:text-green-400'
            : variant === 'pending'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-foreground'
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

/**
 * Filter button component
 */
function FilterButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  count: number
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {children}
      <Badge
        variant={active ? 'secondary' : 'outline'}
        className="h-5 min-w-5 justify-center px-1 font-mono text-xs"
      >
        {count}
      </Badge>
    </button>
  )
}

/**
 * Empty state component
 */
function EmptyState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <BrandsIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No brand relationships yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Once you&apos;re approved as a creator for a brand, your relationships will appear here.
        You&apos;ll be able to track earnings, manage settings, and share your discount codes.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}

function BrandsIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
