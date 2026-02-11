export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreatorActivity } from '@/lib/creators/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10) || 20))

  const activities = await getCreatorActivity(tenantSlug, id, limit)

  return NextResponse.json({ activities })
}
