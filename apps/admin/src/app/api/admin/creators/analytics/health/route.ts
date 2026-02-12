export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreatorHealth } from '@/lib/creators/analytics'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const health = await getCreatorHealth(tenantSlug)
    return NextResponse.json(health)
  } catch (error) {
    console.error('Error fetching creator health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health data' },
      { status: 500 }
    )
  }
}
