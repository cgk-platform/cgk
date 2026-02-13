/**
 * Creator Tax Summary API Route
 *
 * GET /api/creator/tax/summary - Fetch tax summary data including YTD earnings and W-9 status
 */

import { sql } from '@cgk-platform/db'

import { loadBrandMemberships, requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 1099 threshold is $600 USD
const THRESHOLD_1099_CENTS = 60000

/**
 * Fetch tax summary data
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
    const yearParam = url.searchParams.get('year')
    const currentYear = new Date().getFullYear()
    const year = yearParam ? parseInt(yearParam, 10) : currentYear

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    // Get YTD earnings (sum of positive balance transactions for the year)
    const ytdResult = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN type = 'commission' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as commissions,
        COALESCE(SUM(CASE WHEN type = 'project' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as projects,
        COALESCE(SUM(CASE WHEN type = 'bonus' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as bonuses
      FROM balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${yearStart.toISOString()}
        AND created_at <= ${yearEnd.toISOString()}
    `

    const ytd = ytdResult.rows[0] || {}
    const ytdTotalCents = parseInt(String(ytd.total_earned || 0), 10)

    // Get creator tax form status
    const creatorResult = await sql`
      SELECT
        tax_form_status,
        tax_classification,
        tax_form_submitted_at,
        tax_id_last_four,
        legal_name,
        legal_address
      FROM creators
      WHERE id = ${context.creatorId}
    `
    const creator = creatorResult.rows[0] || {}

    // Get annual summaries for the past 5 years
    const yearsToShow = 5
    const annualSummaries: Array<{
      year: number
      totalEarnedCents: number
      requires1099: boolean
      form1099Status: 'not_required' | 'pending' | 'filed' | 'sent'
    }> = []

    for (let y = currentYear; y > currentYear - yearsToShow; y--) {
      const yStart = new Date(y, 0, 1)
      const yEnd = new Date(y, 11, 31, 23, 59, 59)

      const yearResult = await sql`
        SELECT COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as total
        FROM balance_transactions
        WHERE creator_id = ${context.creatorId}
          AND created_at >= ${yStart.toISOString()}
          AND created_at <= ${yEnd.toISOString()}
      `
      const yearTotal = parseInt(String(yearResult.rows[0]?.total || 0), 10)

      if (yearTotal > 0) {
        const requires1099 = yearTotal >= THRESHOLD_1099_CENTS
        let form1099Status: 'not_required' | 'pending' | 'filed' | 'sent' = 'not_required'

        if (requires1099) {
          // Check if we're past the 1099 filing date (typically Jan 31 of following year)
          const filingDeadline = new Date(y + 1, 0, 31)
          const now = new Date()

          if (now > filingDeadline) {
            form1099Status = 'sent' // Assume sent after deadline
          } else if (y < currentYear) {
            form1099Status = 'filed' // Past year, assume filed
          } else {
            form1099Status = 'pending' // Current year, will be filed
          }
        }

        annualSummaries.push({
          year: y,
          totalEarnedCents: yearTotal,
          requires1099,
          form1099Status,
        })
      }
    }

    // Get quarterly breakdown for current year
    const quarters = [
      { name: 'Q1', start: new Date(year, 0, 1), end: new Date(year, 2, 31) },
      { name: 'Q2', start: new Date(year, 3, 1), end: new Date(year, 5, 30) },
      { name: 'Q3', start: new Date(year, 6, 1), end: new Date(year, 8, 30) },
      { name: 'Q4', start: new Date(year, 9, 1), end: new Date(year, 11, 31) },
    ]

    const quarterlyBreakdown: Array<{
      quarter: string
      totalCents: number
    }> = []

    for (const quarter of quarters) {
      const qResult = await sql`
        SELECT COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) as total
        FROM balance_transactions
        WHERE creator_id = ${context.creatorId}
          AND created_at >= ${quarter.start.toISOString()}
          AND created_at <= ${quarter.end.toISOString()}
      `
      quarterlyBreakdown.push({
        quarter: quarter.name,
        totalCents: parseInt(String(qResult.rows[0]?.total || 0), 10),
      })
    }

    // Determine W-9 status
    const w9Status = creator.tax_form_status || 'not_submitted'
    const needsW9 = ytdTotalCents >= THRESHOLD_1099_CENTS && w9Status !== 'approved'

    // Get brand memberships for multi-brand totals
    const memberships = await loadBrandMemberships(context.creatorId)
    const lifetimeTotal = memberships.reduce((sum, m) => sum + m.lifetimeEarningsCents, 0)

    return Response.json({
      year,
      ytd: {
        totalEarnedCents: ytdTotalCents,
        commissionsCents: parseInt(String(ytd.commissions || 0), 10),
        projectsCents: parseInt(String(ytd.projects || 0), 10),
        bonusesCents: parseInt(String(ytd.bonuses || 0), 10),
      },
      threshold1099Cents: THRESHOLD_1099_CENTS,
      meetsThreshold: ytdTotalCents >= THRESHOLD_1099_CENTS,
      progressToThreshold: Math.min(100, Math.round((ytdTotalCents / THRESHOLD_1099_CENTS) * 100)),
      w9: {
        status: w9Status,
        submittedAt: creator.tax_form_submitted_at,
        needsSubmission: needsW9,
        taxIdLastFour: creator.tax_id_last_four,
        taxClassification: creator.tax_classification,
      },
      annualSummaries,
      quarterlyBreakdown,
      lifetime: {
        totalEarnedCents: lifetimeTotal,
        brandCount: memberships.length,
      },
    })
  } catch (error) {
    console.error('Error fetching tax summary:', error)
    return Response.json({ error: 'Failed to fetch tax summary' }, { status: 500 })
  }
}
