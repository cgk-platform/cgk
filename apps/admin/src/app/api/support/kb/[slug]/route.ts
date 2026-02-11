export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPublicArticle, getRelatedArticles, incrementViewCount } from '@/lib/knowledge-base/db'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/support/kb/[slug] - Get a public KB article by slug
 *
 * Query parameters:
 * - includeRelated: If 'true', includes related articles (default false)
 * - trackView: If 'true', increments view count (default true)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { slug } = await params
  const url = new URL(request.url)
  const includeRelated = url.searchParams.get('includeRelated') === 'true'
  const trackView = url.searchParams.get('trackView') !== 'false'

  const article = await withTenant(tenantSlug, () => getPublicArticle(slug))

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // Increment view count in the background
  if (trackView) {
    withTenant(tenantSlug, () => incrementViewCount(article.id)).catch(() => {
      // Silently ignore view count errors
    })
  }

  // Get related articles if requested
  let related: Awaited<ReturnType<typeof getRelatedArticles>> = []
  if (includeRelated) {
    related = await withTenant(tenantSlug, () => getRelatedArticles(article.id, 5))
  }

  return NextResponse.json({
    article: {
      id: article.id,
      slug: article.slug,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: article.category,
      tags: article.tags,
      viewCount: article.viewCount,
      helpfulCount: article.helpfulCount,
      notHelpfulCount: article.notHelpfulCount,
      author: article.author ? { name: article.author.name } : null,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
    },
    related: related.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      category: r.category,
    })),
  })
}
