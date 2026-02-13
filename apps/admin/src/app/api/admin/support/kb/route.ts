export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getArticles, createArticle } from '@/lib/knowledge-base/db'
import type { ArticleFilters, CreateArticleInput } from '@/lib/knowledge-base/types'

/**
 * GET /api/admin/support/kb - List KB articles with filtering and pagination
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const url = new URL(request.url)
  const filters: ArticleFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))),
    offset: 0,
    search: url.searchParams.get('search') || '',
    categoryId: url.searchParams.get('categoryId') || '',
    isPublished: url.searchParams.get('isPublished') === 'true' ? true : url.searchParams.get('isPublished') === 'false' ? false : undefined,
    isInternal: url.searchParams.get('isInternal') === 'true' ? true : url.searchParams.get('isInternal') === 'false' ? false : undefined,
    sort: url.searchParams.get('sort') || 'created_at',
    dir: url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc',
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await withTenant(tenantSlug, () => getArticles(filters))

  return NextResponse.json({
    articles: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / filters.limit),
    },
  })
}

/**
 * POST /api/admin/support/kb - Create a new KB article
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: CreateArticleInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.slug || !body.title || !body.content) {
    return NextResponse.json(
      { error: 'Missing required fields: slug, title, content' },
      { status: 400 },
    )
  }

  // Validate slug format
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase alphanumeric with hyphens (e.g., "getting-started")' },
      { status: 400 },
    )
  }

  // Set author to current user
  const articleData: CreateArticleInput = {
    ...body,
    authorId: userId,
  }

  try {
    const article = await withTenant(tenantSlug, () => createArticle(articleData))
    return NextResponse.json({ article }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'An article with this slug already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}
