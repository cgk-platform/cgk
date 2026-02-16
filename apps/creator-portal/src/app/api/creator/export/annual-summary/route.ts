/**
 * Creator Export - Annual Summary API Route
 *
 * POST /api/creator/export/annual-summary - Generate annual earnings summary
 * Returns JSON data suitable for PDF rendering on the client
 */

import { sql } from '@cgk-platform/db'

import { loadBrandMemberships, requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Get month name from date
 */
function getMonthName(monthIndex: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return months[monthIndex] ?? 'Unknown'
}

/**
 * Generate annual summary data
 */
export async function POST(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => {
      // Empty body is valid - year will default to last year
      return {}
    })
    const { year } = body as { year?: number }

    const targetYear = year || new Date().getFullYear() - 1 // Default to last year
    const yearStart = new Date(targetYear, 0, 1)
    const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59)

    // Get creator info
    const creatorResult = await sql`
      SELECT
        first_name,
        last_name,
        email,
        tax_id_last_four,
        legal_name,
        legal_address
      FROM creators
      WHERE id = ${context.creatorId}
    `
    const creator = creatorResult.rows[0] || {}

    // Get total earnings by type
    const totalsResult = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN type = 'commission' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as commissions,
        COALESCE(SUM(CASE WHEN type = 'project' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as projects,
        COALESCE(SUM(CASE WHEN type = 'bonus' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as bonuses,
        COALESCE(SUM(CASE WHEN type = 'adjustment' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as adjustments,
        COALESCE(SUM(CASE WHEN amount_cents < 0 THEN ABS(amount_cents) ELSE 0 END), 0) as withdrawals
      FROM balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${yearStart.toISOString()}
        AND created_at <= ${yearEnd.toISOString()}
    `
    const totals = totalsResult.rows[0] || {}

    // Get monthly breakdown
    const monthlyResult = await sql`
      SELECT
        EXTRACT(MONTH FROM created_at) as month,
        SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) as earnings,
        SUM(CASE WHEN type = 'commission' AND amount_cents > 0 THEN amount_cents ELSE 0 END) as commissions,
        SUM(CASE WHEN type = 'project' AND amount_cents > 0 THEN amount_cents ELSE 0 END) as projects,
        SUM(CASE WHEN type = 'bonus' AND amount_cents > 0 THEN amount_cents ELSE 0 END) as bonuses
      FROM balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${yearStart.toISOString()}
        AND created_at <= ${yearEnd.toISOString()}
      GROUP BY EXTRACT(MONTH FROM created_at)
      ORDER BY month
    `

    // Build monthly breakdown array (all 12 months)
    const monthlyBreakdown = []
    for (let m = 0; m < 12; m++) {
      const monthData = monthlyResult.rows.find((r) => parseInt(String(r.month), 10) === m + 1)
      monthlyBreakdown.push({
        month: getMonthName(m),
        earningsCents: monthData ? parseInt(String(monthData.earnings || 0), 10) : 0,
        commissionsCents: monthData ? parseInt(String(monthData.commissions || 0), 10) : 0,
        projectsCents: monthData ? parseInt(String(monthData.projects || 0), 10) : 0,
        bonusesCents: monthData ? parseInt(String(monthData.bonuses || 0), 10) : 0,
      })
    }

    // Get payout history for the year
    const payoutsResult = await sql`
      SELECT
        completed_at,
        net_amount_cents,
        method,
        status
      FROM payouts
      WHERE creator_id = ${context.creatorId}
        AND completed_at >= ${yearStart.toISOString()}
        AND completed_at <= ${yearEnd.toISOString()}
        AND status = 'completed'
      ORDER BY completed_at
    `

    const payouts = payoutsResult.rows.map((row) => ({
      date: row.completed_at,
      amountCents: parseInt(String(row.net_amount_cents), 10),
      method: row.method,
    }))

    // Get brand breakdown
    const memberships = await loadBrandMemberships(context.creatorId)

    // Generate summary document data
    const generatedAt = new Date().toISOString()
    const documentId = `annual-${targetYear}-${context.creatorId}-${Date.now()}`

    const summary = {
      documentId,
      generatedAt,
      year: targetYear,
      creator: {
        name:
          creator.legal_name ||
          `${creator.first_name || ''} ${creator.last_name || ''}`.trim() ||
          context.name,
        email: creator.email || context.email,
        taxIdLastFour: creator.tax_id_last_four,
        address: creator.legal_address,
      },
      totals: {
        totalEarnedCents: parseInt(String(totals.total_earned || 0), 10),
        commissionsCents: parseInt(String(totals.commissions || 0), 10),
        projectsCents: parseInt(String(totals.projects || 0), 10),
        bonusesCents: parseInt(String(totals.bonuses || 0), 10),
        adjustmentsCents: parseInt(String(totals.adjustments || 0), 10),
        withdrawalsCents: parseInt(String(totals.withdrawals || 0), 10),
      },
      monthlyBreakdown,
      payouts,
      brands: memberships.map((m) => ({
        name: m.brandName,
        commissionPercent: m.commissionPercent,
        lifetimeEarningsCents: m.lifetimeEarningsCents,
      })),
      taxInfo: {
        threshold1099Cents: 60000,
        meets1099Threshold: parseInt(String(totals.total_earned || 0), 10) >= 60000,
        reportableIncomeCents: parseInt(String(totals.total_earned || 0), 10),
      },
    }

    return Response.json(summary)
  } catch (error) {
    console.error('Error generating annual summary:', error)
    return Response.json({ error: 'Failed to generate annual summary' }, { status: 500 })
  }
}
