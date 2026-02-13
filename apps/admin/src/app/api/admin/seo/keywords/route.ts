export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getKeywordsWithTrends,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  exportKeywordsToCSV,
} from '@/lib/seo/keyword-tracker'
import type { KeywordFilters, CreateKeywordInput, UpdateKeywordInput } from '@/lib/seo/types'

function parseFilters(searchParams: URLSearchParams): KeywordFilters {
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset,
    search: searchParams.get('search') || '',
    priority: searchParams.get('priority') || '',
    sort: searchParams.get('sort') || 'created_at',
    dir: (searchParams.get('dir') || 'desc') as 'asc' | 'desc',
  }
}

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)

  // Check if export is requested
  if (searchParams.get('export') === 'csv') {
    const csv = await withTenant(tenantSlug, () => exportKeywordsToCSV())
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="keywords.csv"',
      },
    })
  }

  const filters = parseFilters(searchParams)
  const { rows, totalCount } = await withTenant(tenantSlug, () =>
    getKeywordsWithTrends(filters)
  )

  return NextResponse.json({
    keywords: rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount,
      totalPages: Math.ceil(totalCount / filters.limit),
    },
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateKeywordInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.keyword?.trim()) {
    return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
  }

  try {
    const keyword = await withTenant(tenantSlug, () => createKeyword(body))
    return NextResponse.json({ keyword }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create keyword'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateKeywordInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Keyword ID is required' }, { status: 400 })
  }

  const keyword = await withTenant(tenantSlug, () => updateKeyword(body))

  if (!keyword) {
    return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
  }

  return NextResponse.json({ keyword })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Keyword ID is required' }, { status: 400 })
  }

  const deleted = await withTenant(tenantSlug, () => deleteKeyword(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
