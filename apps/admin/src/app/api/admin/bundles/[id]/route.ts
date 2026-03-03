export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { authenticateBundleRequest } from '@/lib/bundles/api-auth'
import { deleteBundle, getBundle, getBundleOrderStats, updateBundle } from '@/lib/bundles/db'
import type { UpdateBundleInput } from '@/lib/bundles/types'
import { validateUpdateBundle } from '@/lib/bundles/validation'
import { logger } from '@cgk-platform/logging'

/**
 * GET /api/admin/bundles/:id
 * Get a single bundle with optional stats
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateBundleRequest(request, 'products.view')
  if (!auth.ok) return auth.response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const includeStats = searchParams.get('stats') === 'true'

  try {
    const bundle = await getBundle(auth.tenantSlug, id)
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const stats = includeStats ? await getBundleOrderStats(auth.tenantSlug, id) : undefined

    return NextResponse.json({ bundle, stats })
  } catch (error) {
    logger.error('Error fetching bundle:', error)
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
  const auth = await authenticateBundleRequest(request, 'products.sync')
  if (!auth.ok) return auth.response

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
    const bundle = await updateBundle(auth.tenantSlug, id, body)
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ bundle })
  } catch (error) {
    logger.error('Error updating bundle:', error)
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
  const auth = await authenticateBundleRequest(request, 'products.sync')
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const deleted = await deleteBundle(auth.tenantSlug, id)
    if (!deleted) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting bundle:', error)
    return NextResponse.json({ error: 'Failed to delete bundle' }, { status: 500 })
  }
}
