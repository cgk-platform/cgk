export const dynamic = 'force-dynamic'

import { checkPermissionOrRespond, requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { deleteBundle, getBundle, getBundleOrderStats, updateBundle } from '@/lib/bundles/db'
import type { UpdateBundleInput } from '@/lib/bundles/types'
import { validateUpdateBundle } from '@/lib/bundles/validation'

/**
 * GET /api/admin/bundles/:id
 * Get a single bundle with optional stats
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id')
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const denied = await checkPermissionOrRespond(auth.userId, tenantId, 'products.view')
  if (denied) return denied

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
  const tenantId = headerList.get('x-tenant-id')
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const denied = await checkPermissionOrRespond(auth.userId, tenantId, 'products.sync')
  if (denied) return denied

  const { id } = await params

  let body: UpdateBundleInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validationErrors = validateUpdateBundle(body)
  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 422 })
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
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id')
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const denied = await checkPermissionOrRespond(auth.userId, tenantId, 'products.sync')
  if (denied) return denied

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
