export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAutonomySettings, saveAutonomySettings } from '@/lib/bri/db'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const data = await getAutonomySettings(tenantSlug)

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { settings, actions } = body

  await saveAutonomySettings(tenantSlug, settings, actions)

  return NextResponse.json({ success: true })
}
