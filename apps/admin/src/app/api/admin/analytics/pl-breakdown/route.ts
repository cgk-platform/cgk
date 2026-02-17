/**
 * P&L Breakdown API
 *
 * GET /api/admin/analytics/pl-breakdown
 * Returns profit and loss breakdown with category drill-down
 */

import { getTenantContext } from '@cgk-platform/auth'

import { getPLBreakdown } from '@/lib/analytics'

// P&L breakdown only supports these period types (not 'weekly')
type PLPeriodType = 'daily' | 'monthly' | 'quarterly' | 'yearly'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const rawPeriodType = url.searchParams.get('periodType') || 'monthly'
  // Validate and default to 'monthly' if invalid period type for P&L
  const validPLPeriods: PLPeriodType[] = ['daily', 'monthly', 'quarterly', 'yearly']
  const periodType: PLPeriodType = validPLPeriods.includes(rawPeriodType as PLPeriodType)
    ? (rawPeriodType as PLPeriodType)
    : 'monthly'
  const periodStart = url.searchParams.get('periodStart') || getDefaultPeriodStart(periodType)

  // Try to get cached P&L data
  const data = await getPLBreakdown(tenantId, periodType, periodStart)

  // If no cached data, return null - no fallback to sample data
  if (!data) {
    return Response.json({ data: null })
  }

  return Response.json({ data })
}

function getDefaultPeriodStart(periodType: PLPeriodType): string {
  const now = new Date()

  if (periodType === 'monthly') {
    now.setDate(1)
  } else if (periodType === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3)
    now.setMonth(quarter * 3)
    now.setDate(1)
  } else if (periodType === 'yearly') {
    now.setMonth(0)
    now.setDate(1)
  }

  return now.toISOString().split('T')[0] ?? ''
}
