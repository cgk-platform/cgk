export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getExportConfigurations,
  createExportConfiguration,
  type ExportConfigurationCreate,
} from '@/lib/attribution'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const exports = await withTenant(tenantSlug, () =>
    getExportConfigurations(tenantId)
  )

  return NextResponse.json({ exports })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: ExportConfigurationCreate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.name || body.name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!body.destinationType) {
    return NextResponse.json({ error: 'Destination type is required' }, { status: 400 })
  }

  if (!body.schedule) {
    return NextResponse.json({ error: 'Schedule is required' }, { status: 400 })
  }

  if (!body.tables || body.tables.length === 0) {
    return NextResponse.json({ error: 'At least one table is required' }, { status: 400 })
  }

  const exportConfig = await withTenant(tenantSlug, () =>
    createExportConfiguration(tenantId, body)
  )

  return NextResponse.json({ export: exportConfig }, { status: 201 })
}
