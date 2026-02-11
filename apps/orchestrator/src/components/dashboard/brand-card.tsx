'use client'

import { Badge, Card, cn } from '@cgk/ui'
import Link from 'next/link'

import type { BrandSummary } from '../../types/platform'
import { StatusDot } from '../ui/status-dot'

interface BrandCardProps {
  /** Brand data */
  brand: BrandSummary
  /** Additional CSS classes */
  className?: string
}

/**
 * Format currency for display
 */
function formatRevenue(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

/**
 * Get initials from a brand name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

/**
 * Brand Card component for the brands grid
 *
 * Displays:
 * - Brand logo/initials
 * - Name and slug
 * - Status badge
 * - Health indicator
 * - 24h metrics (revenue, orders, errors)
 * - Integration badges
 */
export function BrandCard({ brand, className }: BrandCardProps) {
  const hasIssues = brand.health === 'unhealthy' || brand.errorCount24h > 10

  return (
    <Link href={`/brands/${brand.id}`} className="block">
      <Card
        className={cn(
          'group relative overflow-hidden p-4 transition-all hover:border-primary/50 hover:shadow-md',
          hasIssues && 'border-red-500/30',
          className
        )}
      >
        {/* Header: Logo, Name, Health */}
        <div className="flex items-start gap-3">
          {/* Logo / Initials */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={`${brand.name} logo`}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              getInitials(brand.name)
            )}
          </div>

          {/* Name & Slug */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold group-hover:text-primary">
                {brand.name}
              </h3>
              <StatusDot
                status={
                  brand.health === 'healthy'
                    ? 'healthy'
                    : brand.health === 'degraded'
                      ? 'degraded'
                      : 'unhealthy'
                }
                size="sm"
              />
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {brand.slug}
            </p>
          </div>

          {/* Status Badge */}
          <Badge
            variant={
              brand.status === 'active'
                ? 'success'
                : brand.status === 'paused'
                  ? 'secondary'
                  : 'info'
            }
            className="shrink-0"
          >
            {brand.status}
          </Badge>
        </div>

        {/* 24h Metrics */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-medium">{formatRevenue(brand.revenue24h)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Orders:</span>
            <span className="font-medium">{brand.orders24h}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Errors:</span>
            <span
              className={cn(
                'font-medium',
                brand.errorCount24h > 10
                  ? 'text-red-500'
                  : brand.errorCount24h > 5
                    ? 'text-yellow-500'
                    : ''
              )}
            >
              {brand.errorCount24h}
            </span>
          </div>
        </div>

        {/* Integration Badges */}
        <div className="mt-3 flex items-center gap-2">
          <IntegrationBadge
            name="Shopify"
            connected={brand.shopifyConnected}
          />
          <IntegrationBadge
            name="Stripe"
            connected={brand.stripeConnected}
          />
        </div>
      </Card>
    </Link>
  )
}

interface IntegrationBadgeProps {
  name: string
  connected: boolean
}

/**
 * Integration status badge
 */
function IntegrationBadge({ name, connected }: IntegrationBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        connected
          ? 'bg-green-500/10 text-green-500'
          : 'bg-muted text-muted-foreground/50'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          connected ? 'bg-green-500' : 'bg-muted-foreground/30'
        )}
      />
      {name}
    </span>
  )
}

/**
 * Loading skeleton for brand card
 */
export function BrandCardSkeleton() {
  return (
    <Card className="animate-pulse p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-5 w-14 rounded bg-muted" />
      </div>
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-4 w-14 rounded bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-14 rounded bg-muted" />
        <div className="h-5 w-12 rounded bg-muted" />
      </div>
    </Card>
  )
}
