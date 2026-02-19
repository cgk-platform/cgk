export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { withTenant } from '@cgk-platform/db'

import { getArticleById, updateArticle, deleteArticle } from '@/lib/knowledge-base/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  try {
    const article = await withTenant(tenantSlug, () => getArticleById(id))
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json({ article })
  } catch (err) {
    console.error('[kb/articles/:id] GET error:', err)
    return NextResponse.json({ error: 'Failed to load article' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

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

  try {
    const article = await withTenant(tenantSlug, () => updateArticle(id, body))
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json({ article })
  } catch (err) {
    console.error('[kb/articles/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  try {
    await withTenant(tenantSlug, () => deleteArticle(id))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[kb/articles/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
