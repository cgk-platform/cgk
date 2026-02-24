export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { authenticateBundleRequest } from '@/lib/bundles/api-auth'
import { createBundle, getBundles } from '@/lib/bundles/db'
import type { CreateBundleInput } from '@/lib/bundles/types'
import { validateCreateBundle } from '@/lib/bundles/validation'

/**
 * GET /api/admin/bundles
 * List bundle configurations
 */
export async function GET(request: Request) {
  const auth = await authenticateBundleRequest(request, 'products.view')
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 500))
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
  const statusParam = searchParams.get('status')
  const validStatuses = ['draft', 'active', 'archived']
  if (statusParam && !validStatuses.includes(statusParam)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }
  const status = statusParam || undefined

  try {
    const result = await getBundles(auth.tenantSlug, { status, limit, offset })

    return NextResponse.json({
      bundles: result.bundles,
      totalCount: result.totalCount,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching bundles:', error)
    return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 })
  }
}

/**
 * POST /api/admin/bundles
 * Create a new bundle configuration
 */
export async function POST(request: Request) {
  const auth = await authenticateBundleRequest(request, 'products.sync')
  if (!auth.ok) return auth.response

  let body: CreateBundleInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validationErrors = validateCreateBundle(body)
  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 422 })
  }

  try {
    const bundle = await createBundle(auth.tenantSlug, body, auth.userId ?? undefined)
    return NextResponse.json({ bundle }, { status: 201 })
  } catch (error) {
    console.error('Error creating bundle:', error)
    return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 })
  }
}
