/**
 * E-Signature Reports API
 *
 * GET /api/admin/esign/reports - Get report data
 * GET /api/admin/esign/reports?export=csv - Export report as CSV
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { getReportData, exportReportCsv } from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)

    // Parse dates (default to last 30 days)
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date()

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const templateId = searchParams.get('templateId') || undefined
    const exportFormat = searchParams.get('export')

    const options = {
      startDate,
      endDate,
      templateId,
    }

    if (exportFormat === 'csv') {
      const csv = await exportReportCsv(auth.tenantId, options)

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="esign-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    const report = await getReportData(auth.tenantId, options)

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    )
  }
}
