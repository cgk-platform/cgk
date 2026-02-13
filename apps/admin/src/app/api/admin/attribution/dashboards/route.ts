export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCustomDashboards,
  createCustomDashboard,
  type CustomDashboardCreate,
} from '@/lib/attribution'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 400 })
  }

  const dashboards = await withTenant(tenantSlug, () =>
    getCustomDashboards(tenantId, userId)
  )

  return NextResponse.json({ dashboards })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 400 })
  }

  let body: CustomDashboardCreate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || body.name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const dashboard = await withTenant(tenantSlug, () =>
      createCustomDashboard(tenantId, userId, body)
    )

    return NextResponse.json({ dashboard }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create dashboard'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
