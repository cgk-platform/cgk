export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  getReport,
  updateReport,
  deleteReport,
  type ReportFrequency,
  type DateRangeType,
  type ReportMetricConfig,
} from '@cgk-platform/slack'

/**
 * GET /api/admin/notifications/slack/reports/[id]
 * Gets a specific report
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const report = await getReport(tenantSlug, id)

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Failed to get Slack report:', error)
    return NextResponse.json(
      { error: 'Failed to get report' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/admin/notifications/slack/reports/[id]
 * Updates a report
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<{
    name: string
    channelId: string
    channelName: string
    frequency: ReportFrequency
    sendHour: number
    timezone: string
    metrics: ReportMetricConfig[]
    dateRangeType: DateRangeType
    dateRangeDays: number
    customHeader: string
    isEnabled: boolean
  }>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate sendHour if provided
  if (body.sendHour !== undefined && (body.sendHour < 0 || body.sendHour > 23)) {
    return NextResponse.json({ error: 'sendHour must be 0-23' }, { status: 400 })
  }

  // Validate frequency if provided
  if (body.frequency && !['daily', 'weekly', 'monthly'].includes(body.frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
  }

  try {
    const report = await updateReport(tenantSlug, id, body)

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Failed to update Slack report:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/admin/notifications/slack/reports/[id]
 * Deletes a report
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const deleted = await deleteReport(tenantSlug, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete Slack report:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 },
    )
  }
}
