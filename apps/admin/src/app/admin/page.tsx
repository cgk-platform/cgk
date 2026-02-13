import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { ActivityFeed, ActivityFeedSkeleton, type ActivityItem } from '@/components/admin/dashboard/activity-feed'
import { Escalations, EscalationsSkeleton, type EscalationData } from '@/components/admin/dashboard/escalations'
import { KpiCards, KpiCardsSkeleton, type KpiData } from '@/components/admin/dashboard/kpi-cards'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your store performance
        </p>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCardsLoader />
      </Suspense>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<EscalationsSkeleton />}>
          <EscalationsLoader />
        </Suspense>
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeedLoader />
        </Suspense>
      </div>
    </div>
  )
}

async function KpiCardsLoader() {
  const data = await getRevenueMetrics()
  return <KpiCards data={data} />
}

async function EscalationsLoader() {
  const data = await getEscalationCounts()
  return <Escalations data={data} />
}

async function ActivityFeedLoader() {
  const items = await getRecentActivity()
  return <ActivityFeed items={items} />
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function getRevenueMetrics(): Promise<KpiData> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return {
      revenueMtd: 0,
      revenueChange: 0,
      ordersToday: 0,
      ordersChange: 0,
      newCustomers: 0,
      customersChange: 0,
      activeSubscriptions: 0,
      subscriptionsChange: 0,
    }
  }

  return withTenant(tenantSlug, async () => {
    const ordersResult = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN total_amount ELSE 0 END), 0) as revenue_mtd,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as orders_today
      FROM orders
    `
    const row = ordersResult.rows[0] || {}

    const customersResult = await sql`
      SELECT COUNT(*) as count FROM customers
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `
    const newCustomers = Number(customersResult.rows[0]?.count || 0)

    return {
      revenueMtd: Number(row.revenue_mtd || 0),
      revenueChange: 0,
      ordersToday: Number(row.orders_today || 0),
      ordersChange: 0,
      newCustomers,
      customersChange: 0,
      activeSubscriptions: 0,
      subscriptionsChange: 0,
    }
  })
}

async function getEscalationCounts(): Promise<EscalationData> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return { pendingReviews: 0, failedPayouts: 0, unresolvedErrors: 0 }
  }

  return withTenant(tenantSlug, async () => {
    const reviewsResult = await sql`
      SELECT COUNT(*) as count FROM reviews WHERE status = 'pending'
    `
    const payoutsResult = await sql`
      SELECT COUNT(*) as count FROM payouts WHERE status = 'failed'
    `

    return {
      pendingReviews: Number(reviewsResult.rows[0]?.count || 0),
      failedPayouts: Number(payoutsResult.rows[0]?.count || 0),
      unresolvedErrors: 0,
    }
  })
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return []

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, 'order' as type,
        'Order #' || id::text || ' placed' as description,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `
    return result.rows.map((row) => ({
      id: String(row.id),
      type: row.type as string,
      description: row.description as string,
      timestamp: new Date(row.created_at as string).toLocaleString(),
    }))
  })
}
