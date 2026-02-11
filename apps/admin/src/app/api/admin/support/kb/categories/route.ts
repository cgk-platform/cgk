export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCategories, createCategory, reorderCategories } from '@/lib/knowledge-base/db'
import type { CreateCategoryInput } from '@/lib/knowledge-base/types'

/**
 * GET /api/admin/support/kb/categories - List all KB categories
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const categories = await withTenant(tenantSlug, () => getCategories())

  return NextResponse.json({ categories })
}

/**
 * POST /api/admin/support/kb/categories - Create a new category
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

  let body: CreateCategoryInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.slug || !body.name) {
    return NextResponse.json(
      { error: 'Missing required fields: slug, name' },
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

  try {
    const category = await withTenant(tenantSlug, () => createCategory(body))
    return NextResponse.json({ category }, { status: 201 })
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
 * PATCH /api/admin/support/kb/categories - Reorder categories
 */
export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: { categoryIds: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.categoryIds)) {
    return NextResponse.json(
      { error: 'categoryIds must be an array' },
      { status: 400 },
    )
  }

  await withTenant(tenantSlug, () => reorderCategories(body.categoryIds))

  return NextResponse.json({ success: true })
}
