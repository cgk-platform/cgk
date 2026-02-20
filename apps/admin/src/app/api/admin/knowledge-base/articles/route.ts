export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { withTenant } from '@cgk-platform/db'

import { getArticles, createArticle, rowToArticleWithCategory } from '@/lib/knowledge-base/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '25', 10)
  const search = url.searchParams.get('search') || ''
  const categoryId = url.searchParams.get('category') || ''
  const statusParam = url.searchParams.get('status')
  const isPublished = statusParam === 'published' ? true : statusParam === 'draft' ? false : undefined

  try {
    const result = await withTenant(tenantSlug, () =>
      getArticles({
        page,
        limit,
        offset: (page - 1) * limit,
        search,
        categoryId,
        isPublished,
        sort: 'updated_at',
        dir: 'desc',
      })
    )
    return NextResponse.json({ articles: result.rows.map(rowToArticleWithCategory), total: result.totalCount })
  } catch (err) {
    console.error('[kb/articles] GET error:', err)
    return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    title?: string
    content?: string
    excerpt?: string | null
    categoryId?: string | null
    tags?: string[]
    isPublished?: boolean
    isInternal?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  try {
    const article = await withTenant(tenantSlug, () =>
      createArticle({
        title: body.title!,
        content: body.content || '',
        excerpt: body.excerpt || undefined,
        categoryId: body.categoryId || undefined,
        tags: body.tags || [],
        isPublished: body.isPublished ?? false,
        isInternal: body.isInternal ?? false,
        slug: body.title!
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      })
    )
    return NextResponse.json({ article }, { status: 201 })
  } catch (err) {
    console.error('[kb/articles] POST error:', err)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}
