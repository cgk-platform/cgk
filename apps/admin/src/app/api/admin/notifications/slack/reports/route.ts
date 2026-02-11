export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  getReports,
  createReport,
  type ReportFrequency,
  type DateRangeType,
  type ReportMetricConfig,
} from '@cgk/slack'

/**
 * GET /api/admin/notifications/slack/reports
 * Lists all scheduled reports
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const reports = await getReports(tenantSlug)
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Failed to get Slack reports:', error)
    return NextResponse.json(
      { error: 'Failed to get reports' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/notifications/slack/reports
 * Creates a new scheduled report
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    name: string
    channelId: string
    channelName?: string
    frequency: ReportFrequency
    sendHour: number
    timezone: string
    metrics: ReportMetricConfig[]
    dateRangeType?: DateRangeType
    dateRangeDays?: number
    customHeader?: string
    isEnabled?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validation
  if (!body.name || !body.channelId || !body.frequency || body.sendHour === undefined || !body.timezone || !body.metrics) {
    return NextResponse.json(
      { error: 'name, channelId, frequency, sendHour, timezone, and metrics are required' },
      { status: 400 },
    )
  }

  if (body.sendHour < 0 || body.sendHour > 23) {
    return NextResponse.json({ error: 'sendHour must be 0-23' }, { status: 400 })
  }

  if (!['daily', 'weekly', 'monthly'].includes(body.frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
  }

  try {
    const report = await createReport(tenantSlug, {
      name: body.name,
      channelId: body.channelId,
      channelName: body.channelName,
      frequency: body.frequency,
      sendHour: body.sendHour,
      timezone: body.timezone,
      metrics: body.metrics,
      dateRangeType: body.dateRangeType,
      dateRangeDays: body.dateRangeDays,
      customHeader: body.customHeader,
      isEnabled: body.isEnabled,
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Failed to create Slack report:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 },
    )
  }
}
