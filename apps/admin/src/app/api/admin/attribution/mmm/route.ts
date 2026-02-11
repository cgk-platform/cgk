export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getMMMModel, getMMMResults } from '@/lib/attribution'

export async function GET(_request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const model = await withTenant(tenantSlug, () => getMMMModel(tenantId))
  const results = await withTenant(tenantSlug, () => getMMMResults(tenantId))

  return NextResponse.json({ model, results })
}
