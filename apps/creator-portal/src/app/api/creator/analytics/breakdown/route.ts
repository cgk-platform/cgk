/**
 * Creator Analytics - Breakdown API Route
 *
 * GET /api/creator/analytics/breakdown - Fetch earnings breakdown by type, brand, and time
 */

import { sql, withTenant } from '@cgk-platform/db'

import { loadBrandMemberships, requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'

/**
 * Valid period options
 */
type PeriodOption = 'week' | 'month' | 'last_month' | 'year' | 'last_year' | 'all' | 'custom'

/**
 * Get date range for a period
 */
function getDateRange(period: PeriodOption, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  let start: Date

  switch (period) {
    case 'week':
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end.setDate(0)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      break
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1)
      end.setFullYear(now.getFullYear() - 1, 11, 31)
      break
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate required for custom period')
      }
      start = new Date(startDate)
      return { start, end: new Date(endDate) }
    case 'all':
    default:
      start = new Date('2020-01-01')
      break
  }

  return { start, end }
}

/**
 * Fetch breakdown data
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const period = (url.searchParams.get('period') || 'year') as PeriodOption
    const startDateParam = url.searchParams.get('startDate') || undefined
    const endDateParam = url.searchParams.get('endDate') || undefined

    const { start, end } = getDateRange(period, startDateParam, endDateParam)

    // Get breakdown by type
    const byTypeResult = await sql`
      SELECT
        type,
        SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) as total_cents,
        COUNT(*) FILTER (WHERE amount_cents > 0) as transaction_count
      FROM public.creator_balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${start.toISOString()}
        AND created_at <= ${end.toISOString()}
      GROUP BY type
      ORDER BY total_cents DESC
    `

    // Get monthly breakdown
    const monthlyResult = await sql`
      SELECT
        date_trunc('month', created_at) as month,
        SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) as earnings,
        SUM(CASE WHEN amount_cents < 0 THEN ABS(amount_cents) ELSE 0 END) as withdrawals
      FROM public.creator_balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${start.toISOString()}
        AND created_at <= ${end.toISOString()}
      GROUP BY date_trunc('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `

    // Get brand memberships (needed for tenant-scoped queries and brand breakdown)
    const memberships = await loadBrandMemberships(context.creatorId)

    // Get top performing promo codes across all brands (commissions is tenant-scoped)
    const allPromoRows: Record<string, unknown>[] = []
    for (const m of memberships) {
      try {
        const result = await withTenant(m.brandSlug, async () => {
          return sql`
            SELECT
              promo_code,
              COUNT(*) as order_count,
              SUM(net_sales_cents) as total_sales_cents,
              SUM(commission_cents) as total_commission_cents
            FROM commissions
            WHERE creator_id = ${context.creatorId}
              AND order_date >= ${start.toISOString()}
              AND order_date <= ${end.toISOString()}
              AND promo_code IS NOT NULL
            GROUP BY promo_code
          `
        })
        allPromoRows.push(...result.rows)
      } catch {
        // Tenant may not have commissions table yet
      }
    }

    // Aggregate promo code stats across brands and take top 5
    const promoMap = new Map<string, { orderCount: number; salesCents: number; commissionCents: number }>()
    for (const row of allPromoRows) {
      const code = row.promo_code as string
      const existing = promoMap.get(code) || { orderCount: 0, salesCents: 0, commissionCents: 0 }
      existing.orderCount += parseInt(String(row.order_count || 0), 10)
      existing.salesCents += parseInt(String(row.total_sales_cents || 0), 10)
      existing.commissionCents += parseInt(String(row.total_commission_cents || 0), 10)
      promoMap.set(code, existing)
    }
    const topPromoCodesResult = { rows: [...promoMap.entries()]
      .sort((a, b) => b[1].commissionCents - a[1].commissionCents)
      .slice(0, 5)
      .map(([code, stats]) => ({
        promo_code: code,
        order_count: stats.orderCount,
        total_sales_cents: stats.salesCents,
        total_commission_cents: stats.commissionCents,
      }))
    }

    // Get brand breakdown from memberships (already loaded above)
    const byBrand = memberships.map((m) => ({
      brandId: m.brandId,
      brandName: m.brandName,
      balanceCents: m.balanceCents,
      pendingCents: m.pendingCents,
      lifetimeEarningsCents: m.lifetimeEarningsCents,
      activeProjects: m.activeProjectsCount,
    }))

    // Transform results
    const byType = byTypeResult.rows.map((row) => ({
      type: row.type,
      totalCents: parseInt(String(row.total_cents || 0), 10),
      transactionCount: parseInt(String(row.transaction_count || 0), 10),
    }))

    const totalEarnings = byType.reduce((sum, t) => sum + t.totalCents, 0)

    // Add percentages to breakdown
    const byTypeWithPercent = byType.map((t) => ({
      ...t,
      percentage: totalEarnings > 0 ? Math.round((t.totalCents / totalEarnings) * 100) : 0,
    }))

    const monthly = monthlyResult.rows.map((row) => ({
      month: row.month,
      earningsCents: parseInt(String(row.earnings || 0), 10),
      withdrawalsCents: parseInt(String(row.withdrawals || 0), 10),
    }))

    const topPromoCodes = topPromoCodesResult.rows.map((row) => ({
      code: row.promo_code,
      orderCount: parseInt(String(row.order_count || 0), 10),
      totalSalesCents: parseInt(String(row.total_sales_cents || 0), 10),
      commissionCents: parseInt(String(row.total_commission_cents || 0), 10),
    }))

    return Response.json({
      period: {
        type: period,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      byType: byTypeWithPercent,
      byBrand,
      monthly: monthly.reverse(), // Chronological order
      topPromoCodes,
      totals: {
        earningsCents: totalEarnings,
        brandCount: byBrand.length,
        promoCodeCount: topPromoCodes.length,
      },
    })
  } catch (error) {
    logger.error('Error fetching breakdown data:', error)
    return Response.json({ error: 'Failed to fetch breakdown data' }, { status: 500 })
  }
}
