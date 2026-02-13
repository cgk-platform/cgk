export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getArticleById, updateArticle, deleteArticle } from '@/lib/knowledge-base/db'
import type { UpdateArticleInput } from '@/lib/knowledge-base/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/support/kb/[id] - Get a single KB article
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  const article = await withTenant(tenantSlug, () => getArticleById(id))

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  return NextResponse.json({ article })
}

/**
 * PATCH /api/admin/support/kb/[id] - Update a KB article
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  let body: UpdateArticleInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate slug format if provided
  if (body.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase alphanumeric with hyphens (e.g., "getting-started")' },
      { status: 400 },
    )
  }

  try {
    const article = await withTenant(tenantSlug, () => updateArticle(id, body))

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json({ article })
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

/**
 * DELETE /api/admin/support/kb/[id] - Delete a KB article
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  const deleted = await withTenant(tenantSlug, () => deleteArticle(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
