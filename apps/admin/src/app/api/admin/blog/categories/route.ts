export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '@/lib/blog/db'
import type { CreateCategoryInput } from '@/lib/blog/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (id) {
    const category = await withTenant(tenantSlug, () => getCategoryById(id))
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ category })
  }

  const categories = await withTenant(tenantSlug, () => getCategories())

  return NextResponse.json({ categories })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateCategoryInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.slug || !body.name) {
    return NextResponse.json(
      { error: 'Missing required fields: slug, name' },
      { status: 400 },
    )
  }

  const category = await withTenant(tenantSlug, () => createCategory(body))

  return NextResponse.json({ category }, { status: 201 })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<CreateCategoryInput> & { id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
  }

  const category = await withTenant(tenantSlug, () =>
    updateCategory(body.id, {
      slug: body.slug,
      name: body.name,
      description: body.description,
      parent_id: body.parent_id,
    }),
  )

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ category })
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

  const deleted = await withTenant(tenantSlug, () => deleteCategory(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
