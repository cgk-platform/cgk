export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCommissionConfig,
  upsertCommissionConfig,
  type CommissionConfig,
} from '@/lib/creators-admin-ops'

export async function GET(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can view commission config
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const config = await getCommissionConfig(tenantSlug)
    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error fetching commission config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission config' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can update commission config
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const body = (await request.json()) as Partial<CommissionConfig>
    const config = await upsertCommissionConfig(tenantSlug, body)

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error updating commission config:', error)
    return NextResponse.json(
      { error: 'Failed to update commission config' },
      { status: 500 }
    )
  }
}
