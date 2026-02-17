'use client'

import { Badge, Button, Card, CardContent, CardHeader, cn, StatusDot } from '@cgk-platform/ui'
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Settings,
  ShoppingBag,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { BrandSummary } from '../../../../types/platform'

/**
 * Brand detail page
 *
 * Displays comprehensive information about a single brand including:
 * - Overview metrics
 * - Integration status
 * - Recent activity
 * - Configuration options
 */
export default function BrandDetailPage() {
  const params = useParams()
  const brandId = params.id as string

  const [brand, setBrand] = useState<BrandSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch brand details
  const fetchBrand = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // In production, this would call a dedicated brand detail endpoint
      const response = await fetch('/api/platform/overview/brands?pageSize=50')
      if (response.ok) {
        const result = await response.json()
        const foundBrand = result.brands.find(
          (b: BrandSummary) => b.id === brandId
        )
        if (foundBrand) {
          setBrand(foundBrand)
        } else {
          setError('Brand not found')
        }
      } else {
        setError('Failed to fetch brand')
      }
    } catch (err) {
      console.error('Failed to fetch brand:', err)
      setError('Failed to fetch brand')
    } finally {
      setIsLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchBrand()
  }, [fetchBrand])

  if (isLoading) {
    return <BrandDetailSkeleton />
  }

  if (error || !brand) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-muted-foreground">
          {error || 'Brand not found'}
        </p>
        <Link href="/brands">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Brands
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/brands">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-lg font-bold">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                brand.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{brand.name}</h1>
                <StatusDot status={brand.health} animate />
              </div>
              <p className="text-muted-foreground">{brand.slug}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              brand.status === 'active'
                ? 'success'
                : brand.status === 'paused'
                  ? 'secondary'
                  : 'info'
            }
          >
            {brand.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchBrand}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href={`/brands/${brandId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Revenue (24h)"
          value={formatCurrency(brand.revenue24h)}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <MetricCard
          title="Orders (24h)"
          value={brand.orders24h.toString()}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <MetricCard
          title="Errors (24h)"
          value={brand.errorCount24h.toString()}
          variant={
            brand.errorCount24h > 10
              ? 'destructive'
              : brand.errorCount24h > 5
                ? 'warning'
                : 'default'
          }
        />
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Integrations</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <IntegrationCard
              name="Shopify"
              connected={brand.shopifyConnected}
              description={
                brand.shopifyConnected
                  ? 'Connected and syncing'
                  : 'Not connected'
              }
            />
            <IntegrationCard
              name="Stripe"
              connected={brand.stripeConnected}
              description={
                brand.stripeConnected
                  ? 'Connected and processing payments'
                  : 'Not connected'
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Quick Actions</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Open admin portal for this brand
                // In production, use custom domain or pass tenant context
                const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL
                if (!adminUrl) {
                  console.error('NEXT_PUBLIC_ADMIN_URL not configured')
                  return
                }
                window.open(`${adminUrl}?tenant=${brand.slug}`, '_blank')
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Open storefront for this brand
                const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL
                if (!storefrontUrl) {
                  console.error('NEXT_PUBLIC_STOREFRONT_URL not configured')
                  return
                }
                window.open(`${storefrontUrl}?tenant=${brand.slug}`, '_blank')
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Storefront
            </Button>
            <Link href={`/ops/logs?tenant=${brand.slug}`}>
              <Button variant="outline" size="sm">
                View Logs
              </Button>
            </Link>
            <Link href={`/ops/errors?tenant=${brand.slug}`}>
              <Button variant="outline" size="sm">
                View Errors
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: string
  icon?: React.ReactNode
  variant?: 'default' | 'warning' | 'destructive'
}) {
  return (
    <Card
      className={cn(
        variant === 'warning' && 'border-yellow-500/50',
        variant === 'destructive' && 'border-red-500/50'
      )}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardContent>
    </Card>
  )
}

function IntegrationCard({
  name,
  connected,
  description,
}: {
  name: string
  connected: boolean
  description: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold',
            connected ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
          )}
        >
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <StatusDot status={connected ? 'healthy' : 'unhealthy'} />
    </div>
  )
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

function BrandDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
    </div>
  )
}
