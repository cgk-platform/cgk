export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getApplicationFunnel,
  getCreatorHealth,
  getEarningsAnalytics,
  getPerformanceLeaderboard,
} from '@/lib/creators/analytics'
import type {
  AnalyticsPeriod,
  ExportFormat,
  ExportReportType,
} from '@/lib/creators/analytics-types'

const VALID_PERIODS = ['7d', '30d', '90d', '12m', 'all'] as const
const VALID_TYPES = ['funnel', 'performance', 'earnings', 'health', 'all'] as const
const VALID_FORMATS = ['csv', 'xlsx'] as const

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function arrayToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''

  const firstRow = data[0]
  if (!firstRow) return ''

  const headers = Object.keys(firstRow)
  const headerRow = headers.map(escapeCSVField).join(',')
  const dataRows = data.map(row =>
    headers.map(h => escapeCSVField(row[h])).join(',')
  )

  return [headerRow, ...dataRows].join('\n')
}

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const typeParam = url.searchParams.get('type') || 'all'
  const formatParam = url.searchParams.get('format') || 'csv'
  const periodParam = url.searchParams.get('period') || '30d'

  const reportType: ExportReportType = VALID_TYPES.includes(typeParam as ExportReportType)
    ? (typeParam as ExportReportType)
    : 'all'

  const format: ExportFormat = VALID_FORMATS.includes(formatParam as ExportFormat)
    ? (formatParam as ExportFormat)
    : 'csv'

  const period: AnalyticsPeriod = VALID_PERIODS.includes(periodParam as AnalyticsPeriod)
    ? (periodParam as AnalyticsPeriod)
    : '30d'

  try {
    let csvContent = ''
    const timestamp = new Date().toISOString().split('T')[0]

    if (reportType === 'funnel' || reportType === 'all') {
      const funnel = await getApplicationFunnel(tenantSlug, period)
      const funnelData = funnel.stages.map(stage => ({
        Stage: stage.name,
        Count: stage.count,
        'Conversion Rate (%)': stage.conversionRate.toFixed(1),
        'Drop-off Rate (%)': stage.dropOffRate.toFixed(1),
        'Avg Days in Stage': stage.avgTimeInStage,
      }))
      csvContent += '# Application Funnel Report\n'
      csvContent += `# Period: ${period}\n`
      csvContent += `# Generated: ${timestamp}\n\n`
      csvContent += arrayToCSV(funnelData)
      csvContent += '\n\n'
    }

    if (reportType === 'performance' || reportType === 'all') {
      const leaderboard = await getPerformanceLeaderboard(tenantSlug, 'earnings', period, 50)
      const perfData = leaderboard.entries.map(entry => ({
        Rank: entry.rank,
        Name: entry.creatorName,
        Tier: entry.tier || 'N/A',
        Earnings: entry.formattedValue,
      }))
      csvContent += '# Performance Leaderboard (Top Earners)\n'
      csvContent += `# Period: ${period}\n`
      csvContent += `# Generated: ${timestamp}\n\n`
      csvContent += arrayToCSV(perfData)
      csvContent += '\n\n'
    }

    if (reportType === 'earnings' || reportType === 'all') {
      const earnings = await getEarningsAnalytics(tenantSlug, period)
      const earningsData = [
        { Metric: 'Total Payouts', Value: `$${earnings.totalPayouts.toLocaleString()}` },
        { Metric: 'Total Pending', Value: `$${earnings.totalPending.toLocaleString()}` },
        { Metric: 'Avg Earnings per Creator', Value: `$${earnings.avgEarningsPerCreator.toLocaleString()}` },
        { Metric: 'Median Earnings', Value: `$${earnings.medianEarnings.toLocaleString()}` },
        { Metric: 'ROAS', Value: `${earnings.roas.toFixed(2)}x` },
      ]
      csvContent += '# Earnings Summary\n'
      csvContent += `# Period: ${period}\n`
      csvContent += `# Generated: ${timestamp}\n\n`
      csvContent += arrayToCSV(earningsData)

      // Add distribution
      csvContent += '\n\n# Earnings Distribution\n'
      const distData = earnings.distribution.map(b => ({
        Bracket: b.label,
        Count: b.count,
        'Percentage (%)': b.percentage.toFixed(1),
      }))
      csvContent += arrayToCSV(distData)
      csvContent += '\n\n'
    }

    if (reportType === 'health' || reportType === 'all') {
      const health = await getCreatorHealth(tenantSlug)
      const healthData = [
        { Category: 'Champions', Count: health.distribution.champions },
        { Category: 'Healthy', Count: health.distribution.healthy },
        { Category: 'At Risk', Count: health.distribution.at_risk },
        { Category: 'Inactive', Count: health.distribution.inactive },
        { Category: 'Churned', Count: health.distribution.churned },
      ]
      csvContent += '# Creator Health Distribution\n'
      csvContent += `# Generated: ${timestamp}\n\n`
      csvContent += arrayToCSV(healthData)

      // Add at-risk creators
      if (health.atRiskCreators.length > 0) {
        csvContent += '\n\n# At-Risk Creators\n'
        const atRiskData = health.atRiskCreators.map(c => ({
          Name: c.creatorName,
          Email: c.email,
          'Health Score': c.score,
          Indicators: c.indicators.join('; '),
        }))
        csvContent += arrayToCSV(atRiskData)
      }
    }

    // For now, we only support CSV export
    // XLSX support can be added with a library like xlsx
    if (format === 'xlsx') {
      return NextResponse.json(
        { error: 'XLSX export not yet implemented. Please use CSV format.' },
        { status: 501 }
      )
    }

    const filename = `creator-analytics-${reportType}-${period}-${timestamp}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    )
  }
}
