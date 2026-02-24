import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft, TrendingUp, ShoppingCart, Tag, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, StatusBadge, cn } from '@cgk-platform/ui'
import { withTenant, sql } from '@cgk-platform/db'
import { formatMoney } from '@/lib/format'

export default async function BundleAnalyticsPage() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No tenant context available.</p>
      </div>
    )
  }

  const data = await withTenant(tenantSlug, async () => {
    const statsResult = await sql`
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(total_cents), 0)::bigint AS total_revenue,
        COALESCE(SUM(discount_cents), 0)::bigint AS total_discount,
        COALESCE(AVG(items_count), 0)::float AS avg_items
      FROM bundle_orders
    `

    const bundleCountResult = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active
      FROM bundles
    `

    const topBundlesResult = await sql`
      SELECT
        b.id, b.name, b.status, b.discount_type,
        COUNT(bo.id)::int AS order_count,
        COALESCE(SUM(bo.total_cents), 0)::bigint AS revenue,
        COALESCE(SUM(bo.discount_cents), 0)::bigint AS discount_given
      FROM bundles b
      LEFT JOIN bundle_orders bo ON bo.bundle_id = b.id
      GROUP BY b.id, b.name, b.status, b.discount_type
      ORDER BY revenue DESC
      LIMIT 10
    `

    const tierDistResult = await sql`
      SELECT
        tier_label,
        COUNT(*)::int AS count
      FROM bundle_orders
      WHERE tier_label IS NOT NULL
      GROUP BY tier_label
      ORDER BY count DESC
      LIMIT 10
    `

    const statsRow = (statsResult.rows[0] ?? {}) as Record<string, unknown>
    const bundleCountRow = (bundleCountResult.rows[0] ?? {}) as Record<string, unknown>

    return {
      stats: {
        totalOrders: Number(statsRow.total_orders ?? 0),
        totalRevenue: Number(statsRow.total_revenue ?? 0),
        totalDiscount: Number(statsRow.total_discount ?? 0),
        avgItems: Number(statsRow.avg_items ?? 0),
      },
      bundleCount: {
        total: Number(bundleCountRow.total ?? 0),
        active: Number(bundleCountRow.active ?? 0),
      },
      topBundles: topBundlesResult.rows.map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id ?? ''),
          name: String(r.name ?? ''),
          status: String(r.status ?? 'draft'),
          discountType: String(r.discount_type ?? ''),
          orderCount: Number(r.order_count ?? 0),
          revenue: Number(r.revenue ?? 0),
          discountGiven: Number(r.discount_given ?? 0),
        }
      }),
      tierDistribution: tierDistResult.rows.map((row) => {
        const r = row as Record<string, unknown>
        return {
          label: String(r.tier_label ?? ''),
          count: Number(r.count ?? 0),
        }
      }),
    }
  })

  const { stats, bundleCount, topBundles, tierDistribution } = data

  const kpiCards = [
    {
      label: 'Total Bundle Orders',
      value: stats.totalOrders.toLocaleString(),
      subtitle: `Across ${bundleCount.total} bundle${bundleCount.total === 1 ? '' : 's'}`,
      icon: ShoppingCart,
      isRevenue: false,
    },
    {
      label: 'Total Revenue',
      value: formatMoney(stats.totalRevenue),
      subtitle: 'Lifetime bundle revenue',
      icon: TrendingUp,
      isRevenue: true,
    },
    {
      label: 'Discounts Given',
      value: formatMoney(stats.totalDiscount),
      subtitle: 'Total discount amount applied',
      icon: Tag,
      isRevenue: false,
    },
    {
      label: 'Avg Items Per Bundle',
      value: stats.avgItems.toFixed(1),
      subtitle: 'Average items in bundle orders',
      icon: BarChart3,
      isRevenue: false,
    },
  ]

  const maxTierCount = Math.max(...tierDistribution.map((t) => t.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/commerce/bundles"
          className="rounded-lg p-2 text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bundle Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Aggregate performance across all bundle configurations
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card
              key={card.label}
              className={cn(
                'animate-fade-up transition-all duration-normal',
                card.isRevenue && 'ring-1 ring-gold/20 bg-gradient-to-br from-gold/5 to-transparent',
              )}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span>{card.label}</span>
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight">{card.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.subtitle}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Row */}
      <div
        className="grid gap-4 sm:grid-cols-2 animate-fade-up"
        style={{ animationDelay: '300ms' }}
      >
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Bundles</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{bundleCount.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Bundles</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{bundleCount.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Bundles Table */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: '375ms' }}
      >
        <CardHeader>
          <CardTitle>Top Bundles by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {topBundles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No bundle data available yet. Orders will appear here once bundles are purchased.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Bundle Name</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium text-right">Orders</th>
                    <th className="pb-3 pr-4 font-medium text-right">Revenue</th>
                    <th className="pb-3 font-medium text-right">Discounts</th>
                  </tr>
                </thead>
                <tbody>
                  {topBundles.map((bundle) => (
                    <tr
                      key={bundle.id}
                      className="border-b last:border-0 transition-colors duration-fast hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/commerce/bundles/${bundle.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {bundle.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={bundle.status} />
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {bundle.orderCount.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {formatMoney(bundle.revenue)}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatMoney(bundle.discountGiven)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Distribution */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: '450ms' }}
      >
        <CardHeader>
          <CardTitle>Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {tierDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No tier data available. Tier usage will appear here as orders come in.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tierDistribution.map((tier, index) => {
                const widthPercent = (tier.count / maxTierCount) * 100
                return (
                  <div
                    key={tier.label}
                    className="animate-fade-up"
                    style={{ animationDelay: `${525 + index * 75}ms` }}
                  >
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{tier.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {tier.count.toLocaleString()} order{tier.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-slow"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
