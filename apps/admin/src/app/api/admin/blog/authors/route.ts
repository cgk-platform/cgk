export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAuthors, getAuthorById, createAuthor, updateAuthor, deleteAuthor } from '@/lib/blog/db'
import type { CreateAuthorInput } from '@/lib/blog/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (id) {
    const author = await withTenant(tenantSlug, () => getAuthorById(id))
    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 })
    }
    return NextResponse.json({ author })
  }

  const authors = await withTenant(tenantSlug, () => getAuthors())

  return NextResponse.json({ authors })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateAuthorInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
  }

  const author = await withTenant(tenantSlug, () => createAuthor(body))

  return NextResponse.json({ author }, { status: 201 })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<CreateAuthorInput> & { id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
  }

  const author = await withTenant(tenantSlug, () =>
    updateAuthor(body.id, {
      name: body.name,
      bio: body.bio,
      avatar_url: body.avatar_url,
      email: body.email,
      social_links: body.social_links,
    }),
  )

  if (!author) {
    return NextResponse.json({ error: 'Author not found' }, { status: 404 })
  }

  return NextResponse.json({ author })
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

  const deleted = await withTenant(tenantSlug, () => deleteAuthor(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Author not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
