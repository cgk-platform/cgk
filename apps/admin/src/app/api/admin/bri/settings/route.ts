export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getBriSettings, saveBriSettings, getBriStats, getIntegrationStatus } from '@/lib/bri/db'

export async function GET() {
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
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()

  const settings = await saveBriSettings(tenantSlug, body)

  return NextResponse.json({ settings })
}
