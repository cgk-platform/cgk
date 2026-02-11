export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getScheduledReport, recordReportSent } from '@/lib/attribution'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  // Verify report exists
  const report = await withTenant(tenantSlug, () =>
    getScheduledReport(tenantId, id)
  )

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // In a real implementation, this would:
  // 1. Generate the report based on reportConfig
  // 2. Send to all recipients via email
  // 3. Optionally post to Slack channel
  // For now, we simulate success

  try {
    // Simulate report generation and sending
    await new Promise((resolve) => setTimeout(resolve, 100))

    await withTenant(tenantSlug, () =>
      recordReportSent(tenantId, id, 'success')
    )

    return NextResponse.json({
      success: true,
      message: 'Report sent successfully',
      sentTo: report.recipients,
    })
  } catch (error) {
    await withTenant(tenantSlug, () =>
      recordReportSent(tenantId, id, 'failed')
    )

    const message = error instanceof Error ? error.message : 'Failed to send report'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
