export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { withTenant } from '@cgk-platform/db'

import { getCategories } from '@/lib/knowledge-base/db'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const categories = await withTenant(tenantSlug, () => getCategories())
    return NextResponse.json({ categories })
  } catch (err) {
    console.error('[kb/categories] GET error:', err)
    return NextResponse.json({ categories: [] })
  }
}
