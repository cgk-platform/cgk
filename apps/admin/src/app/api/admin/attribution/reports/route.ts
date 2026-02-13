export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getScheduledReports,
  createScheduledReport,
  type ScheduledReportCreate,
} from '@/lib/attribution'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const reports = await withTenant(tenantSlug, () => getScheduledReports(tenantId))

  return NextResponse.json({ reports })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: ScheduledReportCreate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.name || body.name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!body.frequency) {
    return NextResponse.json({ error: 'Frequency is required' }, { status: 400 })
  }

  if (!body.scheduleConfig) {
    return NextResponse.json({ error: 'Schedule config is required' }, { status: 400 })
  }

  if (!body.recipients || body.recipients.length === 0) {
    return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 })
  }

  if (!body.reportConfig) {
    return NextResponse.json({ error: 'Report config is required' }, { status: 400 })
  }

  try {
    const report = await withTenant(tenantSlug, () =>
      createScheduledReport(tenantId, body)
    )

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create report'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
