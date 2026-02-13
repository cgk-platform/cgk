export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getRedirects,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  exportRedirectsToCSV,
  parseRedirectCSV,
  importRedirectsFromCSV,
  getRedirectStats,
  findRedirectChains,
} from '@/lib/seo/redirects'
import type { RedirectFilters, CreateRedirectInput, UpdateRedirectInput } from '@/lib/seo/types'

function parseFilters(searchParams: URLSearchParams): RedirectFilters {
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset,
    search: searchParams.get('search') || '',
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

  // Export to CSV
  if (searchParams.get('export') === 'csv') {
    const csv = await withTenant(tenantSlug, () => exportRedirectsToCSV())
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="redirects.csv"',
      },
    })
  }

  // Get stats
  if (searchParams.get('view') === 'stats') {
    const stats = await withTenant(tenantSlug, () => getRedirectStats())
    return NextResponse.json({ stats })
  }

  // Find redirect chains
  if (searchParams.get('view') === 'chains') {
    const chains = await withTenant(tenantSlug, () => findRedirectChains())
    return NextResponse.json({ chains })
  }

  const filters = parseFilters(searchParams)
  const { rows, totalCount } = await withTenant(tenantSlug, () => getRedirects(filters))

  return NextResponse.json({
    redirects: rows,
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

  const contentType = request.headers.get('content-type') || ''

  // Handle CSV import
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    const csvContent = await request.text()
    const rows = parseRedirectCSV(csvContent)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 })
    }

    const result = await withTenant(tenantSlug, () => importRedirectsFromCSV(rows))

    return NextResponse.json({
      success: true,
      imported: result.imported,
      errors: result.errors,
    })
  }

  // Handle single redirect creation
  let body: CreateRedirectInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.source?.trim() || !body.destination?.trim()) {
    return NextResponse.json(
      { error: 'Source and destination are required' },
      { status: 400 }
    )
  }

  try {
    const redirect = await withTenant(tenantSlug, () => createRedirect(body))
    return NextResponse.json({ redirect }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create redirect'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateRedirectInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Redirect ID is required' }, { status: 400 })
  }

  try {
    const redirect = await withTenant(tenantSlug, () => updateRedirect(body))

    if (!redirect) {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 })
    }

    return NextResponse.json({ redirect })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update redirect'
    return NextResponse.json({ error: message }, { status: 400 })
  }
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
    return NextResponse.json({ error: 'Redirect ID is required' }, { status: 400 })
  }

  const deleted = await withTenant(tenantSlug, () => deleteRedirect(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Redirect not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
