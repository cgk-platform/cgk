export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getJourneyById } from '@/lib/attribution'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const journey = await withTenant(tenantSlug, () => getJourneyById(tenantId, id))

  if (!journey) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 404 })
  }

  return NextResponse.json({ journey })
}
