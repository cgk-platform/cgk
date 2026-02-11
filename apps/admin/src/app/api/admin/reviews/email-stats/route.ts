export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getEmailStats } from '@/lib/reviews/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const dateFrom = url.searchParams.get('dateFrom') || undefined
  const dateTo = url.searchParams.get('dateTo') || undefined

  const stats = await getEmailStats(tenantSlug, dateFrom, dateTo)

  return NextResponse.json({ stats })
}
