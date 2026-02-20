/**
 * Creator Analytics - Trends API Route
 *
 * GET /api/creator/analytics/trends - Fetch time-series earnings data for charts
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Valid period options
 */
type PeriodOption = 'week' | 'month' | 'last_month' | 'year' | 'last_year' | 'all' | 'custom'

/**
 * Valid granularity options
 */
type Granularity = 'day' | 'week' | 'month'

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
 * Determine best granularity for a date range
 */
function determineGranularity(start: Date, end: Date, requestedGranularity?: Granularity): Granularity {
  if (requestedGranularity) return requestedGranularity

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 14) return 'day'
  if (diffDays <= 90) return 'week'
  return 'month'
}

/**
 * Get PostgreSQL date_trunc interval for granularity
 */
function getDateTruncInterval(granularity: Granularity): string {
  switch (granularity) {
    case 'day':
      return 'day'
    case 'week':
      return 'week'
    case 'month':
    default:
      return 'month'
  }
}

/**
 * Fetch trends data
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
    const requestedGranularity = url.searchParams.get('granularity') as Granularity | undefined

    const { start, end } = getDateRange(period, startDateParam, endDateParam)
    const granularity = determineGranularity(start, end, requestedGranularity)
    const interval = getDateTruncInterval(granularity)

    // Get earnings trend data
    const trendResult = await sql`
      SELECT
        date_trunc(${interval}, created_at) as period,
        SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) as earnings,
        SUM(CASE WHEN type = 'commission' AND amount_cents > 0 THEN amount_cents ELSE 0 END) as commissions,
        SUM(CASE WHEN type = 'project' AND amount_cents > 0 THEN amount_cents ELSE 0 END) as projects,
        SUM(CASE WHEN type = 'bonus' AND amount_cents > 0 THEN amount_cents ELSE 0 END) as bonuses,
        COUNT(*) FILTER (WHERE amount_cents > 0) as transaction_count
      FROM public.creator_balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${start.toISOString()}
        AND created_at <= ${end.toISOString()}
      GROUP BY date_trunc(${interval}, created_at)
      ORDER BY period ASC
    `

    // Get commission stats (orders, conversion) for the period
    const commissionStats = await sql`
      SELECT
        COUNT(*) as total_orders,
        SUM(net_sales_cents) as total_sales,
        AVG(net_sales_cents) as avg_order_value
      FROM commissions
      WHERE creator_id = ${context.creatorId}
        AND order_date >= ${start.toISOString()}
        AND order_date <= ${end.toISOString()}
    `

    // Get previous period comparison data
    const periodDurationMs = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - periodDurationMs)
    const prevEnd = new Date(start)

    const prevResult = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as earnings
      FROM public.creator_balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${prevStart.toISOString()}
        AND created_at < ${prevEnd.toISOString()}
    `

    const currentTotal = trendResult.rows.reduce(
      (sum, row) => sum + parseInt(String(row.earnings || 0), 10),
      0
    )
    const previousTotal = parseInt(String(prevResult.rows[0]?.earnings || 0), 10)
    const changePercent =
      previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0

    // Transform trend data for response
    const trendData = trendResult.rows.map((row) => ({
      period: row.period,
      totalCents: parseInt(String(row.earnings || 0), 10),
      commissionsCents: parseInt(String(row.commissions || 0), 10),
      projectsCents: parseInt(String(row.projects || 0), 10),
      bonusesCents: parseInt(String(row.bonuses || 0), 10),
      transactionCount: parseInt(String(row.transaction_count || 0), 10),
    }))

    const stats = commissionStats.rows[0] || {}

    return Response.json({
      period: {
        type: period,
        start: start.toISOString(),
        end: end.toISOString(),
        granularity,
      },
      trend: trendData,
      comparison: {
        currentPeriodCents: currentTotal,
        previousPeriodCents: previousTotal,
        changePercent,
        direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat',
      },
      performance: {
        totalOrders: parseInt(String(stats.total_orders || 0), 10),
        totalSalesCents: parseInt(String(stats.total_sales || 0), 10),
        avgOrderValueCents: Math.round(parseFloat(String(stats.avg_order_value || 0))),
      },
    })
  } catch (error) {
    console.error('Error fetching trends data:', error)
    return Response.json({ error: 'Failed to fetch trends data' }, { status: 500 })
  }
}
