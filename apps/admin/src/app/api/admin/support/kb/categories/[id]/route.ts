export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCategoryById, updateCategory, deleteCategory } from '@/lib/knowledge-base/db'
import type { UpdateCategoryInput } from '@/lib/knowledge-base/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/support/kb/categories/[id] - Get a single category
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

  const category = await withTenant(tenantSlug, () => getCategoryById(id))

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ category })
}

/**
 * PATCH /api/admin/support/kb/categories/[id] - Update a category
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

  let body: UpdateCategoryInput
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
    const category = await withTenant(tenantSlug, () => updateCategory(id, body))

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}

/**
 * DELETE /api/admin/support/kb/categories/[id] - Delete a category
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

  const deleted = await withTenant(tenantSlug, () => deleteCategory(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
