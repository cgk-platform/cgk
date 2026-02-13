/**
 * Creator Analytics - Earnings API Route
 *
 * GET /api/creator/analytics/earnings - Fetch earnings data with period filtering
 */

import { sql } from '@cgk-platform/db'

import { loadBrandMemberships, requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Valid period options for earnings queries
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
      end.setDate(0) // Last day of previous month
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
      // All time - set start to a very early date
      start = new Date('2020-01-01')
      break
  }

  return { start, end }
}

/**
 * Fetch earnings data
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
    const period = (url.searchParams.get('period') || 'month') as PeriodOption
    const startDateParam = url.searchParams.get('startDate') || undefined
    const endDateParam = url.searchParams.get('endDate') || undefined

    const { start, end } = getDateRange(period, startDateParam, endDateParam)

    // Load brand memberships to get earnings per brand
    const memberships = await loadBrandMemberships(context.creatorId)

    // Get total earnings for period from balance_transactions
    const earningsResult = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN amount_cents < 0 THEN ABS(amount_cents) ELSE 0 END), 0) as total_withdrawn,
        COALESCE(SUM(CASE WHEN type = 'commission' THEN amount_cents ELSE 0 END), 0) as commission_earnings,
        COALESCE(SUM(CASE WHEN type = 'project' THEN amount_cents ELSE 0 END), 0) as project_earnings,
        COALESCE(SUM(CASE WHEN type = 'bonus' THEN amount_cents ELSE 0 END), 0) as bonus_earnings,
        COALESCE(SUM(CASE WHEN type = 'adjustment' THEN amount_cents ELSE 0 END), 0) as adjustment_earnings,
        COUNT(*) as transaction_count
      FROM balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${start.toISOString()}
        AND created_at <= ${end.toISOString()}
    `

    const earnings = earningsResult.rows[0] || {
      total_earned: 0,
      total_withdrawn: 0,
      commission_earnings: 0,
      project_earnings: 0,
      bonus_earnings: 0,
      adjustment_earnings: 0,
      transaction_count: 0,
    }

    // Get pending earnings (commissions with status = 'pending')
    const pendingResult = await sql`
      SELECT COALESCE(SUM(commission_cents), 0) as pending_commissions
      FROM commissions
      WHERE creator_id = ${context.creatorId}
        AND status = 'pending'
    `
    const pendingCents = parseInt(String(pendingResult.rows[0]?.pending_commissions || '0'), 10)

    // Calculate totals across all brands
    const totalBalanceCents = memberships.reduce((sum, m) => sum + m.balanceCents, 0)
    const totalPendingCents = memberships.reduce((sum, m) => sum + m.pendingCents, 0)
    const totalLifetimeEarningsCents = memberships.reduce((sum, m) => sum + m.lifetimeEarningsCents, 0)

    // Get best month all time
    const bestMonthResult = await sql`
      SELECT
        date_trunc('month', created_at) as month,
        SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) as total
      FROM balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND amount_cents > 0
      GROUP BY date_trunc('month', created_at)
      ORDER BY total DESC
      LIMIT 1
    `
    const bestMonth = bestMonthResult.rows[0] || null

    // Calculate average per month (for selected period)
    const monthsDiff = Math.max(
      1,
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
    )
    const avgPerMonthCents = Math.round(parseInt(String(earnings.total_earned), 10) / monthsDiff)

    return Response.json({
      period: {
        type: period,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalEarnedCents: parseInt(String(earnings.total_earned), 10),
        totalWithdrawnCents: parseInt(String(earnings.total_withdrawn), 10),
        pendingCommissionsCents: pendingCents,
        avgPerMonthCents,
        bestMonthCents: bestMonth ? parseInt(String(bestMonth.total), 10) : 0,
        bestMonthDate: bestMonth?.month || null,
        transactionCount: parseInt(String(earnings.transaction_count), 10),
      },
      balance: {
        availableCents: totalBalanceCents,
        pendingCents: totalPendingCents,
        lifetimeCents: totalLifetimeEarningsCents,
      },
      breakdown: {
        commissions: parseInt(String(earnings.commission_earnings), 10),
        projects: parseInt(String(earnings.project_earnings), 10),
        bonuses: parseInt(String(earnings.bonus_earnings), 10),
        adjustments: parseInt(String(earnings.adjustment_earnings), 10),
      },
    })
  } catch (error) {
    console.error('Error fetching earnings data:', error)
    return Response.json({ error: 'Failed to fetch earnings data' }, { status: 500 })
  }
}
