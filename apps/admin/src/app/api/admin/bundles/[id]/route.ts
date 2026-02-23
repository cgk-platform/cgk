export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { deleteBundle, getBundle, getBundleOrderStats, updateBundle } from '@/lib/bundles/db'
import type { UpdateBundleInput } from '@/lib/bundles/types'

/**
 * GET /api/admin/bundles/:id
 * Get a single bundle with optional stats
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const includeStats = searchParams.get('stats') === 'true'

  try {
    const bundle = await getBundle(tenantSlug, id)
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const stats = includeStats ? await getBundleOrderStats(tenantSlug, id) : undefined

    return NextResponse.json({ bundle, stats })
  } catch (error) {
    console.error('Error fetching bundle:', error)
    return NextResponse.json({ error: 'Failed to fetch bundle' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/bundles/:id
 * Update a bundle configuration
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  let body: UpdateBundleInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const bundle = await updateBundle(tenantSlug, id, body)
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ bundle })
  } catch (error) {
    console.error('Error updating bundle:', error)
    return NextResponse.json({ error: 'Failed to update bundle' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/bundles/:id
 * Delete a bundle configuration
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  try {
    const deleted = await deleteBundle(tenantSlug, id)
    if (!deleted) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bundle:', error)
    return NextResponse.json({ error: 'Failed to delete bundle' }, { status: 500 })
  }
}
