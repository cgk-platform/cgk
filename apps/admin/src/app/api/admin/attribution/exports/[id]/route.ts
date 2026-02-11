export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getExportConfiguration,
  updateExportConfiguration,
  deleteExportConfiguration,
  type ExportConfigurationUpdate,
} from '@/lib/attribution'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const exportConfig = await withTenant(tenantSlug, () =>
    getExportConfiguration(tenantId, id)
  )

  if (!exportConfig) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 })
  }

  return NextResponse.json({ export: exportConfig })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  let body: ExportConfigurationUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const exportConfig = await withTenant(tenantSlug, () =>
    updateExportConfiguration(tenantId, id, body)
  )

  if (!exportConfig) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 })
  }

  return NextResponse.json({ export: exportConfig })
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const deleted = await withTenant(tenantSlug, () =>
    deleteExportConfiguration(tenantId, id)
  )

  if (!deleted) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
