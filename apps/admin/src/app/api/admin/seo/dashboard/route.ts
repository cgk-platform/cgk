export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getGSCConnection } from '@/lib/seo/google-search-console'
import { getKeywordStats } from '@/lib/seo/keyword-tracker'
import { getRedirectStats } from '@/lib/seo/redirects'
import { getAuditSummary } from '@/lib/seo/site-analyzer'
import { getContentGaps } from '@/lib/seo/content-gap'
import type { SEODashboardData } from '@/lib/seo/types'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Fetch all dashboard data in parallel
  const [gscConnection, keywordStats, redirectStats, auditSummary, contentGaps] =
    await withTenant(tenantSlug, () =>
      Promise.all([
        getGSCConnection(),
        getKeywordStats(),
        getRedirectStats(),
        getAuditSummary(),
        getContentGaps(),
      ])
    )

  const dashboardData: SEODashboardData = {
    gscConnection,
    keywordStats,
    redirectStats,
    auditSummary,
    contentGaps: contentGaps.slice(0, 10), // Top 10 gaps
  }

  return NextResponse.json(dashboardData)
}
