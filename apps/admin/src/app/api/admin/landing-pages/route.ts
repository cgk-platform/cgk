export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPages, createPage } from '@/lib/landing-pages/db'
import type { PageFilters, CreatePageInput } from '@/lib/landing-pages/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const filters: PageFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))),
    offset: 0,
    search: url.searchParams.get('search') || '',
    status: url.searchParams.get('status') || '',
    sort: url.searchParams.get('sort') || 'updated_at',
    dir: url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc',
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await withTenant(tenantSlug, () => getPages(filters))

  return NextResponse.json({
    pages: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / filters.limit),
    },
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreatePageInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.slug || !body.title || !body.status) {
    return NextResponse.json(
      { error: 'Missing required fields: slug, title, status' },
      { status: 400 },
    )
  }

  const validStatuses = ['draft', 'published', 'scheduled', 'archived']
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 },
    )
  }

  const page = await withTenant(tenantSlug, () => createPage(body))

  return NextResponse.json({ page }, { status: 201 })
}
