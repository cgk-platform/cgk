export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPageById, updatePageBlocks } from '@/lib/landing-pages/db'
import type { Block } from '@/lib/landing-pages/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const page = await withTenant(tenantSlug, () => getPageById(id))

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  return NextResponse.json({ blocks: page.blocks })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { blocks: Block[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.blocks)) {
    return NextResponse.json({ error: 'blocks must be an array' }, { status: 400 })
  }

  // Validate block structure
  for (const block of body.blocks) {
    if (!block.id || !block.type || typeof block.order !== 'number') {
      return NextResponse.json(
        { error: 'Each block must have id, type, and order' },
        { status: 400 },
      )
    }
    if (block.config && typeof block.config !== 'object') {
      return NextResponse.json(
        { error: 'Block config must be an object' },
        { status: 400 },
      )
    }
  }

  const page = await withTenant(tenantSlug, () => updatePageBlocks(id, body.blocks))

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  return NextResponse.json({ blocks: page.blocks })
}
