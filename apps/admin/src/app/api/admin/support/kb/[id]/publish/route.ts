export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { publishArticle, unpublishArticle } from '@/lib/knowledge-base/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/support/kb/[id]/publish - Publish a KB article
 */
export async function POST(_request: Request, { params }: RouteParams) {
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

  const article = await withTenant(tenantSlug, () => publishArticle(id))

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  return NextResponse.json({ article })
}

/**
 * DELETE /api/admin/support/kb/[id]/publish - Unpublish a KB article
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

  const article = await withTenant(tenantSlug, () => unpublishArticle(id))

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  return NextResponse.json({ article })
}
