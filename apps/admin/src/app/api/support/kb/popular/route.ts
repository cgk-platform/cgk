export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPopularArticles } from '@/lib/knowledge-base/db'

/**
 * GET /api/support/kb/popular - Get popular KB articles
 *
 * Query parameters:
 * - limit: Max results (default 10, max 50)
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)))

  const articles = await withTenant(tenantSlug, () => getPopularArticles(limit))

  return NextResponse.json({
    articles: articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      viewCount: a.viewCount,
      helpfulCount: a.helpfulCount,
    })),
  })
}
