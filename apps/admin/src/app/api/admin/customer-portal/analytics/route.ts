import { headers } from 'next/headers'

import { getPortalAnalytics, getRecentImpersonationSessions } from '@/lib/customer-portal/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/customer-portal/analytics
 * Get portal analytics summary for a date range
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(request.url)
  const startParam = url.searchParams.get('start')
  const endParam = url.searchParams.get('end')
  const includeAuditLog = url.searchParams.get('includeAuditLog') === 'true'

  // Default to last 30 days
  const end = endParam ? new Date(endParam) : new Date()
  const start = startParam ? new Date(startParam) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: 'Invalid date format' }, { status: 400 })
  }

  if (start > end) {
    return Response.json({ error: 'Start date must be before end date' }, { status: 400 })
  }

  const summary = await getPortalAnalytics(tenantSlug, start, end)

  // Optionally include audit log of impersonation sessions
  let auditLog = null
  if (includeAuditLog) {
    auditLog = await getRecentImpersonationSessions(tenantSlug, 50)
  }

  return Response.json({
    summary,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    auditLog,
  })
}
