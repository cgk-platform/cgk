export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCustomDashboard,
  updateCustomDashboard,
  deleteCustomDashboard,
  type CustomDashboardUpdate,
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

  const dashboard = await withTenant(tenantSlug, () =>
    getCustomDashboard(tenantId, id)
  )

  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  return NextResponse.json({ dashboard })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  let body: CustomDashboardUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const dashboard = await withTenant(tenantSlug, () =>
      updateCustomDashboard(tenantId, id, body)
    )

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    return NextResponse.json({ dashboard })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update dashboard'
    return NextResponse.json({ error: message }, { status: 400 })
  }
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
    deleteCustomDashboard(tenantId, id)
  )

  if (!deleted) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
