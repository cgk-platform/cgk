export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { searchArticles, getPublicArticlesByCategory } from '@/lib/knowledge-base/db'

/**
 * GET /api/support/kb - Search KB articles or get articles by category
 *
 * Query parameters:
 * - q: Search query (if provided, performs full-text search)
 * - categoryId: Filter by category ID
 * - limit: Max results (default 10, max 50)
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''
  const categoryId = url.searchParams.get('categoryId') || ''
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)))

  if (query) {
    // Full-text search
    const results = await withTenant(tenantSlug, () =>
      searchArticles(query, {
        includeInternal: false,
        categoryId: categoryId || undefined,
        limit,
      })
    )

    return NextResponse.json({
      results: results.map((r) => ({
        article: {
          id: r.article.id,
          slug: r.article.slug,
          title: r.article.title,
          excerpt: r.article.excerpt,
          category: r.article.category,
          viewCount: r.article.viewCount,
          helpfulCount: r.article.helpfulCount,
        },
        rank: r.rank,
      })),
      query,
    })
  }

  if (categoryId) {
    // Get articles by category
    const articles = await withTenant(tenantSlug, () =>
      getPublicArticlesByCategory(categoryId, limit)
    )

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

  return NextResponse.json(
    { error: 'Either q (search query) or categoryId is required' },
    { status: 400 },
  )
}
