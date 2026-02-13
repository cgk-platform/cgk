export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  restoreDocumentVersion,
} from '@/lib/brand-context/db'
import type { DocumentFilters, CreateDocumentInput, UpdateDocumentInput } from '@/lib/brand-context/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const versions = url.searchParams.get('versions') === 'true'

  // Get single document with optional version history
  if (id) {
    const document = await withTenant(tenantSlug, () => getDocumentById(id))
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (versions) {
      const versionHistory = await withTenant(tenantSlug, () => getDocumentVersions(id))
      return NextResponse.json({ document, versions: versionHistory })
    }

    return NextResponse.json({ document })
  }

  // List documents
  const filters: DocumentFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))),
    offset: 0,
    search: url.searchParams.get('search') || '',
    category: url.searchParams.get('category') || '',
    sort: url.searchParams.get('sort') || 'updated_at',
    dir: url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc',
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await withTenant(tenantSlug, () => getDocuments(filters))

  return NextResponse.json({
    documents: result.rows,
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
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateDocumentInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.slug || !body.title || !body.content || !body.category) {
    return NextResponse.json(
      { error: 'Missing required fields: slug, title, content, category' },
      { status: 400 },
    )
  }

  const validCategories = ['brand_voice', 'product_info', 'faq', 'policies', 'guidelines', 'templates']
  if (!validCategories.includes(body.category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
      { status: 400 },
    )
  }

  const document = await withTenant(tenantSlug, () =>
    createDocument(body, userId || undefined),
  )

  return NextResponse.json({ document }, { status: 201 })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const restoreVersion = url.searchParams.get('restore_version')

  let body: UpdateDocumentInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
  }

  // Restore a specific version
  if (restoreVersion) {
    const version = parseInt(restoreVersion, 10)
    if (isNaN(version)) {
      return NextResponse.json({ error: 'restore_version must be a number' }, { status: 400 })
    }

    const document = await withTenant(tenantSlug, () =>
      restoreDocumentVersion(body.id, version, userId || undefined),
    )

    if (!document) {
      return NextResponse.json({ error: 'Document or version not found' }, { status: 404 })
    }

    return NextResponse.json({ document })
  }

  if (body.category) {
    const validCategories = ['brand_voice', 'product_info', 'faq', 'policies', 'guidelines', 'templates']
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 },
      )
    }
  }

  const document = await withTenant(tenantSlug, () =>
    updateDocument(body, userId || undefined),
  )

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json({ document })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing required query param: id' }, { status: 400 })
  }

  const deleted = await withTenant(tenantSlug, () => deleteDocument(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
