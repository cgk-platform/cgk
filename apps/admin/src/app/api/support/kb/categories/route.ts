export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPublicCategories } from '@/lib/knowledge-base/db'

/**
 * GET /api/support/kb/categories - Get public KB categories
 *
 * Returns only categories that have at least one published article
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const categories = await withTenant(tenantSlug, () => getPublicCategories())

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      articleCount: c.articleCount,
    })),
  })
}
