export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getBriSettings, saveBriSettings, getBriStats, getIntegrationStatus } from '@/lib/bri/db'

export async function GET(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can view BRI settings
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const [settings, stats, integrations] = await Promise.all([
    getBriSettings(tenantSlug),
    getBriStats(tenantSlug),
    getIntegrationStatus(tenantSlug),
  ])

  return NextResponse.json({ settings, stats, integrations })
}

export async function POST(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can update BRI settings
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()

  const settings = await saveBriSettings(tenantSlug, body)

  return NextResponse.json({ settings })
}
